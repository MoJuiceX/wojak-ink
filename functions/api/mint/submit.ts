/**
 * Mint Submit API — POST /api/mint/submit
 *
 * Fast endpoint (<100ms): validates input, acquires per-wallet lock,
 * deducts credits (free), stores image in KV, creates queued job,
 * triggers background processing via waitUntil.
 *
 * Returns immediately with { jobId } — frontend polls /api/mint/job.
 */

import { processJob, type ProcessEnv } from './process';
import {
  jsonResponse,
  errorResponse,
  optionsResponse,
  isValidChiaAddress,
  surchargeXch,
  applyDecay,
  TOTAL_SUPPLY,
  FREE_MINT_CREDITS,
  BASE_PRICE_XCH,
  OFFER_EXPIRY_MINUTES,
  SURCHARGE_CATEGORIES,
  SURCHARGE_EXEMPT_TRAITS,
  DECAY_HALF_LIFE_DAYS,
  PREMIUM_TOP_N,
} from './_shared';
import { checkRateLimit, getRateLimitKey, MINT_RATE_LIMITS } from '../../lib/rateLimit';
import { consolidateTraits } from './traitResolver';
import { sha256Hex, base64ToUint8Array } from './uploadToIPFS';

interface Env extends ProcessEnv {
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

const VALID_LAYER_NAMES = new Set([
  'Background', 'Base', 'Clothes', 'FacialHair', 'MouthBase', 'MouthItem', 'Mask', 'Eyes', 'Head',
]);

function isValidHex(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

interface SubmitBody {
  walletAddress?: string;
  selectedLayers?: Record<string, string>;
  selectedColors?: Record<string, string>;
  imageBase64?: string;
  mintType?: 'paid' | 'free';
  idempotencyKey?: string;
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

  // Rate limit: 5 submit attempts per minute per IP/wallet
  const rlKey = getRateLimitKey(request);
  const rlResult = await checkRateLimit(env.DB, rlKey, MINT_RATE_LIMITS.prepare, true);
  if (!rlResult.allowed) {
    return errorResponse('Too many mint requests. Please wait a moment.', 429);
  }

  let body: SubmitBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  // ── Validate inputs ──

  const wallet = body.walletAddress;
  const selectedLayers = body.selectedLayers || {};
  const selectedColors = body.selectedColors || {};
  const imageBase64 = body.imageBase64;
  const mintType = body.mintType === 'paid' ? 'paid' : 'free';
  const idempotencyKey = body.idempotencyKey;

  if (!wallet || !isValidChiaAddress(wallet)) {
    return errorResponse('Missing or invalid walletAddress', 400);
  }
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return errorResponse('Missing imageBase64', 400);
  }
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return errorResponse('Missing idempotencyKey', 400);
  }

  // Validate layer names and paths
  for (const [layer, path] of Object.entries(selectedLayers)) {
    if (!VALID_LAYER_NAMES.has(layer)) {
      return errorResponse(`Invalid layer: ${layer}`, 400);
    }
    if (path) {
      const parts = path.split('/');
      if (parts.length > 4 || parts.some(p => p === '..' || p === '.')) {
        return errorResponse(`Invalid layer path for ${layer}`, 400);
      }
      if (!/^[a-zA-Z0-9_\-.\s/$,]+$/.test(path)) {
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
    // ── Idempotency check ──
    const existing = await env.DB.prepare(
      `SELECT id, step, mint_number, mintgarden_launcher_id, offer_file, error_message, mint_type,
              credit_cost, xch_price_mojos
       FROM mint_jobs WHERE idempotency_key = ?`
    ).bind(idempotencyKey).first<{
      id: number; step: string; mint_number: number | null;
      mintgarden_launcher_id: string | null; offer_file: string | null;
      error_message: string | null; mint_type: string;
      credit_cost: number | null; xch_price_mojos: number | null;
    }>();

    if (existing) {
      return jsonResponse({
        jobId: existing.id,
        step: existing.step,
        mintType: existing.mint_type,
        creditCost: existing.credit_cost ? existing.credit_cost / 100 : undefined,
        estimatedXch: existing.xch_price_mojos ? existing.xch_price_mojos / 1_000_000_000_000 : undefined,
      });
    }

    // ── Sold-out fast check (cached flag from server_state) ──
    const soldOutRow = await env.DB.prepare(
      "SELECT value FROM server_state WHERE key = 'sold_out'"
    ).first<{ value: string }>();
    if (soldOutRow?.value === 'true') {
      return jsonResponse({ error: 'Sold out', supply: { minted: TOTAL_SUPPLY, total: TOTAL_SUPPLY } }, 400);
    }

    // ── Supply check: minted + in-flight >= TOTAL_SUPPLY ──
    const mintedRow = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM phase2_mints WHERE status = 'minted'"
    ).first<{ count: number }>();
    const mintedCount = mintedRow?.count ?? 0;

    const inflightRow = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM mint_jobs WHERE step NOT IN ('completed', 'failed', 'refunded')"
    ).first<{ count: number }>();
    const inflightCount = inflightRow?.count ?? 0;

    if (mintedCount + inflightCount >= TOTAL_SUPPLY) {
      return jsonResponse({ error: 'Sold out', supply: { minted: mintedCount, total: TOTAL_SUPPLY } }, 400);
    }

    // ── Calculate pricing ──
    const consolidated = consolidateTraits(selectedLayers);

    let freeMintCreditCost = FREE_MINT_CREDITS;
    let xchPriceMojos: number | null = null;
    let surchargeStored: number | null = null;
    let highestTrait: string | null = null;

    // Query trait usage for surcharge categories
    const allTraitRows = await env.DB.prepare(
      `SELECT trait_category, trait_name, effective_usage, last_decay_at
       FROM trait_usage WHERE trait_category IN ('Head', 'Clothes', 'Face Wear')`
    ).all<{
      trait_category: string;
      trait_name: string;
      effective_usage: number;
      last_decay_at: string;
    }>();

    if (mintType === 'free') {
      // Calculate premium credit cost
      const surchargesByCategory: Record<string, { name: string; surcharge: number }[]> = {};
      for (const cat of SURCHARGE_CATEGORIES) {
        surchargesByCategory[cat] = [];
      }
      for (const row of (allTraitRows.results || [])) {
        if (!SURCHARGE_CATEGORIES.has(row.trait_category)) continue;
        if (SURCHARGE_EXEMPT_TRAITS.has(row.trait_name)) continue;
        const decayed = applyDecay(row.effective_usage, row.last_decay_at);
        const sc = surchargeXch(decayed, row.trait_category, row.trait_name);
        surchargesByCategory[row.trait_category]?.push({ name: row.trait_name, surcharge: sc });
      }

      const premiumTraits = new Set<string>();
      for (const category of Object.keys(surchargesByCategory)) {
        const sorted = surchargesByCategory[category].sort((a, b) => b.surcharge - a.surcharge);
        for (let i = 0; i < Math.min(PREMIUM_TOP_N, sorted.length); i++) {
          if (sorted[i].surcharge > 0) {
            premiumTraits.add(`${category}:${sorted[i].name}`);
          }
        }
      }

      let maxPremiumSurcharge = 0;
      for (const { traitType, displayName } of consolidated.values()) {
        if (!SURCHARGE_CATEGORIES.has(traitType)) continue;
        if (SURCHARGE_EXEMPT_TRAITS.has(displayName)) continue;
        const key = `${traitType}:${displayName}`;
        if (premiumTraits.has(key)) {
          const row = (allTraitRows.results || []).find(
            r => r.trait_category === traitType && r.trait_name === displayName
          );
          const decayed = row ? applyDecay(row.effective_usage, row.last_decay_at) : 0;
          const sc = surchargeXch(decayed, traitType, displayName);
          if (sc > maxPremiumSurcharge) {
            maxPremiumSurcharge = sc;
            highestTrait = `${traitType}: ${displayName}`;
          }
        }
      }

      if (maxPremiumSurcharge > 0) {
        freeMintCreditCost = Math.round(
          FREE_MINT_CREDITS * (BASE_PRICE_XCH + maxPremiumSurcharge) / BASE_PRICE_XCH
        );
      }
      surchargeStored = maxPremiumSurcharge > 0 ? Math.round(maxPremiumSurcharge * 100000) : null;

    } else {
      // Paid: calculate XCH price
      let maxSurcharge = 0;
      for (const { traitType, displayName } of consolidated.values()) {
        if (!SURCHARGE_CATEGORIES.has(traitType)) continue;
        if (SURCHARGE_EXEMPT_TRAITS.has(displayName)) continue;
        const row = (allTraitRows.results || []).find(
          r => r.trait_category === traitType && r.trait_name === displayName
        );
        const decayedUsage = row ? applyDecay(row.effective_usage, row.last_decay_at) : 0;
        const traitSurcharge = surchargeXch(decayedUsage, traitType, displayName);
        if (traitSurcharge > maxSurcharge) {
          maxSurcharge = traitSurcharge;
          highestTrait = `${traitType}: ${displayName}`;
        }
      }
      const totalPriceXch = BASE_PRICE_XCH + maxSurcharge;
      xchPriceMojos = Math.round(totalPriceXch * 1_000_000_000_000);
      surchargeStored = Math.round(maxSurcharge * 100000);
    }

    // ── For free mints: deduct credits NOW ──
    let creditSpendId: number | null = null;

    if (mintType === 'free') {
      // Credit balance check
      const balanceRow = await env.DB.prepare(
        `SELECT
          (SELECT COALESCE(SUM(credits_earned), 0) FROM credit_events WHERE wallet_address = ?) -
          (SELECT COALESCE(SUM(credits_spent), 0) FROM credit_spends WHERE wallet_address = ?) AS balance`
      ).bind(wallet, wallet).first<{ balance: number }>();
      const balance = balanceRow?.balance ?? 0;

      if (balance < freeMintCreditCost) {
        return jsonResponse({
          error: 'Insufficient credits',
          balance: balance / 100,
          requiredCredits: freeMintCreditCost / 100,
        }, 400);
      }

      // Atomic credit deduction — mint_id=0 temporarily, updated at finalize
      const deduct = await env.DB.prepare(
        `INSERT INTO credit_spends (wallet_address, mint_id, credits_spent)
         SELECT ?, 0, ?
         WHERE (
           (SELECT COALESCE(SUM(credits_earned), 0) FROM credit_events WHERE wallet_address = ?) -
           (SELECT COALESCE(SUM(credits_spent), 0) FROM credit_spends WHERE wallet_address = ?)
         ) >= ?`
      ).bind(wallet, freeMintCreditCost, wallet, wallet, freeMintCreditCost).run();

      if (!deduct.meta?.changes) {
        return jsonResponse({ error: 'Insufficient credits (concurrent request)', balance: 0 }, 409);
      }

      creditSpendId = deduct.meta?.last_row_id ?? null;
    }

    // ── Compute image hash ──
    const imageBytes = base64ToUint8Array(imageBase64);
    const imageHash = await sha256Hex(imageBytes);

    // ── INSERT the job (with wallet_lock for per-wallet mutex) ──
    const expiresAt = mintType === 'paid'
      ? new Date(Date.now() + 20 * 60 * 1000).toISOString()
      : new Date(Date.now() + 5 * 60 * 1000).toISOString();

    let jobId: number;
    try {
      const insertResult = await env.DB.prepare(
        `INSERT INTO mint_jobs (
          wallet_address, idempotency_key, layers_json, colors_json,
          image_base64_hash, mint_type, credit_cost, xch_price_mojos,
          surcharge_xch, highest_surcharge_trait,
          step, wallet_lock, credit_spend_id, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?)`
      ).bind(
        wallet, idempotencyKey,
        JSON.stringify(selectedLayers), JSON.stringify(selectedColors),
        imageHash, mintType,
        mintType === 'free' ? freeMintCreditCost : null,
        xchPriceMojos,
        surchargeStored, highestTrait,
        wallet, // wallet_lock = wallet_address (activates mutex)
        creditSpendId,
        expiresAt
      ).run();

      jobId = insertResult.meta?.last_row_id as number;
      if (!jobId) throw new Error('No job ID returned from INSERT');

    } catch (err: unknown) {
      // UNIQUE constraint on wallet_lock = per-wallet mutex rejection
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('UNIQUE') && errMsg.includes('wallet_lock')) {
        // Refund credits if we just deducted them
        if (creditSpendId) {
          await env.DB.prepare('DELETE FROM credit_spends WHERE id = ?').bind(creditSpendId).run();
        }
        // Find the existing active job for helpful error
        const activeJob = await env.DB.prepare(
          "SELECT id FROM mint_jobs WHERE wallet_lock = ? AND wallet_lock IS NOT NULL"
        ).bind(wallet).first<{ id: number }>();

        return jsonResponse({
          error: 'You already have a mint in progress. Please wait for it to complete.',
          errorCode: 'WALLET_LOCKED',
          existingJobId: activeJob?.id,
        }, 409);
      }
      throw err;
    }

    // ── Store image in KV (30 min TTL) ──
    await env.MINT_JOBS_KV.put(`job-image:${jobId}`, imageBase64, { expirationTtl: 1800 });

    // ── Trigger background processing ──
    context.waitUntil(processJob(env, jobId, imageBase64));

    // ── Return immediately ──
    return jsonResponse({
      jobId,
      step: 'queued',
      mintType,
      creditCost: mintType === 'free' ? freeMintCreditCost / 100 : undefined,
      estimatedXch: xchPriceMojos ? xchPriceMojos / 1_000_000_000_000 : undefined,
    });

  } catch (error) {
    console.error('[Mint Submit] Error:', error);
    return errorResponse('Internal server error', 500);
  }
};
