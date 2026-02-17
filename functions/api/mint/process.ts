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
import {
  TOTAL_SUPPLY,
  SURCHARGE_CATEGORIES,
  SURCHARGE_EXEMPT_TRAITS,
  DECAY_HALF_LIFE_DAYS,
} from './_shared';

// Re-export MintError for backwards compatibility (callers may import from process.ts)
export { MintError };

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
}

// ─── Step Updater ───

export async function updateJobStep(db: D1Database, jobId: number, step: string): Promise<void> {
  await db.prepare(
    `UPDATE mint_jobs SET step = ?, updated_at = datetime('now'),
     started_at = COALESCE(started_at, datetime('now'))
     WHERE id = ?`
  ).bind(step, jobId).run();
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
  // Load job — only process if still queued
  const job = await env.DB.prepare(
    'SELECT * FROM mint_jobs WHERE id = ? AND step = ?'
  ).bind(jobId, 'queued').first<MintJobRow>();

  if (!job) return; // Already picked up or doesn't exist

  try {
    // ──── STEP 1: Validate ────
    await updateJobStep(env.DB, jobId, 'validating');

    const layers = JSON.parse(job.layers_json) as Record<string, string>;
    const colors = JSON.parse(job.colors_json) as Record<string, string>;
    const consolidated = consolidateTraits(layers);

    // ──── STEP 2: Reserve Mint Number ────
    await updateJobStep(env.DB, jobId, 'reserving_number');

    // Reuse mint_number from a previous attempt (retry) to avoid wasting supply
    let mintNumber: number;
    if (job.mint_number != null) {
      mintNumber = job.mint_number;
    } else {
      mintNumber = await getNextMintNumber(env.DB, TOTAL_SUPPLY);
      await env.DB.prepare(
        'UPDATE mint_jobs SET mint_number = ?, updated_at = datetime(\'now\') WHERE id = ?'
      ).bind(mintNumber, jobId).run();
    }

    // ──── STEP 3: Upload to IPFS ────
    await updateJobStep(env.DB, jobId, 'uploading_ipfs');

    const jwt = env.PINATA_JWT;
    if (!jwt) {
      throw new MintError('CONFIG_ERROR', 'IPFS upload not configured (missing PINATA_JWT)');
    }

    // Build CHIP-0007 metadata
    const collectionUuid = env.PHASE2_COLLECTION_UUID || '';
    const TRAIT_ORDER = ['Background', 'Base', 'Clothes', 'Face', 'Face Wear', 'Head', 'Mouth'];
    const attributes = [...consolidated.values()]
      .map(({ traitType, displayName }) => ({ trait_type: traitType, value: displayName }))
      .sort((a, b) => {
        const ai = TRAIT_ORDER.indexOf(a.trait_type);
        const bi = TRAIT_ORDER.indexOf(b.trait_type);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });

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
          { type: 'twitter', value: 'https://x.com/WojakInk' },
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

    // Clean up image from KV (no longer needed)
    try {
      await env.MINT_JOBS_KV.delete(`job-image:${jobId}`);
    } catch {
      // Non-critical — KV cleanup failure is fine
    }

    // ──── STEP 4: Call MintGarden ────
    await updateJobStep(env.DB, jobId, 'calling_mintgarden');

    const totalPriceXch = job.mint_type === 'paid' && job.xch_price_mojos
      ? job.xch_price_mojos / 1_000_000_000_000
      : undefined;

    const mintResult = await callMintGardenMint({
      walletAddress: job.wallet_address,
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
      // Processing STOPS here for paid mints.
      // Resumed by confirm-payment.ts or expired by cleanup.ts.
      return;
    }

    // ──── STEP 6: Finalize (free mints) ────
    await finalizeJob(env, jobId);

  } catch (error) {
    await handleJobFailure(env, jobId, job, error);
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
  const consolidated = consolidateTraits(layers);
  const launcherId = job.mintgarden_launcher_id;
  const ipfsImageUris = job.ipfs_image_uris ? JSON.parse(job.ipfs_image_uris) as string[] : [];
  const ipfsMetadataUris = job.ipfs_metadata_uris ? JSON.parse(job.ipfs_metadata_uris) as string[] : [];

  // Atomic batch: insert phase2_mints + update trait_usage + update job status
  const batchStmts: D1PreparedStatement[] = [];

  // 1. Insert into phase2_mints (the canonical mint record)
  batchStmts.push(
    env.DB.prepare(
      `INSERT INTO phase2_mints (
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
      ipfsImageUris[0] ?? null,
      ipfsMetadataUris[0] ?? null,
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

  // Audit log
  await logMintStep(env.DB, {
    mint_id: mintRow?.id ?? 0,
    step: job.mint_type === 'free' ? 'free_mint_completed' : 'paid_mint_confirmed',
    status: 'completed',
    data: { mint_number: job.mint_number, launcher_id: launcherId, job_id: jobId },
  });
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
  // fields like mintgarden_launcher_id may have been set during processing)
  const job = await env.DB.prepare('SELECT * FROM mint_jobs WHERE id = ?')
    .bind(jobId).first<MintJobRow>() ?? _initialJob;

  console.error(`[MintProcessor] Job ${jobId} failed at step ${job?.step}:`, errorMsg);

  // Non-retryable error codes — these won't succeed on retry
  const nonRetryable = [
    'SOLD_OUT', 'INSUFFICIENT_CREDITS', 'INVALID_TRAITS', 'SUPPLY_EXHAUSTED', 'CONFIG_ERROR',
    'OFFER_CREATION_FAILED', 'MINTGARDEN_FAILED',
  ];
  // Also non-retryable if we're past IPFS upload (image deleted from KV, can't restart from scratch)
  const pastIpfs = job?.step && !['queued', 'validating', 'reserving_number', 'uploading_ipfs'].includes(job.step);
  const retryable = !nonRetryable.includes(errorCode) && !pastIpfs;

  if (retryable && (job?.retry_count ?? 0) < (job?.max_retries ?? 3)) {
    // Increment retry count, reset to queued for retry.
    // Clear IPFS URIs (may be partial) but keep mint_number intentionally —
    // processJob reuses job.mint_number on retry (line ~117) to avoid
    // reserving a second number for the same job, which would leak supply.
    await env.DB.prepare(
      `UPDATE mint_jobs SET step = 'queued', retry_count = retry_count + 1,
       error_message = ?, error_code = ?,
       ipfs_image_uris = NULL, ipfs_metadata_uris = NULL,
       image_hash = NULL, metadata_hash = NULL,
       updated_at = datetime('now')
       WHERE id = ?`
    ).bind(errorMsg, errorCode, jobId).run();
    return;
  }

  // Non-retryable or max retries exceeded
  let finalStep = 'failed';

  // If credits were deducted (free mint), refund them
  if (job?.mint_type === 'free' && job?.credit_spend_id) {
    await env.DB.prepare(
      'DELETE FROM credit_spends WHERE id = ?'
    ).bind(job.credit_spend_id).run();
    finalStep = 'refunded';
  }

  // If paid mint failed after user already paid, auto-flag refund.
  // IMPORTANT: Check mintgarden_launcher_id (NOT phase2_mint_id) to detect payment.
  // phase2_mint_id is only set at finalization — if failure occurs before that
  // (IPFS upload fail, MintGarden API error), phase2_mint_id is NULL even though
  // the user may have paid. mintgarden_launcher_id proves payment was in play.
  if (job?.mint_type === 'paid' && job?.mintgarden_launcher_id) {
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
    data: { job_id: jobId, error_code: errorCode, mint_number: job?.mint_number },
  });
}
