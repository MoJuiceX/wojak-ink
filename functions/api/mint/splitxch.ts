// SplitXCH integration (https://splitxch.com)
// API: POST https://splitxch.com/api/compute/fast — recipients[] with address + points.
// Recipient points must sum to 9,850; API adds 150 bp (1.5%) fee → 10,000 total. See:
// https://github.com/Koba42Corp/splitxch-builder (API Integration section).
// One API call per new creator, cached in DB forever.

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

export async function getOrCreateSplitterAddress(
  env: Env,
  creatorWallet: string,
  wave: number = 1,
): Promise<string> {
  console.warn(`[SplitXCH] Looking up splitter for ${creatorWallet.slice(0, 15)}... wave=${wave}`);

  // Check cache first
  const cached = await env.DB.prepare(
    'SELECT splitter_address FROM splitter_addresses WHERE creator_wallet = ? AND wave = ?'
  ).bind(creatorWallet, wave).first<{ splitter_address: string }>();

  if (cached?.splitter_address) {
    console.warn(`[SplitXCH] Cache hit: ${cached.splitter_address}`);
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
      { address: creatorWallet, points: config.creatorPoints },
      { address: treasuryAddress, points: config.treasuryPoints },
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
  };

  // Cache in DB
  await env.DB.prepare(`
    INSERT INTO splitter_addresses (creator_wallet, wave, splitter_address, splitxch_id, creator_points, treasury_points)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    creatorWallet, wave, data.address, data.id,
    config.creatorPoints, config.treasuryPoints
  ).run();

  console.warn(`[SplitXCH] Created splitter for ${creatorWallet.slice(0, 15)}...: ${data.address}`);
  return data.address;
}
