/**
 * Mint Job Processor — internal, NOT an HTTP endpoint.
 *
 * Processes a single mint job through sequential steps:
 *   queued → validating → reserving_number → uploading_ipfs →
 *   calling_mintgarden → (awaiting_payment for paid) → finalizing → completed
 *
 * Called via context.waitUntil() from submit.ts, or inline from cleanup/cron.
 * Each step updates mint_jobs.step so the frontend can poll progress.
 */

import { callMintGardenMint } from './request';
import { logMintStep, markRefundNeeded } from './auditHelper';
import { getNextMintNumber } from './mintNumberHelper';
import { uploadToIPFS, type IPFSUploadResult } from './uploadToIPFS';
import { consolidateTraits } from './traitResolver';
import { MintError } from './errors';
import { getOrCreateSplitterAddress } from './splitxch';
import {
  TOTAL_SUPPLY,
  SURCHARGE_CATEGORIES,
  SURCHARGE_EXEMPT_TRAITS,
  DECAY_HALF_LIFE_DAYS,
} from './_shared';
import { calculateCombatIdentity } from '../../../src/lib/combat/identity-calculator';
import { assignMoves } from '../../../src/lib/combat/move-assigner';
import { getMoveById } from '../../../src/lib/combat/data/moves';
import { deriveCombatTraitIdFromPath } from '../../../src/lib/combat/selectionTraitId';
import { lookupAICombat, type AICombatMapping } from '../../../src/lib/combat/data/ai-combat-map';

// Re-export MintError for backwards compatibility (callers may import from process.ts)
export { MintError };

/** Build CHIP-0007 combat attributes for NFT metadata. */
export function buildCombatAttributes(combat: {
  type: string; nature: string; ability: string; moves: string[];
}): Array<{ trait_type: string; value: string }> {
  // Look up display names for moves (fall back to ID if not found)
  const moveNames = combat.moves.map(moveId => {
    const move = getMoveById(moveId);
    return move?.name ?? moveId;
  });
  return [
    { trait_type: 'Combat Type', value: combat.type },
    { trait_type: 'Nature', value: combat.nature },
    { trait_type: 'Ability', value: combat.ability },
    { trait_type: 'Move 1', value: moveNames[0] },
    { trait_type: 'Move 2', value: moveNames[1] },
    { trait_type: 'Move 3', value: moveNames[2] },
    { trait_type: 'Move 4', value: moveNames[3] },
  ];
}

/** Build parameterized INSERT for combat_fighters table. */
export function buildFighterInsertSQL(fighter: {
  nft_id: string; edition_number: number; owner_did: string; owner_address: string;
  combat_type: string; nature: string; ability: string; moves: string[];
}): { query: string; bindings: unknown[] } {
  return {
    query: `INSERT INTO combat_fighters (nft_id, edition_number, owner_did, owner_address, combat_type, nature, ability, move_1, move_2, move_3, move_4)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    bindings: [
      fighter.nft_id, fighter.edition_number, fighter.owner_did, fighter.owner_address,
      fighter.combat_type, fighter.nature, fighter.ability,
      fighter.moves[0], fighter.moves[1], fighter.moves[2], fighter.moves[3],
    ],
  };
}

/** Max concurrent MintGarden API calls. Soft cap — brief overshoot is fine. */
const MAX_MINTGARDEN_CONCURRENT = 3;

// ─── Types ───

export interface ProcessEnv {
  DB: D1Database;
  MINT_JOBS_KV: KVNamespace;
  PINATA_JWT?: string;
  PINATA_GATEWAY?: string;
  PHASE2_COLLECTION_UUID?: string;
  PHASE2_PROFILE_ID?: string;
  PHASE2_ROYALTY_ADDRESS?: string;
  PHASE2_ROYALTY_PCT?: string;
  MINTGARDEN_API_KEY?: string;
  TREASURY_ADDRESS?: string;
  /** XCH address that receives paid-mint payments (MintGarden target_address for paid offers). */
  CREATOR_PAYOUT_ADDRESS?: string;
}

interface MintJobRow {
  id: number;
  wallet_address: string;
  idempotency_key: string | null;
  layers_json: string;
  colors_json: string;
  image_base64_hash: string;
  mint_type: 'paid' | 'free';
  credit_cost: number | null;
  xch_price_mojos: number | null;
  surcharge_xch: number | null;
  highest_surcharge_trait: string | null;
  step: string;
  mint_number: number | null;
  ipfs_image_uris: string | null;
  ipfs_metadata_uris: string | null;
  image_hash: string | null;
  metadata_hash: string | null;
  mintgarden_launcher_id: string | null;
  offer_file: string | null;
  error_message: string | null;
  custom_name: string | null;
  error_code: string | null;
  retry_count: number;
  max_retries: number;
  phase2_mint_id: number | null;
  credit_spend_id: number | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  wallet_lock: string | null;
  not_before: string | null;
  combat_moves_json: string | null;
  ai_metadata_json: string | null;
}

// ─── Step Updater ───

export async function updateJobStep(db: D1Database, jobId: number, step: string): Promise<void> {
  await db.prepare(
    `UPDATE mint_jobs SET step = ?, updated_at = datetime('now'),
     started_at = COALESCE(started_at, datetime('now'))
     WHERE id = ?`
  ).bind(step, jobId).run();
}

// ─── AI Combat Overrides ───

function buildAICombatOverrides(
  aiMetadataJson: string | null
): Record<string, AICombatMapping> | undefined {
  if (!aiMetadataJson) return undefined;
  try {
    const aiMeta = JSON.parse(aiMetadataJson) as {
      aiEnhanced?: boolean;
      aiAttributes?: Array<{ category: string; label?: string; familyLabel?: string }>;
    };
    if (!aiMeta.aiEnhanced || !Array.isArray(aiMeta.aiAttributes)) return undefined;

    const categoryToLayer: Record<string, string> = {
      clothes: 'Clothes',
      head: 'Head',
      background: 'Background',
    };

    const overrides: Record<string, AICombatMapping> = {};
    for (const attr of aiMeta.aiAttributes) {
      const layer = categoryToLayer[attr.category];
      if (!layer || !attr.label) continue;
      const mapping = lookupAICombat(attr.familyLabel ?? '', attr.label);
      if (mapping) overrides[layer] = mapping;
    }
    return Object.keys(overrides).length > 0 ? overrides : undefined;
  } catch {
    return undefined;
  }
}

// ─── Main Processor ───

/**
 * Process a single mint job through all steps.
 * imageBase64 is passed from submit (hot path) or retrieved from KV (retry path).
 */
export async function processJob(
  env: ProcessEnv,
  jobId: number,
  imageBase64: string
): Promise<void> {
  // Load job — process if queued, validating, or reserving_number (submit may have run through step 2 in-request)
  const job = await env.DB.prepare(
    'SELECT * FROM mint_jobs WHERE id = ? AND step IN (\'queued\', \'validating\', \'reserving_number\')'
  ).bind(jobId).first<MintJobRow>();

  if (!job) return; // Already picked up or doesn't exist

  // Outer safety net: catch ANY unhandled error and mark job as failed.
  // Without this, errors that escape the inner try/catch (e.g. SplitXCH
  // AbortError, unexpected DB errors) leave the job in limbo state forever
  // until the cleanup cron (5 min interval) picks it up.
  try {

    try {
      // ──── STEP 1: Validate ────
      if (job.step === 'queued') {
        await updateJobStep(env.DB, jobId, 'validating');
      }

      const layers = JSON.parse(job.layers_json) as Record<string, string>;
      const colors = JSON.parse(job.colors_json) as Record<string, string>;
      const consolidated = consolidateTraits(layers, colors);

      // ──── STEP 2: Reserve Mint Number (submit may have done this already) ────
      let mintNumber: number;
      if (job.mint_number != null) {
        mintNumber = job.mint_number;
      } else {
        await updateJobStep(env.DB, jobId, 'reserving_number');
        mintNumber = await getNextMintNumber(env.DB, TOTAL_SUPPLY);
        await env.DB.prepare(
          'UPDATE mint_jobs SET mint_number = ?, updated_at = datetime(\'now\') WHERE id = ?'
        ).bind(mintNumber, jobId).run();
      }

      // ──── STEP 3: Upload to IPFS (skip if already uploaded from previous attempt) ────
      const collectionUuid = env.PHASE2_COLLECTION_UUID || '';
      const TRAIT_ORDER = ['Background', 'Base', 'Clothes', 'Face', 'Face Wear', 'Head', 'Mouth'];
      const attributes = [...consolidated.values()]
        .map(({ traitType, displayName }) => ({ trait_type: traitType, value: displayName }))
        .sort((a, b) => {
          const ai = TRAIT_ORDER.indexOf(a.trait_type);
          const bi = TRAIT_ORDER.indexOf(b.trait_type);
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });

      // ── Combat identity → IPFS attributes ──
      // Calculate here (before metadata build + IPFS upload) so combat attributes
      // are baked into the on-chain metadata. Also calculated in finalizeJob() for
      // the combat_fighters DB record — both use the same deterministic function.
      const combatTraitEntries: { traitId: string; layer: string }[] = [];
      const combatColorMap: Record<string, string> = {};

      for (const [layer, path] of Object.entries(layers)) {
        if (!path || typeof path !== 'string') continue;
        const traitId = deriveCombatTraitIdFromPath(layer, path);
        if (!traitId) continue;
        combatTraitEntries.push({ traitId, layer });
        const hex = colors[layer];
        if (hex) combatColorMap[traitId] = hex;
      }

      const aiCombatOverrides = buildAICombatOverrides(job.ai_metadata_json);
      const combatIdentity = calculateCombatIdentity({
        traits: combatTraitEntries,
        colors: combatColorMap,
        details: {},
        aiEnhancements: aiCombatOverrides,
      });

      const combatMoveAssignment = assignMoves(combatIdentity);

      attributes.push(...buildCombatAttributes({
        type: combatIdentity.type,
        nature: combatIdentity.nature,
        ability: combatIdentity.ability,
        moves: combatMoveAssignment.valid ? combatMoveAssignment.moves : ['', '', '', ''],
      }));

      // ── AI Enhancement metadata (replaces trait values + adds combat overrides) ──
      if (job.ai_metadata_json) {
        try {
          const aiMeta = JSON.parse(job.ai_metadata_json) as {
            aiEnhanced?: boolean;
            aiAttributes?: Array<{ category: string; label?: string; prompt?: string; familyLabel?: string }>;
          };
          if (aiMeta.aiEnhanced && Array.isArray(aiMeta.aiAttributes) && aiMeta.aiAttributes.length > 0) {
            const categoryToTraitType: Record<string, string> = {
              clothes: 'Clothes',
              head: 'Head',
              background: 'Background',
              facewear: 'Face Wear',
            };

            for (const attr of aiMeta.aiAttributes) {
              if (!attr.category) continue;
              const traitType = categoryToTraitType[attr.category];
              const displayValue = attr.label || attr.prompt;
              if (!traitType || !displayValue) continue;

              const existing = attributes.find((a) => a.trait_type === traitType);
              if (existing) {
                existing.value = displayValue;
              } else {
                attributes.push({ trait_type: traitType, value: displayValue });
              }
            }

            // AI trait overrides applied above — no "AI Enhanced" / "AI Edits Count" meta-attributes
            // (data still tracked in D1 ai_enhancements table if ever needed)
          }
        } catch {
          console.warn(`[MintProcessor] Job ${jobId} has invalid ai_metadata_json, skipping AI attributes`);
        }
      }

      const customName = job.custom_name;
      const fullName = customName
        ? `Your Wojak #${mintNumber}: ${customName}`
        : `Your Wojak #${mintNumber}`;

      const metadata = {
        format: 'CHIP-0007',
        name: fullName,
        description: 'Your Wojak puts collectors in control. Same handcrafted layers and lore from the Wojak Farmers Plot collection \u2014 but you choose every layer, every color, every detail using the Wojak Generator on Wojak.ink \uD83C\uDF4A',
        sensitive_content: false,
        collection: {
          name: 'Your Wojak',
          id: collectionUuid,
          attributes: [
            { type: 'description', value: 'Your Wojak puts collectors in control. Choose every layer, every color, every detail.' },
            { type: 'website', value: 'https://wojak.ink' },
            { type: 'twitter', value: 'https://x.com/MoJuiceX' },
          ],
        },
        edition: mintNumber,
        date: Date.now(),
        compiler: 'Wojak.ink Generator',
        attributes,
        edition_number: mintNumber,
        edition_total: TOTAL_SUPPLY,
      };

      let uploadResult: IPFSUploadResult;

      if (job.ipfs_image_uris && job.ipfs_metadata_uris && job.image_hash && job.metadata_hash) {
        // Retry path: IPFS data already exists from a previous attempt
        uploadResult = {
          dataUris: JSON.parse(job.ipfs_image_uris) as string[],
          metadataUris: JSON.parse(job.ipfs_metadata_uris) as string[],
          dataHash: job.image_hash,
          metadataHash: job.metadata_hash,
        };
        console.warn(`[MintProcessor] Job ${jobId} reusing existing IPFS data from previous attempt`);
      } else {
        await updateJobStep(env.DB, jobId, 'uploading_ipfs');

        const jwt = env.PINATA_JWT;
        if (!jwt) {
          throw new MintError('CONFIG_ERROR', 'IPFS upload not configured (missing PINATA_JWT)');
        }

        try {
          uploadResult = await uploadToIPFS(imageBase64, metadata as Record<string, unknown>, jwt, env.PINATA_GATEWAY);
        } catch (err) {
          throw new MintError('IPFS_UPLOAD_FAILED', err instanceof Error ? err.message : 'IPFS upload failed');
        }

        await env.DB.prepare(
          `UPDATE mint_jobs SET
          ipfs_image_uris = ?, ipfs_metadata_uris = ?,
          image_hash = ?, metadata_hash = ?, updated_at = datetime('now')
         WHERE id = ?`
        ).bind(
          JSON.stringify(uploadResult.dataUris),
          JSON.stringify(uploadResult.metadataUris),
          uploadResult.dataHash,
          uploadResult.metadataHash,
          jobId
        ).run();
      }

      // Keep image in KV until job completes — needed for retry if MintGarden fails.
      // KV entry will be cleaned up after finalization (see finalizeJob below).

      // ──── CONCURRENCY GATE ────
      const concurrencyCount = await env.DB.prepare(
        "SELECT COUNT(*) AS count FROM mint_jobs WHERE step = 'calling_mintgarden'"
      ).first<{ count: number }>();

      if ((concurrencyCount?.count ?? 0) >= MAX_MINTGARDEN_CONCURRENT) {
        await updateJobStep(env.DB, jobId, 'mint_queued');
        console.warn(`[MintProcessor] Job ${jobId} queued — ${concurrencyCount!.count} MintGarden calls in flight`);
        return;
      }

      // ──── STEP 4: Call MintGarden ────
      await updateJobStep(env.DB, jobId, 'calling_mintgarden');

      const totalPriceXch = job.mint_type === 'paid' && job.xch_price_mojos
        ? job.xch_price_mojos / 1_000_000_000_000
        : undefined;

      let royaltyAddress: string | undefined;
      if (env.TREASURY_ADDRESS) {
        try {
          royaltyAddress = await Promise.race([
            getOrCreateSplitterAddress(
              { DB: env.DB, TREASURY_ADDRESS: env.TREASURY_ADDRESS },
              job.wallet_address,
              1, // wave 1
            ),
            new Promise<string>((_, reject) =>
              setTimeout(() => reject(new Error('SplitXCH lookup timed out (30s)')), 30_000)
            ),
          ]);
          if (!royaltyAddress) {
            console.error('[SplitXCH] CRITICAL: getOrCreateSplitterAddress returned empty! Falling back to wallet.');
          } else {
            console.warn(`[SplitXCH] Using splitter address: ${royaltyAddress}`);
          }
        } catch (err) {
          // Non-fatal: fall back to creator's wallet if SplitXCH is unavailable
          console.error('[SplitXCH] CRITICAL: Failed to resolve splitter, using creator wallet:', err);
        }
      } else {
        console.warn('[SplitXCH] TREASURY_ADDRESS not set, skipping splitter resolution');
      }

      const mintResult = await callMintGardenMint({
        walletAddress: job.wallet_address,
        royaltyAddress,
        mintType: job.mint_type,
        ipfsImageUris: uploadResult.dataUris,
        ipfsMetadataUris: uploadResult.metadataUris,
        imageHash: uploadResult.dataHash,
        metadataHash: uploadResult.metadataHash,
        priceXch: totalPriceXch,
        collectionUuid,
        editionNumber: mintNumber,
        editionTotal: TOTAL_SUPPLY,
      }, env);

      if (job.mint_type === 'free') {
        // Free mint: MintGarden returns launcherId directly
        if (!mintResult.launcherId) {
          throw new MintError('MINTGARDEN_FAILED', 'MintGarden did not return a launcher ID.');
        }
        await env.DB.prepare(
          'UPDATE mint_jobs SET mintgarden_launcher_id = ?, updated_at = datetime(\'now\') WHERE id = ?'
        ).bind(mintResult.launcherId, jobId).run();

      } else {
        // Paid mint: MintGarden returns offer file (and NFT ID in offer.offered)
        if (!mintResult.offerFile) {
          throw new MintError('OFFER_CREATION_FAILED', 'MintGarden did not return an offer.');
        }
        // Store offer file + launcher ID (if available from offer.offered).
        // Having the launcher ID early means confirm-payment can verify directly
        // instead of relying on slow auto-detection by edition_number.
        await env.DB.prepare(
          `UPDATE mint_jobs SET offer_file = ?, mintgarden_launcher_id = ?, expires_at = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(
          mintResult.offerFile,
          mintResult.launcherId,  // may be null if not in response
          new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          jobId
        ).run();
      }

      // ──── STEP 5: Await Payment (paid only) ────
      if (job.mint_type === 'paid') {
        await updateJobStep(env.DB, jobId, 'awaiting_payment');
        await chainNextQueuedJob(env);
        return;
      }

      // ──── STEP 6: Finalize (free mints) ────
      await finalizeJob(env, jobId);
      await chainNextQueuedJob(env);

    } catch (error) {
      // Rate-limited by MintGarden — re-queue instead of failing
      if (error instanceof MintError && error.code === 'RATE_LIMITED') {
        const retryAfterMs = error.retryAfterMs ?? 30_000;
        const notBefore = new Date(Date.now() + retryAfterMs).toISOString();
        await env.DB.prepare(
          "UPDATE mint_jobs SET step = 'mint_queued', not_before = ?, error_message = ?, updated_at = datetime('now') WHERE id = ?"
        ).bind(notBefore, error.message, jobId).run();
        console.warn(`[MintProcessor] Job ${jobId} rate-limited, re-queued with not_before=${notBefore}`);
        await chainNextQueuedJob(env);
        return;
      }
      await handleJobFailure(env, jobId, job, error);
    }

    // Outer safety net (matches outer try at top of processJob)
  } catch (outerError) {
    console.error(`[MintProcessor] OUTER CATCH — Job ${jobId} escaped inner error handling:`, outerError);
    try {
      const errMsg = outerError instanceof Error ? outerError.message : String(outerError);
      await env.DB.prepare(
        `UPDATE mint_jobs SET step = 'failed', error_message = ?, error_code = 'INTERNAL_ERROR',
         wallet_lock = NULL, updated_at = datetime('now') WHERE id = ?`
      ).bind(`Unhandled: ${errMsg}`.slice(0, 500), jobId).run();
    } catch (dbErr) {
      console.error(`[MintProcessor] OUTER CATCH — Failed to update job ${jobId} to failed state:`, dbErr);
    }
  }
}

// ─── Finalize ───

/**
 * Finalize a mint job: insert phase2_mints, update trait_usage, release wallet lock.
 * Shared by free mints (called from processJob) and paid mints (called from confirm-payment).
 */
export async function finalizeJob(env: ProcessEnv, jobId: number): Promise<void> {
  await updateJobStep(env.DB, jobId, 'finalizing');

  const job = await env.DB.prepare('SELECT * FROM mint_jobs WHERE id = ?')
    .bind(jobId).first<MintJobRow>();

  if (!job) throw new MintError('JOB_NOT_FOUND', `Job ${jobId} not found during finalization`);

  const layers = JSON.parse(job.layers_json) as Record<string, string>;
  const colors = JSON.parse(job.colors_json) as Record<string, string>;
  const consolidated = consolidateTraits(layers, colors);
  const launcherId = job.mintgarden_launcher_id;
  const ipfsImageUris = job.ipfs_image_uris ? JSON.parse(job.ipfs_image_uris) as string[] : [];
  const ipfsMetadataUris = job.ipfs_metadata_uris ? JSON.parse(job.ipfs_metadata_uris) as string[] : [];

  // Check if already finalized (idempotent — safe to retry)
  const existingMint = await env.DB.prepare(
    'SELECT id FROM phase2_mints WHERE mint_number = ?'
  ).bind(job.mint_number).first<{ id: number }>();

  if (existingMint) {
    // Already finalized — just update job status and release lock
    await env.DB.prepare(
      `UPDATE mint_jobs SET
        step = 'completed', completed_at = datetime('now'),
        phase2_mint_id = ?, wallet_lock = NULL, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(existingMint.id, jobId).run();

    await logMintStep(env.DB, {
      mint_id: existingMint.id,
      step: 'finalize_idempotent_skip',
      status: 'completed',
      data: { mint_number: job.mint_number, job_id: jobId, message: 'Already finalized, skipped duplicate' },
    });
    return;
  }

  // Atomic batch: insert phase2_mints + update trait_usage + update job status
  const batchStmts: D1PreparedStatement[] = [];

  // 1. Insert into phase2_mints (the canonical mint record)
  // ON CONFLICT(mint_number) DO NOTHING for safety — the pre-check above handles
  // the idempotent case, but this prevents crashes if a race condition occurs.
  batchStmts.push(
    env.DB.prepare(
      `INSERT OR IGNORE INTO phase2_mints (
        mint_number, wallet_address, layers_json, colors_json,
        ipfs_image_uri, ipfs_metadata_uri, image_hash, metadata_hash,
        mint_type, total_price_xch, trait_surcharge_xch, highest_surcharge_trait,
        mintgarden_launcher_id, offer_file, status, minted_at,
        payment_verified,
        ipfs_upload_started_at, ipfs_upload_completed_at,
        mintgarden_called_at, mintgarden_completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'minted', datetime('now'),
                ?, datetime('now'), datetime('now'), datetime('now'), datetime('now'))`
    ).bind(
      job.mint_number,
      job.wallet_address,
      job.layers_json,
      job.colors_json,
      ipfsImageUris.length > 0 ? JSON.stringify(ipfsImageUris) : null,
      ipfsMetadataUris.length > 0 ? JSON.stringify(ipfsMetadataUris) : null,
      job.image_hash,
      job.metadata_hash,
      job.mint_type,
      job.mint_type === 'paid' ? job.xch_price_mojos : null,
      job.surcharge_xch,
      job.highest_surcharge_trait,
      launcherId,
      job.offer_file,
      job.mint_type === 'paid' ? 1 : 0 // payment_verified
    )
  );

  // 2. Trait usage upserts
  for (const { traitType, displayName } of consolidated.values()) {
    if (traitType === 'Base') continue;
    if (!displayName) continue;
    const isExempt = SURCHARGE_EXEMPT_TRAITS.has(displayName);

    if (SURCHARGE_CATEGORIES.has(traitType) && !isExempt) {
      batchStmts.push(
        env.DB.prepare(
          `INSERT INTO trait_usage (trait_category, trait_name, usage_count, effective_usage, last_decay_at, updated_at)
           VALUES (?, ?, 1, 1, datetime('now'), datetime('now'))
           ON CONFLICT(trait_category, trait_name) DO UPDATE SET
             usage_count = usage_count + 1,
             effective_usage = effective_usage * exp(
               ln(0.5) * (julianday('now') - julianday(last_decay_at)) / ?
             ) + 1,
             last_decay_at = datetime('now'),
             updated_at = datetime('now')`
        ).bind(traitType, displayName, DECAY_HALF_LIFE_DAYS)
      );
    } else {
      batchStmts.push(
        env.DB.prepare(
          `INSERT INTO trait_usage (trait_category, trait_name, usage_count, updated_at)
           VALUES (?, ?, 1, datetime('now'))
           ON CONFLICT(trait_category, trait_name) DO UPDATE SET
             usage_count = usage_count + 1,
             updated_at = datetime('now')`
        ).bind(traitType, displayName)
      );
    }
  }

  // Insert NFT name into nft_names cache table
  const customName = job.custom_name;
  const fullName = customName
    ? `Your Wojak #${job.mint_number}: ${customName}`
    : `Your Wojak #${job.mint_number}`;
  batchStmts.push(
    env.DB.prepare(
      'INSERT OR REPLACE INTO nft_names (edition_number, custom_name, full_name) VALUES (?, ?, ?)'
    ).bind(job.mint_number, customName, fullName)
  );

  // ALWAYS insert combat fighter record with auto-assigned moves
  // Calculate combat identity from the layers/colors
  const combatTraitEntries: { traitId: string; layer: string }[] = [];
  const combatColorMap: Record<string, string> = {};
  // colors was already parsed above for consolidateTraits

  for (const [layer, path] of Object.entries(layers)) {
    if (!path || typeof path !== 'string') continue;
    const traitId = deriveCombatTraitIdFromPath(layer, path);
    if (!traitId) continue;
    combatTraitEntries.push({ traitId, layer });
    const hex = colors[layer];
    if (hex) combatColorMap[traitId] = hex;
  }

  const aiCombatOverrides = buildAICombatOverrides(job.ai_metadata_json);
  const identity = calculateCombatIdentity({
    traits: combatTraitEntries,
    colors: combatColorMap,
    details: {},
    aiEnhancements: aiCombatOverrides,
  });

  // Auto-assign moves based on combat identity (3 damage + 1 status)
  const moveAssignment = assignMoves(identity);

  if (moveAssignment.valid) {
    // Use launcher_id as nft_id (the on-chain NFT identifier)
    const nftId = launcherId || `pending_${job.mint_number}`;

    const fighterInsert = buildFighterInsertSQL({
      nft_id: nftId,
      edition_number: job.mint_number!,
      owner_did: '', // Will be set when owner claims via DID
      owner_address: job.wallet_address, // Minter's wallet for identity fallback
      combat_type: identity.type,
      nature: identity.nature,
      ability: identity.ability,
      moves: moveAssignment.moves,
    });

    batchStmts.push(
      env.DB.prepare(fighterInsert.query).bind(...fighterInsert.bindings)
    );
  }

  await env.DB.batch(batchStmts);

  // Get the phase2_mint_id for cross-reference
  const mintRow = await env.DB.prepare(
    'SELECT id FROM phase2_mints WHERE mint_number = ? ORDER BY id DESC LIMIT 1'
  ).bind(job.mint_number).first<{ id: number }>();

  // Update credit_spends row to point to the real mint_id (free mints)
  if (job.credit_spend_id && mintRow) {
    await env.DB.prepare(
      'UPDATE credit_spends SET mint_id = ? WHERE id = ?'
    ).bind(mintRow.id, job.credit_spend_id).run();
  }

  // Post-mint supply check: auto-set sold_out flag
  const mintedCount = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM phase2_mints WHERE status = 'minted'"
  ).first<{ count: number }>();
  if ((mintedCount?.count ?? 0) >= TOTAL_SUPPLY) {
    await env.DB.prepare(
      "INSERT OR REPLACE INTO server_state (key, value, updated_at) VALUES ('sold_out', 'true', datetime('now'))"
    ).run();
  }

  // Mark job as completed and release wallet lock
  await env.DB.prepare(
    `UPDATE mint_jobs SET
      step = 'completed', completed_at = datetime('now'),
      phase2_mint_id = ?, wallet_lock = NULL, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(mintRow?.id ?? null, jobId).run();

  // Clean up image from KV (no longer needed after successful finalization)
  try {
    await env.MINT_JOBS_KV.delete(`job-image:${jobId}`);
  } catch {
    // Non-critical — KV cleanup failure is fine
  }

  // Audit log
  await logMintStep(env.DB, {
    mint_id: mintRow?.id ?? 0,
    step: job.mint_type === 'free' ? 'free_mint_completed' : 'paid_mint_confirmed',
    status: 'completed',
    data: { mint_number: job.mint_number, launcher_id: launcherId, job_id: jobId },
  });

  // Award onboarding_minted milestone if player is registered and hasn't received it yet
  try {
    const player = await env.DB.prepare(
      'SELECT did_id, onboarding_minted FROM game_players WHERE wallet_address = ?'
    ).bind(job.wallet_address).first<{ did_id: string; onboarding_minted: number }>();

    if (player && !player.onboarding_minted && job.mint_type !== 'free') {
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE game_players SET onboarding_minted = 1, updated_at = datetime('now') WHERE wallet_address = ? AND onboarding_minted = 0"
        ).bind(job.wallet_address),
        env.DB.prepare(`
          INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_type, event_timestamp)
          VALUES (?, 'onboarding_first_mint', ?, 0, 0, 4200, 100, 'onboarding', 'onboarding', datetime('now'))
        `).bind(job.wallet_address, `onboarding_mint_${job.wallet_address}`),
        env.DB.prepare(`
          INSERT INTO game_activity (did_id, event_type, event_data)
          VALUES (?, 'mint_milestone', ?)
        `).bind(player.did_id, JSON.stringify({ milestone: 'first_mint', credits: 4200 })),
      ]);
    }
  } catch (e) {
    // Non-critical — don't fail the mint if onboarding milestone fails
    console.error('[MintProcessor] Onboarding milestone error:', e);
  }
}

// ─── Failure Handler ───

async function handleJobFailure(
  env: ProcessEnv,
  jobId: number,
  _initialJob: MintJobRow | null,
  error: unknown
): Promise<void> {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const errorCode = error instanceof MintError ? error.code : 'INTERNAL_ERROR';

  // Re-read job from DB for current state (initial variable is stale —
  // fields like mintgarden_launcher_id may have been set during processing).
  // Do NOT fall back to _initialJob — it has stale field values.
  const job = await env.DB.prepare('SELECT * FROM mint_jobs WHERE id = ?')
    .bind(jobId).first<MintJobRow>();

  if (!job) {
    // Job row disappeared — just log and bail
    console.error(`[MintProcessor] Job ${jobId} not found during failure handling`);
    return;
  }

  console.error(`[MintProcessor] Job ${jobId} failed at step ${job.step}:`, errorMsg);

  // Non-retryable error codes — these won't succeed on retry
  const nonRetryable = [
    'SOLD_OUT', 'INSUFFICIENT_CREDITS', 'INVALID_TRAITS', 'SUPPLY_EXHAUSTED', 'CONFIG_ERROR',
    'OFFER_CREATION_FAILED', 'MINTGARDEN_FAILED',
  ];
  // Past-IPFS retries are now safe: image stays in KV until finalization,
  // and processJob skips IPFS upload if URIs already exist on the job.
  const retryable = !nonRetryable.includes(errorCode);

  if (retryable && job.retry_count < job.max_retries) {
    // Increment retry count, reset to queued for retry.
    // Keep mint_number (avoid leaking supply) and keep IPFS URIs if they exist
    // (processJob will skip re-upload on retry if URIs are already set).
    const hasIpfs = job.ipfs_image_uris && job.ipfs_metadata_uris;
    await env.DB.prepare(
      `UPDATE mint_jobs SET step = 'queued', retry_count = retry_count + 1,
       error_message = ?, error_code = ?,
       ${hasIpfs ? '' : 'ipfs_image_uris = NULL, ipfs_metadata_uris = NULL, image_hash = NULL, metadata_hash = NULL,'}
       updated_at = datetime('now')
       WHERE id = ?`
    ).bind(errorMsg, errorCode, jobId).run();
    return;
  }

  // Non-retryable or max retries exceeded
  let finalStep = 'failed';

  // If credits were deducted (free mint), refund them
  if (job.mint_type === 'free' && job.credit_spend_id) {
    await env.DB.prepare(
      'DELETE FROM credit_spends WHERE id = ?'
    ).bind(job.credit_spend_id).run();
    finalStep = 'refunded';
  } else if (job.mint_type === 'free' && !job.credit_spend_id) {
    // credit_spend_id linking may have failed — find orphaned spend by wallet + mint_id=0
    try {
      const orphan = await env.DB.prepare(
        'SELECT id FROM credit_spends WHERE wallet_address = ? AND mint_id = 0 ORDER BY id DESC LIMIT 1'
      ).bind(job.wallet_address).first<{ id: number }>();
      if (orphan) {
        await env.DB.prepare('DELETE FROM credit_spends WHERE id = ?').bind(orphan.id).run();
        finalStep = 'refunded';
      }
    } catch {
      // Cleanup operation 5 will catch this as a fallback
    }
  }

  // If paid mint failed after user already paid, auto-flag refund.
  // IMPORTANT: Check mintgarden_launcher_id (NOT phase2_mint_id) to detect payment.
  // phase2_mint_id is only set at finalization — if failure occurs before that
  // (IPFS upload fail, MintGarden API error), phase2_mint_id is NULL even though
  // the user may have paid. mintgarden_launcher_id proves payment was in play.
  if (job.mint_type === 'paid' && job.mintgarden_launcher_id) {
    try {
      if (job.phase2_mint_id) {
        await markRefundNeeded(
          env.DB,
          job.phase2_mint_id,
          `Automatic: job ${jobId} failed at ${job.step} after payment. Error: ${errorMsg}`
        );
      } else {
        // No phase2_mints row — log refund need via audit (admin manual review)
        await logMintStep(env.DB, {
          mint_id: 0,
          step: 'refund_needed_no_mint_record',
          status: 'failed',
          error: `Job ${jobId} failed after payment but no phase2_mints record exists.`,
          data: { job_id: jobId, launcher_id: job.mintgarden_launcher_id, wallet: job.wallet_address },
        });
      }
    } catch (refundErr) {
      console.error(`[MintProcessor] Failed to flag refund for job ${jobId}:`, refundErr);
    }
  }

  // Release wallet lock and mark as failed/refunded
  await env.DB.prepare(
    `UPDATE mint_jobs SET
      step = ?, error_message = ?, error_code = ?,
      wallet_lock = NULL, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(finalStep, errorMsg, errorCode, jobId).run();

  // Audit log
  await logMintStep(env.DB, {
    mint_id: 0,
    step: `job_${finalStep}`,
    status: 'failed',
    error: errorMsg,
    data: { job_id: jobId, error_code: errorCode, mint_number: job.mint_number },
  });
}

// ─── Chain Processing ───

/**
 * Chain processing: pick up the next mint_queued job and process it.
 * Called after a MintGarden call completes (success or failure).
 * Capped to 1 to stay within waitUntil execution limits.
 */
async function chainNextQueuedJob(env: ProcessEnv): Promise<void> {
  try {
    const next = await env.DB.prepare(
      `SELECT id FROM mint_jobs WHERE step = 'mint_queued'
       AND (not_before IS NULL OR not_before <= datetime('now'))
       ORDER BY created_at ASC LIMIT 1`
    ).first<{ id: number }>();

    if (!next) return;

    const imageBase64 = await env.MINT_JOBS_KV.get(`job-image:${next.id}`);
    if (!imageBase64) {
      await env.DB.prepare(
        "UPDATE mint_jobs SET step = 'failed', error_message = 'Image data expired', error_code = 'IMAGE_EXPIRED', wallet_lock = NULL, updated_at = datetime('now') WHERE id = ?"
      ).bind(next.id).run();
      return;
    }

    // Set step to queued so processJob picks it up (will re-check concurrency gate)
    await env.DB.prepare(
      "UPDATE mint_jobs SET step = 'queued', updated_at = datetime('now') WHERE id = ? AND step = 'mint_queued'"
    ).bind(next.id).run();

    await processJob(env, next.id, imageBase64);
  } catch (err) {
    console.error('[MintProcessor] Chain processing failed:', err);
  }
}
