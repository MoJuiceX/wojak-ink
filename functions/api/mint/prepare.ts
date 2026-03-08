/**
 * @deprecated — Use /api/mint/submit instead (queue-based architecture).
 * This endpoint remains as a legacy fallback but should not be called by
 * the current frontend. Will be removed after mint launch stabilizes.
 *
 * Mint Prepare API — /api/mint/prepare
 *
 * POST body: {
 *   walletAddress: string,
 *   selectedLayers: Record<string, string>,
 *   selectedColors: Record<string, string>,
 *   imageBase64: string,
 *   mintType: 'paid' | 'free'
 * }
 *
 * Validates layers/colors, reserves atomic mint number, uploads to IPFS,
 * calls MintGarden via request.ts (paid/free), creates pending (paid) or
 * completes mint (free).
 *
 * AUDIT FIX: Mint number is now reserved BEFORE building metadata so the
 * immutable IPFS name matches the actual assigned number. edition_number
 * is passed through to MintGarden instead of being hardcoded.
 */

import { callMintGardenMint } from './request';
import { getOrCreateSplitterAddress } from './splitxch';
import { logMintStep } from './auditHelper';
import { getNextMintNumber } from './mintNumberHelper';
import {
  jsonResponse,
  errorResponse,
  optionsResponse,
  isValidChiaAddress,
  surchargeXch,
  applyDecay,
  SURCHARGE_CATEGORIES,
  SURCHARGE_EXEMPT_TRAITS,
  DECAY_HALF_LIFE_DAYS,
  TOTAL_SUPPLY,
  FREE_MINT_CREDITS,
  BASE_PRICE_XCH,
  OFFER_EXPIRY_MINUTES,
  VALID_LAYER_NAMES,
} from './_shared';
import { checkRateLimit, getRateLimitKey, MINT_RATE_LIMITS } from '../../lib/rateLimit';
import { uploadToIPFS, IPFSUploadResult } from './uploadToIPFS';
import { resolveTraitName, LAYER_TO_TRAIT_TYPE, PHASE1_RARITY } from './traitResolver';

interface Env {
  DB: D1Database;
  PINATA_JWT?: string;
  PHASE2_COLLECTION_UUID?: string;
  PHASE2_PROFILE_ID?: string;
  PHASE2_ROYALTY_ADDRESS?: string;
  PHASE2_ROYALTY_PCT?: string;
  MINTGARDEN_API_KEY?: string;
  TREASURY_ADDRESS?: string;
  /** Paid mints: XCH goes here (MintGarden target_address). Required for paid. */
  CREATOR_PAYOUT_ADDRESS?: string;
}

const SUPPLY_TOTAL = TOTAL_SUPPLY; // alias for backwards compat within this file

function isValidHex(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

interface PrepareBody {
  walletAddress?: string;
  selectedLayers?: Record<string, string>;
  selectedColors?: Record<string, string>;
  imageBase64?: string;
  mintType?: 'paid' | 'free';
  /** Whether this Wojak was AI-enhanced (adds AI metadata attributes) */
  aiEnhanced?: boolean;
  /** AI edit details: [{ category: 'clothes', prompt: 'Add flame pattern' }, ...] */
  aiAttributes?: Array<{ category: string; prompt: string }>;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return optionsResponse();
  }

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  if (!env.DB) {
    return errorResponse('Service not configured', 500);
  }

  // Rate limit: 5 mint attempts per minute per IP/wallet
  const rlKey = getRateLimitKey(request);
  const rlResult = await checkRateLimit(env.DB, rlKey, MINT_RATE_LIMITS.prepare, true);
  if (!rlResult.allowed) {
    return errorResponse('Too many mint requests. Please wait a moment.', 429);
  }

  let body: PrepareBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  const wallet = body.walletAddress;
  const selectedLayers = body.selectedLayers || {};
  const selectedColors = body.selectedColors || {};
  const imageBase64 = body.imageBase64;
  const mintType = body.mintType === 'paid' ? 'paid' : 'free';
  const collectionUuid = env.PHASE2_COLLECTION_UUID || '';

  if (!wallet || !isValidChiaAddress(wallet)) {
    return errorResponse('Missing or invalid walletAddress', 400);
  }
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return errorResponse('Missing imageBase64', 400);
  }

  for (const [layer, path] of Object.entries(selectedLayers)) {
    if (!VALID_LAYER_NAMES.has(layer)) {
      return errorResponse(`Invalid layer: ${layer}`, 400);
    }
    // Validate path format: prevent directory traversal and restrict to known patterns
    if (path) {
      const parts = path.split('/');
      // Allow up to 10 segments for URL-based paths (https://domain/folder/file)
      if (parts.length > 10 || parts.some(p => p === '..' || p === '.')) {
        return errorResponse(`Invalid layer path for ${layer}`, 400);
      }
      // Paths must only contain alphanumeric, hyphens, underscores, spaces, dots, $, commas, +, :
      // : needed for https:// URL-based layer paths (e.g. https://layers.wojak.ink/...)
      if (!/^[a-zA-Z0-9_\-.\s/$,+:]+$/.test(path)) {
        return errorResponse(`Invalid characters in layer path for ${layer}`, 400);
      }
    }
  }
  for (const [layer, color] of Object.entries(selectedColors)) {
    if (color && !isValidHex(color)) {
      return errorResponse(`Invalid color for ${layer}: ${color}`, 400);
    }
  }

  try {
    // Expire stale pending mints (paid offers past their expiry)
    await env.DB.prepare(
      `UPDATE phase2_mints SET status = 'expired'
       WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < datetime('now')`
    ).run();

    // SECURITY (CF-4): Clean up stale credit_hold records from crashed Workers.
    // If a free mint flow started credit deduction but the Worker died before
    // completing the MintGarden call, the credit_hold row blocks future mints
    // and the credits are stuck. Refund credits and mark as failed.
    const staleCreditHolds = await env.DB.prepare(
      `SELECT id FROM phase2_mints
       WHERE status = 'credit_hold' AND created_at < datetime('now', '-2 minutes')`
    ).all<{ id: number }>();

    if (staleCreditHolds.results?.length) {
      const cleanupStmts: D1PreparedStatement[] = [];
      for (const row of staleCreditHolds.results) {
        // Refund held credits
        cleanupStmts.push(
          env.DB.prepare(
            `DELETE FROM credit_spends WHERE mint_id = ?`
          ).bind(row.id)
        );
        // Mark mint as failed
        cleanupStmts.push(
          env.DB.prepare(
            `UPDATE phase2_mints SET status = 'failed',
             error_message = 'Stale credit_hold — Worker timeout, credits refunded'
             WHERE id = ? AND status = 'credit_hold'`
          ).bind(row.id)
        );
      }
      await env.DB.batch(cleanupStmts);
    }

    // SECURITY (CF-4): Check for ANY in-progress mint for this wallet.
    // Includes 'pending' (paid offer awaiting acceptance) AND 'credit_hold'
    // (free mint in progress). This prevents concurrent free mint requests
    // from both proceeding past this guard.
    const existingPending = await env.DB.prepare(
      `SELECT id, offer_file, expires_at, created_at, status FROM phase2_mints
       WHERE wallet_address = ? AND (
         (status = 'pending' AND (expires_at IS NULL OR expires_at > datetime('now')))
         OR
         (status = 'credit_hold' AND created_at > datetime('now', '-2 minutes'))
       )`
    )
      .bind(wallet)
      .first<{ id: number; offer_file: string | null; expires_at: string | null; created_at: string; status: string }>();

    if (existingPending) {
      if (existingPending.status === 'credit_hold') {
        // Free mint already in progress — tell user to wait
        return jsonResponse({
          error: 'A free mint is already in progress. Please wait for it to complete.',
          errorCode: 'MINT_IN_PROGRESS',
        }, 409);
      }
      return jsonResponse({
        pending: true,
        mintId: existingPending.id,
        offerFile: existingPending.offer_file,
        expiresAt: existingPending.expires_at,
        createdAt: existingPending.created_at,
      });
    }

    // Supply check
    const supplyRow = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM phase2_mints WHERE status = 'minted'"
    ).first<{ count: number }>();
    const mintedCount = supplyRow?.count ?? 0;
    if (mintedCount >= SUPPLY_TOTAL) {
      return jsonResponse({ error: 'Sold out', supply: { minted: mintedCount, total: SUPPLY_TOTAL } }, 400);
    }

    const layersJson = JSON.stringify(selectedLayers);
    const colorsJson = JSON.stringify(selectedColors);

    // ── Build consolidated trait map early (needed for credit cost calculation) ──
    // Consolidate duplicates: when multiple layers map to the same trait_type, rarer wins
    const rawAttrs: { trait_type: string; value: string; layerKey: string }[] = [];
    for (const [layer, value] of Object.entries(selectedLayers)) {
      const traitType = LAYER_TO_TRAIT_TYPE[layer];
      if (!traitType) continue;
      rawAttrs.push({
        trait_type: traitType,
        value: resolveTraitName(value, layer),
        layerKey: layer,
      });
    }

    const consolidated = new Map<string, { trait_type: string; value: string; layerKey: string }>();
    let extraCount = 0;
    for (const attr of rawAttrs) {
      // Extras don't consolidate — each gets its own slot (can have up to 2)
      if (attr.trait_type === 'Extra') {
        extraCount++;
        const key = extraCount === 1 ? 'Extra' : `Extra${extraCount}`;
        consolidated.set(key, attr);
        continue;
      }
      const existing = consolidated.get(attr.trait_type);
      if (!existing) {
        consolidated.set(attr.trait_type, attr);
      } else {
        const existingRarity = PHASE1_RARITY[existing.value] ?? 0;
        const newRarity = PHASE1_RARITY[attr.value] ?? 0;
        if (newRarity < existingRarity) {
          consolidated.set(attr.trait_type, attr);
        }
      }
    }

    // Always inject fixed "Base: Wojak"
    consolidated.set('Base', { trait_type: 'Base', value: 'Wojak', layerKey: '_base' });

    // ── Free mint: surcharge-scaled credit cost + credit check ──
    let freeMintCreditCost = FREE_MINT_CREDITS; // base 100 credits (x100 units)

    if (mintType === 'free') {
      // Query all trait usage for surcharge categories
      const allTraitRows = await env.DB.prepare(
        `SELECT trait_category, trait_name, effective_usage, last_decay_at
         FROM trait_usage WHERE trait_category IN ('Head', 'Clothes', 'Face Wear')`
      ).all<{
        trait_category: string;
        trait_name: string;
        effective_usage: number;
        last_decay_at: string;
      }>();

      // Calculate highest surcharge among selected traits (same logic as paid path)
      let maxSurcharge = 0;
      for (const { trait_type, value } of consolidated.values()) {
        if (!SURCHARGE_CATEGORIES.has(trait_type)) continue;
        if (SURCHARGE_EXEMPT_TRAITS.has(value)) continue;
        const row = (allTraitRows.results || []).find(
          r => r.trait_category === trait_type && r.trait_name === value
        );
        const decayedUsage = row ? applyDecay(row.effective_usage, row.last_decay_at) : 0;
        const traitSurcharge = surchargeXch(decayedUsage, trait_type, value);
        if (traitSurcharge > maxSurcharge) {
          maxSurcharge = traitSurcharge;
        }
      }

      // Scale credit cost proportionally: credits = base × (base + surcharge) / base
      if (maxSurcharge > 0) {
        freeMintCreditCost = Math.ceil(
          FREE_MINT_CREDITS * (BASE_PRICE_XCH + maxSurcharge) / BASE_PRICE_XCH
        );
      }

      // Credit pre-check (early exit before expensive IPFS/MintGarden calls)
      const balanceRow = await env.DB.prepare(
        `SELECT
          (SELECT COALESCE(SUM(credits_earned), 0) FROM credit_events WHERE wallet_address = ?) -
          (SELECT COALESCE(SUM(credits_spent), 0) FROM credit_spends WHERE wallet_address = ?) AS balance`
      )
        .bind(wallet, wallet)
        .first<{ balance: number }>();
      const balance = balanceRow?.balance ?? 0;
      if (balance < freeMintCreditCost) {
        return jsonResponse({
          error: 'Insufficient credits',
          balance: balance / 100,
          requiredCredits: freeMintCreditCost / 100,
        }, 400);
      }
    }

    // ── Reserve mint number FIRST (atomic, race-condition-free) ──
    // This ensures the IPFS metadata name matches the actual mint number.
    // SECURITY: getNextMintNumber enforces SUPPLY_TOTAL atomically — even
    // under concurrency, no number above 4200 can ever be issued.
    let mintNumber: number;
    try {
      mintNumber = await getNextMintNumber(env.DB, SUPPLY_TOTAL);
    } catch (err) {
      if (err instanceof Error && err.message === 'SUPPLY_EXHAUSTED') {
        return jsonResponse({ error: 'Sold out', supply: { total: SUPPLY_TOTAL } }, 400);
      }
      throw err;
    }

    // Sort in Phase 1 canonical order
    const TRAIT_ORDER = ['Background', 'Base', 'Clothes', 'Face', 'Face Wear', 'Head', 'Mouth'];
    const attributes = [...consolidated.values()]
      .map(({ trait_type, value }) => ({ trait_type, value }))
      .sort((a, b) => {
        const ai = TRAIT_ORDER.indexOf(a.trait_type);
        const bi = TRAIT_ORDER.indexOf(b.trait_type);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });

    // ── AI Enhancement attributes (only when AI-enhanced) ──
    const aiEnhanced = body.aiEnhanced === true;
    const aiAttributes = aiEnhanced && Array.isArray(body.aiAttributes) ? body.aiAttributes : [];
    if (aiEnhanced && aiAttributes.length > 0) {
      attributes.push({ trait_type: 'AI Enhanced', value: 'Yes' });
      for (const attr of aiAttributes) {
        if (attr.category && attr.prompt) {
          const label = attr.category.charAt(0).toUpperCase() + attr.category.slice(1);
          attributes.push({ trait_type: `AI ${label}`, value: attr.prompt });
        }
      }
      attributes.push({ trait_type: 'AI Edits Count', value: String(aiAttributes.length) });
    }

    const metadata = {
      format: 'CHIP-0007',
      name: `Your Wojak #${mintNumber}`,
      description: 'Your Wojak puts collectors in control. Same handcrafted layers and lore from the Wojak Farmers Plot collection \u2014 but you choose every layer, every color, every detail using the Wojak Generator on Wojak.ink \uD83C\uDF4A',
      sensitive_content: false,
      collection: { name: 'Your Wojak', id: collectionUuid },
      edition: mintNumber,
      date: Date.now(),
      compiler: 'Wojak.ink Generator',
      attributes,
      edition_number: mintNumber,
      edition_total: SUPPLY_TOTAL,
    };

    // ── IPFS Upload (direct call, no self-fetch) ──
    const jwt = env.PINATA_JWT;
    if (!jwt) {
      return errorResponse('IPFS upload not configured', 503);
    }
    let uploadData: IPFSUploadResult;
    try {
      uploadData = await uploadToIPFS(imageBase64, metadata as Record<string, unknown>, jwt);
    } catch (error) {
      console.error('[Mint Prepare] IPFS upload failed:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'IPFS upload failed',
        502
      );
    }

    const ipfsImageUri = uploadData.dataUris[0] ?? null;
    const ipfsMetadataUri = uploadData.metadataUris[0] ?? null;

    // ═══════════════════════════════════════════════════════
    // FREE MINT
    // ═══════════════════════════════════════════════════════
    // SECURITY: Credits are deducted BEFORE MintGarden is called.
    // This prevents concurrent requests from getting free NFTs by
    // racing the balance check. If MintGarden fails after deduction,
    // credits are refunded.
    if (mintType === 'free') {
      // Step 1: Insert provisional mint record (status='credit_hold')
      // We need a mint_id for the credit_spends foreign key.
      const insert = await env.DB.prepare(
        `INSERT INTO phase2_mints (
          mint_number, wallet_address, layers_json, colors_json,
          ipfs_image_uri, ipfs_metadata_uri, image_hash, metadata_hash,
          mint_type, total_price_xch, status,
          ipfs_upload_started_at, ipfs_upload_completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'free', NULL, 'credit_hold',
                  datetime('now'), datetime('now'))`
      )
        .bind(
          mintNumber, wallet, layersJson, colorsJson,
          ipfsImageUri, ipfsMetadataUri, uploadData.dataHash, uploadData.metadataHash
        )
        .run();

      const mintId = insert.meta?.last_row_id ?? 0;

      // Step 2: Atomically deduct credits BEFORE calling MintGarden.
      // This is the concurrency gate — only one request per balance succeeds.
      const deduct = await env.DB.prepare(
        `INSERT INTO credit_spends (wallet_address, mint_id, credits_spent)
         SELECT ?, ?, ?
         WHERE (
           (SELECT COALESCE(SUM(credits_earned), 0) FROM credit_events WHERE wallet_address = ?) -
           (SELECT COALESCE(SUM(credits_spent), 0) FROM credit_spends WHERE wallet_address = ?)
         ) >= ?`
      )
        .bind(wallet, mintId, freeMintCreditCost, wallet, wallet, freeMintCreditCost)
        .run();

      if (!deduct.meta?.changes) {
        // Credits insufficient (concurrent request already spent them).
        // No NFT was minted — safe to fail.
        await env.DB.prepare(
          `UPDATE phase2_mints SET status = 'failed' WHERE id = ?`
        ).bind(mintId).run();
        return jsonResponse({ error: 'Insufficient credits (concurrent request)', balance: 0 }, 409);
      }

      // Step 3: Credits held — now call MintGarden to create the NFT.
      // Resolve SplitXCH splitter so treasury gets 2% on resales (same as process.ts / paid prepare).
      let freeRoyaltyAddress: string | undefined;
      if (env.TREASURY_ADDRESS) {
        try {
          freeRoyaltyAddress = await getOrCreateSplitterAddress(
            { DB: env.DB, TREASURY_ADDRESS: env.TREASURY_ADDRESS },
            wallet,
            1,
          );
          if (!freeRoyaltyAddress) {
            console.error('[Prepare Free] SplitXCH returned empty, using minter as royalty_address');
          }
        } catch (err) {
          console.error('[Prepare Free] SplitXCH failed, using minter as royalty_address:', err);
        }
      }

      let launcherId: string | null = null;
      try {
        const mintResult = await callMintGardenMint(
          {
            walletAddress: wallet,
            royaltyAddress: freeRoyaltyAddress,
            mintType: 'free',
            ipfsImageUris: uploadData.dataUris,
            ipfsMetadataUris: uploadData.metadataUris,
            imageHash: uploadData.dataHash,
            metadataHash: uploadData.metadataHash,
            collectionUuid: env.PHASE2_COLLECTION_UUID || '',
            editionNumber: mintNumber,
            editionTotal: SUPPLY_TOTAL,
          },
          env
        );
        launcherId = mintResult.launcherId ?? null;
      } catch (err) {
        console.error('[Free Mint] MintGarden call threw:', err);
      }

      if (!launcherId) {
        // MintGarden failed — REFUND credits (delete the spend record).
        await env.DB.prepare(
          `DELETE FROM credit_spends WHERE mint_id = ? AND wallet_address = ?`
        ).bind(mintId, wallet).run();
        await env.DB.prepare(
          `UPDATE phase2_mints SET status = 'failed', error_message = 'MintGarden failed after credit hold' WHERE id = ?`
        ).bind(mintId).run();
        await logMintStep(env.DB, {
          mint_id: mintId,
          step: 'free_mint_refunded',
          status: 'failed',
          error: 'MintGarden failed — credits refunded',
        });
        return jsonResponse({
          error: 'MintGarden API failed to create NFT. Your credits have been refunded. Please try again.',
          errorCode: 'MINTGARDEN_FAILED',
          creditsRefunded: true,
        }, 500);
      }

      // Step 4: MintGarden succeeded — finalize mint record + update trait usage.
      const finalizeStmts: D1PreparedStatement[] = [];

      // Update mint record to 'minted'
      finalizeStmts.push(
        env.DB.prepare(
          `UPDATE phase2_mints
           SET status = 'minted', minted_at = datetime('now'),
               mintgarden_launcher_id = ?,
               mintgarden_called_at = datetime('now'),
               mintgarden_completed_at = datetime('now')
           WHERE id = ?`
        ).bind(launcherId, mintId)
      );

      // Trait_usage upserts
      for (const { trait_type, value } of consolidated.values()) {
        if (!value || trait_type === 'Base') continue;
        const isExempt = SURCHARGE_EXEMPT_TRAITS.has(value);

        if (SURCHARGE_CATEGORIES.has(trait_type) && !isExempt) {
          finalizeStmts.push(
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
            ).bind(trait_type, value, DECAY_HALF_LIFE_DAYS)
          );
        } else {
          finalizeStmts.push(
            env.DB.prepare(
              `INSERT INTO trait_usage (trait_category, trait_name, usage_count, updated_at)
               VALUES (?, ?, 1, datetime('now'))
               ON CONFLICT(trait_category, trait_name) DO UPDATE SET
                 usage_count = usage_count + 1,
                 updated_at = datetime('now')`
            ).bind(trait_type, value)
          );
        }
      }

      await env.DB.batch(finalizeStmts);

      // Audit logging
      await logMintStep(env.DB, {
        mint_id: mintId,
        step: 'free_mint_completed',
        status: 'completed',
        data: { mint_number: mintNumber, launcher_id: launcherId, credits_spent: freeMintCreditCost / 100 },
      });

      return jsonResponse({
        success: true,
        mintType: 'free',
        mintNumber,
        launcherId,
        creditsSpent: freeMintCreditCost / 100,
        mintgardenUrl: `https://mintgarden.io/nfts/${launcherId}`,
      });
    }

    // ═══════════════════════════════════════════════════════
    // PAID MINT
    // ═══════════════════════════════════════════════════════
    const traitRows = await env.DB.prepare(
      `SELECT trait_category, trait_name, usage_count, effective_usage, last_decay_at
       FROM trait_usage WHERE trait_category IN ('Head', 'Clothes', 'Face Wear')`
    ).all<{
      trait_category: string;
      trait_name: string;
      usage_count: number;
      effective_usage: number;
      last_decay_at: string;
    }>();

    // Calculate surcharge — only for Head, Clothes, Face Wear
    // Take the single highest surcharge across all selected traits
    let maxSurcharge = 0;
    let highestTrait: string | null = null;

    for (const { trait_type, value } of consolidated.values()) {
      if (!SURCHARGE_CATEGORIES.has(trait_type)) continue;
      if (SURCHARGE_EXEMPT_TRAITS.has(value)) continue;

      const row = (traitRows.results || []).find(
        r => r.trait_category === trait_type && r.trait_name === value
      );
      const decayedUsage = row ? applyDecay(row.effective_usage, row.last_decay_at) : 0;
      const traitSurcharge = surchargeXch(decayedUsage, trait_type, value);

      if (traitSurcharge > maxSurcharge) {
        maxSurcharge = traitSurcharge;
        highestTrait = `${trait_type}: ${value}`;
      }
    }
    const totalPriceXch = BASE_PRICE_XCH + maxSurcharge;
    const totalPriceStored = Math.round(totalPriceXch * 100000);
    const surchargeStored = Math.round(maxSurcharge * 100000);
    const expiresAt = new Date(Date.now() + OFFER_EXPIRY_MINUTES * 60 * 1000).toISOString();

    // Resolve SplitXCH splitter for paid mints so treasury gets 2% on resales (same as process.ts)
    let royaltyAddress: string | undefined;
    if (env.TREASURY_ADDRESS) {
      try {
        royaltyAddress = await getOrCreateSplitterAddress(
          { DB: env.DB, TREASURY_ADDRESS: env.TREASURY_ADDRESS },
          wallet,
          1,
        );
        if (!royaltyAddress) {
          console.error('[Prepare] SplitXCH returned empty, using minter as royalty_address');
        }
      } catch (err) {
        console.error('[Prepare] SplitXCH failed, using minter as royalty_address:', err);
      }
    }

    const mintResult = await callMintGardenMint(
      {
        walletAddress: wallet,
        royaltyAddress,
        mintType: 'paid',
        ipfsImageUris: uploadData.dataUris,
        ipfsMetadataUris: uploadData.metadataUris,
        imageHash: uploadData.dataHash,
        metadataHash: uploadData.metadataHash,
        priceXch: totalPriceXch,
        collectionUuid,
        editionNumber: mintNumber,
        editionTotal: SUPPLY_TOTAL,
      },
      env
    );
    const offerFile = mintResult.offerFile ?? null;

    if (!offerFile) {
      return jsonResponse({
        error: 'MintGarden did not return an offer file. Check API key configuration or try again.',
        errorCode: 'OFFER_CREATION_FAILED',
      }, 500);
    }

    // Paid mints get mint_number assigned NOW so it matches the IPFS metadata
    const insert = await env.DB.prepare(
      `INSERT INTO phase2_mints (
        mint_number, wallet_address, layers_json, colors_json,
        ipfs_image_uri, ipfs_metadata_uri, image_hash, metadata_hash,
        mint_type, total_price_xch, trait_surcharge_xch, highest_surcharge_trait,
        offer_file, status, expires_at,
        ipfs_upload_started_at, ipfs_upload_completed_at,
        mintgarden_called_at, mintgarden_completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?, 'pending', ?,
                datetime('now'), datetime('now'), datetime('now'), datetime('now'))`
    )
      .bind(
        mintNumber, wallet, layersJson, colorsJson,
        ipfsImageUri, ipfsMetadataUri, uploadData.dataHash, uploadData.metadataHash,
        totalPriceStored, surchargeStored, highestTrait, offerFile, expiresAt
      )
      .run();

    const mintId = insert.meta?.last_row_id ?? 0;

    await logMintStep(env.DB, {
      mint_id: mintId,
      step: 'paid_offer_created',
      status: 'completed',
      data: { mint_number: mintNumber, total_price_xch: totalPriceXch, offer_created: !!offerFile },
    });

    const message = 'Accept the offer in your wallet before it expires.';
    return jsonResponse({
      pending: true,
      mintId: Number(mintId),
      offerFile,
      expiresAt,
      totalPriceXch: Math.round(totalPriceXch * 1000) / 1000,
      message,
    });
  } catch (error) {
    console.error('[Mint Prepare] Error:', error);
    try {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await logMintStep(env.DB, {
        mint_id: 0,
        step: 'prepare_failed',
        status: 'failed',
        error: errorMessage,
      });
    } catch {
      // Audit logging failure must not break error response
    }
    return errorResponse('Internal server error', 500);
  }
};
