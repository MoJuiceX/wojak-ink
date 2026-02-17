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
} from './_shared';
import { checkRateLimit, getRateLimitKey, MINT_RATE_LIMITS } from '../../lib/rateLimit';
import { consolidateTraits } from './traitResolver';
import { sha256Hex, base64ToUint8Array } from './uploadToIPFS';
import { logMintStep } from './auditHelper';

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
  customName?: string;
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
  const customName = (body.customName || '').trim();

  if (!wallet || !isValidChiaAddress(wallet)) {
    return errorResponse('Missing or invalid walletAddress', 400);
  }
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return errorResponse('Missing imageBase64', 400);
  }
  // 5MB PNG ≈ 6.67MB base64. Reject early to avoid KV/memory waste.
  if (imageBase64.length > 7_000_000) {
    return errorResponse('Image too large (max 5MB)', 400);
  }
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return errorResponse('Missing idempotencyKey', 400);
  }

  // Validate custom name (optional, max 15 chars, alphanumeric + basic punctuation)
  if (customName.length > 0) {
    if (customName.length > 15) {
      return errorResponse('Custom name must be 15 characters or less', 400);
    }
    if (!/^[a-zA-Z0-9 .,!?'-]+$/.test(customName)) {
      return errorResponse('Name contains invalid characters', 400);
    }
  }

  // Validate layer names and paths
  for (const [layer, path] of Object.entries(selectedLayers)) {
    if (!VALID_LAYER_NAMES.has(layer)) {
      return errorResponse(`Invalid layer: ${layer}`, 400);
    }
    if (path) {
      const parts = path.split('/');
      if (parts.length > 6 || parts.some(p => p === '..' || p === '.')) {
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

    // ── Minting paused check ──
    const pausedRow = await env.DB.prepare(
      "SELECT value FROM server_state WHERE key = 'minting_paused'"
    ).first<{ value: string }>();
    if (pausedRow?.value === 'true') {
      return jsonResponse({ error: 'Minting is temporarily paused. Check back soon!' }, 403);
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
      // Calculate highest surcharge among selected traits (same logic as paid path)
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

      // Scale credit cost proportionally: credits = base × (base + surcharge) / base
      if (maxSurcharge > 0) {
        freeMintCreditCost = Math.ceil(
          FREE_MINT_CREDITS * (BASE_PRICE_XCH + maxSurcharge) / BASE_PRICE_XCH
        );
      }
      surchargeStored = maxSurcharge > 0 ? Math.round(maxSurcharge * 100000) : null;

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

    // ── For free mints: check credit balance ──
    if (mintType === 'free') {
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
    }

    // ── Compute image hash ──
    const imageBytes = base64ToUint8Array(imageBase64);
    const imageHash = await sha256Hex(imageBytes);

    // ── Atomic: credit deduction + job creation in one batch ──
    // D1 .batch() is atomic — either both succeed or neither does.
    // This prevents orphaned credit deductions if job INSERT fails.
    const expiresAt = mintType === 'paid'
      ? new Date(Date.now() + 20 * 60 * 1000).toISOString()
      : new Date(Date.now() + 120 * 60 * 1000).toISOString(); // 2hr for free (matches KV TTL)

    let jobId: number;
    let creditSpendId: number | null = null;

    try {
      const batchStmts: D1PreparedStatement[] = [];

      // Statement 0 (free mints only): Atomic credit deduction
      // INSERT...SELECT with balance check ensures no over-spend.
      // mint_id=0 temporarily — updated at finalize.
      if (mintType === 'free') {
        batchStmts.push(
          env.DB.prepare(
            `INSERT INTO credit_spends (wallet_address, mint_id, credits_spent)
             SELECT ?, 0, ?
             WHERE (
               (SELECT COALESCE(SUM(credits_earned), 0) FROM credit_events WHERE wallet_address = ?) -
               (SELECT COALESCE(SUM(credits_spent), 0) FROM credit_spends WHERE wallet_address = ?)
             ) >= ?`
          ).bind(wallet, freeMintCreditCost, wallet, wallet, freeMintCreditCost)
        );
      }

      // Statement 1 (or 0 for paid): Create the job
      batchStmts.push(
        env.DB.prepare(
          `INSERT INTO mint_jobs (
            wallet_address, idempotency_key, layers_json, colors_json,
            image_base64_hash, mint_type, credit_cost, xch_price_mojos,
            surcharge_xch, highest_surcharge_trait,
            step, wallet_lock, credit_spend_id, expires_at, custom_name
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, NULL, ?, ?)`
        ).bind(
          wallet, idempotencyKey,
          JSON.stringify(selectedLayers), JSON.stringify(selectedColors),
          imageHash, mintType,
          mintType === 'free' ? freeMintCreditCost : null,
          xchPriceMojos,
          surchargeStored, highestTrait,
          wallet, // wallet_lock = wallet_address (activates mutex)
          expiresAt,
          customName || null
        )
      );

      const batchResults = await env.DB.batch(batchStmts);

      if (mintType === 'free') {
        // Check credit deduction succeeded (statement 0)
        const creditResult = batchResults[0];
        if (!creditResult.meta?.changes) {
          // Balance went negative between check and batch — race condition
          return jsonResponse({ error: 'Insufficient credits (concurrent request)', balance: 0 }, 409);
        }
        creditSpendId = creditResult.meta?.last_row_id ?? null;

        // Job INSERT is statement 1
        const jobResult = batchResults[1];
        jobId = jobResult.meta?.last_row_id as number;
      } else {
        // Paid: job INSERT is statement 0
        const jobResult = batchResults[0];
        jobId = jobResult.meta?.last_row_id as number;
      }

      if (!jobId) throw new Error('No job ID returned from INSERT');

      // Link credit_spend to the job (now that we have the jobId).
      // Uses batch for atomicity + fallback lookup if last_row_id unavailable.
      if (mintType === 'free') {
        let spendId = creditSpendId;

        // Fallback: if last_row_id wasn't returned, find by wallet + mint_id=0
        if (!spendId) {
          const fallback = await env.DB.prepare(
            'SELECT id FROM credit_spends WHERE wallet_address = ? AND mint_id = 0 ORDER BY id DESC LIMIT 1'
          ).bind(wallet).first<{ id: number }>();
          spendId = fallback?.id ?? null;
        }

        if (spendId) {
          try {
            await env.DB.batch([
              env.DB.prepare('UPDATE credit_spends SET mint_id = ? WHERE id = ?').bind(jobId, spendId),
              env.DB.prepare('UPDATE mint_jobs SET credit_spend_id = ? WHERE id = ?').bind(spendId, jobId),
            ]);
            creditSpendId = spendId;
          } catch (linkErr) {
            // Linking failed — credit_spends row exists with mint_id=0.
            // handleJobFailure and cleanup op 5 both have fallbacks for this.
            console.error('[Mint Submit] Credit-spend linking failed:', linkErr);
          }
        }
      }

    } catch (err: unknown) {
      // UNIQUE constraint on wallet_lock = per-wallet mutex rejection
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('UNIQUE') && errMsg.includes('wallet_lock')) {
        // Batch is atomic — if wallet_lock UNIQUE failed, credit deduction
        // was also rolled back. No manual refund needed.
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

    // ── Store image in KV (2 hour TTL — matches free mint expiry) ──
    await env.MINT_JOBS_KV.put(`job-image:${jobId}`, imageBase64, { expirationTtl: 7200 });

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
    // Log to audit trail for admin visibility
    try {
      const errMsg = error instanceof Error ? error.message : String(error);
      await logMintStep(env.DB, {
        mint_id: 0,
        step: 'submit_failed',
        status: 'failed',
        error: errMsg,
        data: { wallet: wallet, mint_type: mintType },
      });
    } catch {
      // Audit failure must not break response
    }
    return errorResponse('Internal server error', 500);
  }
};
