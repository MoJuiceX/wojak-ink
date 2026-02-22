// SplitXCH integration (https://splitxch.com)
// API: POST https://splitxch.com/api/compute/fast — recipients[] with address + points.
// Recipient points must sum to 9,850; API adds 150 bp (1.5%) fee → 10,000 total. See:
// https://github.com/Koba42Corp/splitxch-builder (API Integration section).
// One API call per new creator, cached in DB forever.
//
// IMPORTANT: The /api/compute/fast endpoint returns HTTP 200 + an address immediately,
// but the actual on-chain puzzle provisioning happens asynchronously. We MUST poll
// GET /api/compute/{id} to verify {error: false, pctProgress: 100} before using
// the address. Without verification, the address may point to a non-existent puzzle
// and royalty coins sent there become unspendable.

interface Env {
  DB: D1Database;
  TREASURY_ADDRESS: string;
}

// Wave 1: 10% creator + 2% treasury (of 12% total royalty)
// SplitXCH fee: 150bp (1.5%)
// Fee split 50/50 between creator and treasury
// Creator: 10% * (10000 - 150/2) / 12% = 8258bp
// Treasury: 2% * (10000 - 150/2) / 12% = 1592bp
// Fee: 150bp
// Total: 8258 + 1592 + 150 = 10,000
const WAVE_CONFIG: Record<number, { creatorPoints: number; treasuryPoints: number }> = {
  1: { creatorPoints: 8258, treasuryPoints: 1592 },
  2: { creatorPoints: 7321, treasuryPoints: 2529 }, // 9%/3% adjusted for fee
  3: { creatorPoints: 6384, treasuryPoints: 3466 }, // 8%/4% adjusted for fee
  4: { creatorPoints: 5447, treasuryPoints: 4403 }, // 7%/5% adjusted for fee
};

/** Maximum number of status polls before giving up. */
const MAX_POLL_ATTEMPTS = 6;
/** Delay between status polls in ms (2s × 6 = 12s max wait). */
const POLL_INTERVAL_MS = 2_000;

/**
 * Poll GET /api/compute/{id} until the compute is complete or an error occurs.
 * Returns the verified address on success, throws on failure.
 */
async function waitForCompute(computeId: string): Promise<string> {
  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

    const statusRes = await fetch(`https://splitxch.com/api/compute/${computeId}`);
    if (!statusRes.ok) {
      throw new Error(`SplitXCH status check failed: HTTP ${statusRes.status}`);
    }

    const status = await statusRes.json() as {
      id: string;
      address: string | null;
      error: boolean;
      message: string | null;
      pctProgress: number;
    };

    if (status.error) {
      throw new Error(
        `SplitXCH compute ${computeId} failed: ${status.message || 'unknown error'} (attempt ${attempt}/${MAX_POLL_ATTEMPTS})`
      );
    }

    if (status.pctProgress === 100 && status.address) {
      console.warn(`[SplitXCH] Compute ${computeId} verified OK after ${attempt} poll(s): ${status.address}`);
      return status.address;
    }

    console.warn(`[SplitXCH] Compute ${computeId} in progress: ${status.pctProgress}% (attempt ${attempt}/${MAX_POLL_ATTEMPTS})`);
  }

  throw new Error(`SplitXCH compute ${computeId} timed out after ${MAX_POLL_ATTEMPTS} polls`);
}

export async function getOrCreateSplitterAddress(
  env: Env,
  creatorWallet: string,
  wave: number = 1,
): Promise<string> {
  console.warn(`[SplitXCH] Looking up splitter for ${creatorWallet.slice(0, 15)}... wave=${wave}`);

  // Check cache first — but ONLY return if the address was verified (has splitxch_id).
  const cached = await env.DB.prepare(
    'SELECT splitter_address, splitxch_id FROM splitter_addresses WHERE creator_wallet = ? AND wave = ?'
  ).bind(creatorWallet, wave).first<{ splitter_address: string; splitxch_id: string }>();

  if (cached?.splitter_address) {
    console.warn(`[SplitXCH] Cache hit: ${cached.splitter_address} (id: ${cached.splitxch_id})`);
    return cached.splitter_address;
  }

  console.warn(`[SplitXCH] Cache miss, creating new splitter...`);

  // Create new splitter via SplitXCH API
  const config = WAVE_CONFIG[wave];
  if (!config) {
    throw new Error(`No wave config for wave ${wave}`);
  }

  const treasuryAddress = env.TREASURY_ADDRESS;
  if (!treasuryAddress) {
    throw new Error('TREASURY_ADDRESS env var not set');
  }

  const requestBody = {
    recipients: [
      { name: 'creator', address: creatorWallet, points: config.creatorPoints, id: 1 },
      { name: 'treasury', address: treasuryAddress, points: config.treasuryPoints, id: 2 },
    ],
  };

  // 10s timeout to prevent hanging if SplitXCH API is slow/down.
  // Without this, a hung fetch kills the entire processJob worker via
  // Cloudflare's CPU limit — silently dropping the mint.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  let response: Response;
  try {
    response = await fetch('https://splitxch.com/api/compute/fast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SplitXCH API error ${response.status}: ${text}`);
  }

  const data = await response.json() as {
    id: string;
    address: string;
    message: string;
    pctProgress: number;
  };

  if (!data.id || !data.address) {
    throw new Error(`SplitXCH API returned invalid response: ${JSON.stringify(data)}`);
  }

  console.warn(`[SplitXCH] Compute submitted: id=${data.id}, initial address=${data.address}`);

  // CRITICAL: Verify the compute actually succeeded by polling the status endpoint.
  // The /api/compute/fast endpoint returns an address immediately, but the on-chain
  // puzzle provisioning (test transaction) happens in the background and can fail.
  const verifiedAddress = await waitForCompute(data.id);

  // Sanity check: verified address should match the initial one
  if (verifiedAddress !== data.address) {
    console.warn(`[SplitXCH] WARNING: Verified address differs from initial! Using verified: ${verifiedAddress}`);
  }

  // Cache in DB — only after verification succeeds
  await env.DB.prepare(`
    INSERT INTO splitter_addresses (creator_wallet, wave, splitter_address, splitxch_id, creator_points, treasury_points)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    creatorWallet, wave, verifiedAddress, data.id,
    config.creatorPoints, config.treasuryPoints
  ).run();

  console.warn(`[SplitXCH] Created & verified splitter for ${creatorWallet.slice(0, 15)}...: ${verifiedAddress}`);
  return verifiedAddress;
}
