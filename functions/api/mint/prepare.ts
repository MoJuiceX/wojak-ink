/**
 * Mint Prepare API — /api/mint/prepare
 *
 * POST (multipart/form-data)
 *
 * Single endpoint that handles the entire mint preparation:
 * 1. Assign sequential mint number
 * 2. Upload image to IPFS (Pinata)
 * 3. Generate CHIP-0007 metadata with mint number
 * 4. Upload metadata to IPFS (Pinata)
 * 5. SHA-256 hash both files
 * 6. Call MintGarden Dynamic Minting API
 * 7. Return offer file (paid) or confirm (free)
 *
 * Input (multipart/form-data):
 *   - image: WebP blob (max 2MB)
 *   - layers_json: JSON string of selected layers
 *   - colors_json: JSON string of selected colors
 *   - wallet: xch1... address
 *   - mint_type: "paid" | "free"
 *
 * Response (paid): { mint_id, mint_number, nft_name, offer_file, expires_at, total_price_xch }
 * Response (free): { mint_id, mint_number, nft_name, coin_id, status: "minted" }
 */

interface Env {
  DB: D1Database;
  TRADE_VALUES_KV: KVNamespace;
  PINATA_JWT: string;
  MINTGARDEN_API_KEY: string;
  PHASE2_COLLECTION_UUID: string;
  PHASE2_PROFILE_ID: string;
  PHASE2_ROYALTY_ADDRESS: string;
  PHASE2_ROYALTY_PCT: string;
  PINATA_GATEWAY: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

const BASE_PRICE_XCH = 0.2;
const MAX_SUPPLY = 4200;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const RATE_LIMIT_SECONDS = 60;
const FREE_MINT_COST = 10000; // 100 credits = 10000 stored units
const OFFER_DURATION_SECONDS = 900; // 15 minutes
const XCH_PER_MOJO = 1_000_000_000_000; // 1 XCH = 10^12 mojos

// Dynamic pricing categories (Base and Background are exempt)
const DYNAMIC_PRICING_CATEGORIES = ['Head', 'Eyes', 'Clothes', 'Mouth'];

const PINATA_FILE_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const PINATA_JSON_URL = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
const MINTGARDEN_MINT_URL = 'https://api.mintgarden.io/mint/dynamic';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/**
 * Validate WebP magic bytes: RIFF....WEBP
 */
function isValidWebP(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 12) return false;
  const view = new Uint8Array(buffer);
  // Bytes 0-3: "RIFF"
  const riff = String.fromCharCode(view[0], view[1], view[2], view[3]);
  // Bytes 8-11: "WEBP"
  const webp = String.fromCharCode(view[8], view[9], view[10], view[11]);
  return riff === 'RIFF' && webp === 'WEBP';
}

/**
 * SHA-256 hash of an ArrayBuffer, returned as hex string.
 */
async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Calculate surcharge using logarithmic formula.
 */
function calculateSurcharge(usageCount: number): number {
  if (usageCount <= 0) return 0;
  const surcharge = 0.2 * Math.log(1 + usageCount / 20);
  return Math.round(surcharge * 100000) / 100000;
}

/**
 * Expire stale pending mints.
 */
async function expireStalePendingMints(db: D1Database): Promise<void> {
  try {
    await db
      .prepare(
        `UPDATE phase2_mints
         SET status = 'expired'
         WHERE status = 'pending'
         AND expires_at IS NOT NULL
         AND expires_at < datetime('now')`
      )
      .run();
  } catch (error) {
    console.error('[Mint Prepare] Error expiring stale mints:', error);
  }
}

/**
 * Upload image file to Pinata IPFS.
 * Returns { cid, size }.
 */
async function uploadImageToPinata(
  imageBytes: ArrayBuffer,
  fileName: string,
  jwt: string
): Promise<{ cid: string; size: number }> {
  const blob = new Blob([imageBytes], { type: 'image/webp' });
  const file = new File([blob], fileName, { type: 'image/webp' });

  const formData = new FormData();
  formData.append('file', file);
  formData.append(
    'pinataMetadata',
    JSON.stringify({ name: fileName })
  );
  formData.append(
    'pinataOptions',
    JSON.stringify({ cidVersion: 1 })
  );

  const response = await fetch(PINATA_FILE_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pinata file upload failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { IpfsHash: string; PinSize: number };
  return { cid: data.IpfsHash, size: data.PinSize };
}

/**
 * Upload JSON metadata to Pinata IPFS.
 * Returns { cid, size }.
 */
async function uploadMetadataToPinata(
  metadata: Record<string, unknown>,
  fileName: string,
  jwt: string
): Promise<{ cid: string; size: number }> {
  const response = await fetch(PINATA_JSON_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: { name: fileName },
      pinataOptions: { cidVersion: 1 },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pinata JSON upload failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { IpfsHash: string; PinSize: number };
  return { cid: data.IpfsHash, size: data.PinSize };
}

/**
 * Build CHIP-0007 compliant metadata.
 */
function buildMetadata(
  mintNumber: number,
  layers: Record<string, string>,
  colors: Record<string, string>,
  collectionUuid: string
): Record<string, unknown> {
  // Build attributes from layers
  const attributes: Array<{ trait_type: string; value: string }> = [];

  for (const [category, traitName] of Object.entries(layers)) {
    if (traitName && traitName !== 'none' && traitName !== '') {
      attributes.push({ trait_type: category, value: traitName });
    }
  }

  // Add color attributes
  for (const [category, colorValue] of Object.entries(colors)) {
    if (colorValue && colorValue !== '') {
      attributes.push({ trait_type: `${category} Color`, value: colorValue });
    }
  }

  const paddedNumber = String(mintNumber).padStart(4, '0');

  return {
    format: 'CHIP-0007',
    name: `Your Wojak #${paddedNumber}`,
    description:
      'A custom Wojak from the Your Wojak collection on wojak.ink — handcrafted and unique.',
    minting_tool: 'wojak.ink/generator',
    sensitive_content: false,
    series_number: mintNumber,
    series_total: MAX_SUPPLY,
    attributes,
    collection: {
      name: 'Your Wojak',
      id: collectionUuid,
      attributes: [
        {
          type: 'description',
          value:
            'Custom Wojak NFTs on Chia — handcrafted on wojak.ink',
        },
        { type: 'website', value: 'https://wojak.ink' },
        { type: 'twitter', value: 'wojakink' },
      ],
    },
  };
}

/**
 * Get the highest trait surcharge for a set of layers.
 * Returns { surchargeXch, traitKey }.
 */
async function getHighestSurcharge(
  db: D1Database,
  layers: Record<string, string>
): Promise<{ surchargeXch: number; traitKey: string | null }> {
  let highestSurcharge = 0;
  let highestTraitKey: string | null = null;

  for (const [category, traitName] of Object.entries(layers)) {
    if (!DYNAMIC_PRICING_CATEGORIES.includes(category)) continue;
    if (!traitName || traitName === 'none' || traitName === '') continue;

    const row = await db
      .prepare(
        'SELECT usage_count FROM trait_usage WHERE trait_category = ? AND trait_name = ?'
      )
      .bind(category, traitName)
      .first<{ usage_count: number }>();

    const usage = row?.usage_count || 0;
    const surcharge = calculateSurcharge(usage);

    if (surcharge > highestSurcharge) {
      highestSurcharge = surcharge;
      highestTraitKey = `${category}:${traitName}`;
    }
  }

  return { surchargeXch: highestSurcharge, traitKey: highestTraitKey };
}

// ──────────────────────────────────────────────
// Main handler
// ──────────────────────────────────────────────

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  // ── Validate env bindings ──
  const missingEnv: string[] = [];
  if (!env.DB) missingEnv.push('DB');
  if (!env.PINATA_JWT) missingEnv.push('PINATA_JWT');
  if (!env.MINTGARDEN_API_KEY) missingEnv.push('MINTGARDEN_API_KEY');
  if (!env.PHASE2_COLLECTION_UUID) missingEnv.push('PHASE2_COLLECTION_UUID');
  if (!env.PHASE2_PROFILE_ID) missingEnv.push('PHASE2_PROFILE_ID');
  if (!env.PHASE2_ROYALTY_ADDRESS) missingEnv.push('PHASE2_ROYALTY_ADDRESS');
  if (!env.PHASE2_ROYALTY_PCT) missingEnv.push('PHASE2_ROYALTY_PCT');

  if (missingEnv.length > 0) {
    console.error('[Mint Prepare] Missing env bindings:', missingEnv.join(', '));
    return new Response(
      JSON.stringify({ error: 'Minting service not fully configured' }),
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    // ── Parse multipart form data ──
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    const layersJsonStr = formData.get('layers_json') as string | null;
    const colorsJsonStr = formData.get('colors_json') as string | null;
    const wallet = formData.get('wallet') as string | null;
    const mintType = formData.get('mint_type') as string | null;

    // ── Validate inputs ──
    if (!wallet || !wallet.startsWith('xch1')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid wallet address (must start with xch1)' }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!mintType || !['paid', 'free'].includes(mintType)) {
      return new Response(
        JSON.stringify({ error: 'mint_type must be "paid" or "free"' }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!imageFile || imageFile.size === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing image file' }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (imageFile.size > MAX_IMAGE_SIZE) {
      return new Response(
        JSON.stringify({ error: `Image too large (max ${MAX_IMAGE_SIZE / 1024 / 1024}MB)` }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Read image bytes and validate WebP
    const imageBytes = await imageFile.arrayBuffer();
    if (!isValidWebP(imageBytes)) {
      return new Response(
        JSON.stringify({ error: 'Invalid image format — must be WebP' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Parse JSON fields
    let layers: Record<string, string>;
    let colors: Record<string, string>;
    try {
      layers = JSON.parse(layersJsonStr || '{}');
      colors = JSON.parse(colorsJsonStr || '{}');
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in layers_json or colors_json' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ── Rate limit (1 per wallet per 60s) ──
    if (env.TRADE_VALUES_KV) {
      const rateKey = `mint_rate:${wallet}`;
      const existing = await env.TRADE_VALUES_KV.get(rateKey);
      if (existing) {
        return new Response(
          JSON.stringify({ error: 'Please wait 60 seconds between mint attempts' }),
          { status: 429, headers: corsHeaders }
        );
      }
    }

    // ── Expire stale pending mints ──
    await expireStalePendingMints(env.DB);

    // ── Check supply ──
    const supplyResult = await env.DB
      .prepare(
        `SELECT COUNT(*) as total FROM phase2_mints WHERE status IN ('minted', 'pending')`
      )
      .first<{ total: number }>();

    if ((supplyResult?.total || 0) >= MAX_SUPPLY) {
      return new Response(
        JSON.stringify({ error: 'Sold out — all 4,200 Your Wojak mints are taken' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ── For free mints: verify credit balance ──
    if (mintType === 'free') {
      const earnedResult = await env.DB
        .prepare(
          'SELECT COALESCE(SUM(credits_earned), 0) as total FROM credit_events WHERE wallet_address = ?'
        )
        .bind(wallet)
        .first<{ total: number }>();

      const spentResult = await env.DB
        .prepare(
          'SELECT COALESCE(SUM(credits_spent), 0) as total FROM credit_spends WHERE wallet_address = ?'
        )
        .bind(wallet)
        .first<{ total: number }>();

      const balance = (earnedResult?.total || 0) - (spentResult?.total || 0);
      if (balance < FREE_MINT_COST) {
        return new Response(
          JSON.stringify({
            error: 'Insufficient credits for free mint (need 100 credits)',
            balance: balance / 100,
            required: 100,
          }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // ── Reserve mint number (atomic insert) ──
    const insertResult = await env.DB
      .prepare(
        `INSERT INTO phase2_mints (mint_number, wallet_address, layers_json, colors_json, mint_type, status)
         VALUES (
           (SELECT COALESCE(MAX(mint_number), 0) + 1 FROM phase2_mints),
           ?, ?, ?, ?, 'pending'
         )`
      )
      .bind(wallet, JSON.stringify(layers), JSON.stringify(colors), mintType)
      .run();

    // Get the inserted row
    const mintRow = await env.DB
      .prepare(
        `SELECT id, mint_number FROM phase2_mints
         WHERE wallet_address = ? AND status = 'pending'
         ORDER BY id DESC LIMIT 1`
      )
      .bind(wallet)
      .first<{ id: number; mint_number: number }>();

    if (!mintRow) {
      throw new Error('Failed to reserve mint number');
    }

    const { id: mintId, mint_number: mintNumber } = mintRow;
    const paddedNumber = String(mintNumber).padStart(4, '0');
    const nftName = `Your Wojak #${paddedNumber}`;

    console.log(`[Mint Prepare] Reserved #${paddedNumber} for ${wallet.slice(0, 12)}... (${mintType})`);

    // ── Upload image to Pinata ──
    const imageFileName = `your-wojak-${paddedNumber}.webp`;
    let imageCid: string;
    try {
      const imageResult = await uploadImageToPinata(imageBytes, imageFileName, env.PINATA_JWT);
      imageCid = imageResult.cid;
      console.log(`[Mint Prepare] Image uploaded: ipfs://${imageCid}`);
    } catch (error) {
      // Mark mint as failed if IPFS upload fails
      await env.DB.prepare('UPDATE phase2_mints SET status = ? WHERE id = ?').bind('failed', mintId).run();
      console.error('[Mint Prepare] Pinata image upload error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to upload image to IPFS. Please try again.' }),
        { status: 502, headers: corsHeaders }
      );
    }

    // ── SHA-256 hash the image ──
    const imageHash = await sha256Hex(imageBytes);

    // ── Generate CHIP-0007 metadata ──
    const metadata = buildMetadata(mintNumber, layers, colors, env.PHASE2_COLLECTION_UUID);

    // ── Upload metadata to Pinata ──
    const metadataFileName = `your-wojak-${paddedNumber}-metadata.json`;
    let metadataCid: string;
    try {
      const metaResult = await uploadMetadataToPinata(
        metadata,
        metadataFileName,
        env.PINATA_JWT
      );
      metadataCid = metaResult.cid;
      console.log(`[Mint Prepare] Metadata uploaded: ipfs://${metadataCid}`);
    } catch (error) {
      await env.DB.prepare('UPDATE phase2_mints SET status = ? WHERE id = ?').bind('failed', mintId).run();
      console.error('[Mint Prepare] Pinata metadata upload error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to upload metadata to IPFS. Please try again.' }),
        { status: 502, headers: corsHeaders }
      );
    }

    // ── SHA-256 hash the metadata ──
    const metadataString = JSON.stringify(metadata);
    const metadataBytes = new TextEncoder().encode(metadataString);
    const metadataHash = await sha256Hex(metadataBytes.buffer);

    // ── Update D1 row with IPFS data ──
    await env.DB
      .prepare(
        `UPDATE phase2_mints
         SET ipfs_image_uri = ?, ipfs_metadata_uri = ?, image_hash = ?, metadata_hash = ?
         WHERE id = ?`
      )
      .bind(
        `ipfs://${imageCid}`,
        `ipfs://${metadataCid}`,
        imageHash,
        metadataHash,
        mintId
      )
      .run();

    // ── Calculate price (paid mints only) ──
    let totalPriceXch = 0;
    let surchargeXch = 0;
    let highestSurchargeTrait: string | null = null;
    let totalMojos = 0;

    if (mintType === 'paid') {
      const surchargeResult = await getHighestSurcharge(env.DB, layers);
      surchargeXch = surchargeResult.surchargeXch;
      highestSurchargeTrait = surchargeResult.traitKey;
      totalPriceXch = BASE_PRICE_XCH + surchargeXch;
      totalMojos = Math.round(totalPriceXch * XCH_PER_MOJO);

      // Store price in D1
      await env.DB
        .prepare(
          `UPDATE phase2_mints
           SET total_price_xch = ?, trait_surcharge_xch = ?, highest_surcharge_trait = ?
           WHERE id = ?`
        )
        .bind(
          Math.round(totalPriceXch * 100000),
          Math.round(surchargeXch * 100000),
          highestSurchargeTrait,
          mintId
        )
        .run();
    }

    // ── Call MintGarden Dynamic Minting API ──
    const mintgardenBody: Record<string, unknown> = {
      profile_id: env.PHASE2_PROFILE_ID,
      metadata: {
        data_hash: imageHash,
        data_uris: [`ipfs://${imageCid}`],
        metadata_hash: metadataHash,
        metadata_uris: [`ipfs://${metadataCid}`],
        edition_number: 1,
        edition_total: 1,
      },
      royalty_address: env.PHASE2_ROYALTY_ADDRESS,
      royalty_percentage: parseInt(env.PHASE2_ROYALTY_PCT, 10) || 5,
      target_address: wallet,
    };

    // Paid mints: add payment + expiration
    if (mintType === 'paid') {
      mintgardenBody.requested_mojos = totalMojos;
      mintgardenBody.reserve_for_seconds = OFFER_DURATION_SECONDS;
    }

    let mintgardenResponse: Response;
    try {
      mintgardenResponse = await fetch(MINTGARDEN_MINT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.MINTGARDEN_API_KEY}`,
        },
        body: JSON.stringify(mintgardenBody),
      });
    } catch (error) {
      await env.DB.prepare('UPDATE phase2_mints SET status = ? WHERE id = ?').bind('failed', mintId).run();
      console.error('[Mint Prepare] MintGarden API network error:', error);
      return new Response(
        JSON.stringify({
          error: 'MintGarden API unavailable. Please try again.',
          ipfs_image_uri: `ipfs://${imageCid}`,
          ipfs_metadata_uri: `ipfs://${metadataCid}`,
        }),
        { status: 502, headers: corsHeaders }
      );
    }

    if (!mintgardenResponse.ok) {
      const errorText = await mintgardenResponse.text();
      await env.DB.prepare('UPDATE phase2_mints SET status = ? WHERE id = ?').bind('failed', mintId).run();
      console.error(`[Mint Prepare] MintGarden API error (${mintgardenResponse.status}):`, errorText);
      return new Response(
        JSON.stringify({
          error: `MintGarden minting failed: ${mintgardenResponse.status}`,
          details: errorText,
        }),
        { status: 502, headers: corsHeaders }
      );
    }

    const mintgardenData = (await mintgardenResponse.json()) as Record<string, unknown>;

    // ── Handle paid mint response ──
    if (mintType === 'paid') {
      const offerFile = mintgardenData.offer as string | undefined;
      const launcherId = mintgardenData.launcher_id as string | undefined;

      if (!offerFile) {
        await env.DB.prepare('UPDATE phase2_mints SET status = ? WHERE id = ?').bind('failed', mintId).run();
        return new Response(
          JSON.stringify({ error: 'MintGarden did not return an offer file' }),
          { status: 502, headers: corsHeaders }
        );
      }

      const expiresAt = new Date(Date.now() + OFFER_DURATION_SECONDS * 1000).toISOString();

      await env.DB
        .prepare(
          `UPDATE phase2_mints
           SET offer_file = ?, mintgarden_launcher_id = ?, expires_at = ?, status = 'pending'
           WHERE id = ?`
        )
        .bind(offerFile, launcherId || null, expiresAt, mintId)
        .run();

      // Set rate limit
      if (env.TRADE_VALUES_KV) {
        await env.TRADE_VALUES_KV.put(`mint_rate:${wallet}`, '1', {
          expirationTtl: RATE_LIMIT_SECONDS,
        });
      }

      console.log(`[Mint Prepare] Paid mint #${paddedNumber} offer created for ${wallet.slice(0, 12)}... (${totalPriceXch} XCH)`);

      return new Response(
        JSON.stringify({
          mint_id: mintId,
          mint_number: mintNumber,
          nft_name: nftName,
          offer_file: offerFile,
          launcher_id: launcherId || null,
          expires_at: expiresAt,
          total_price_xch: totalPriceXch,
          base_price_xch: BASE_PRICE_XCH,
          surcharge_xch: surchargeXch,
          highest_surcharge_trait: highestSurchargeTrait,
          ipfs_image_uri: `ipfs://${imageCid}`,
          ipfs_metadata_uri: `ipfs://${metadataCid}`,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // ── Handle free mint response ──
    // Free mints go directly — NFT is minted to wallet immediately
    const coinId = mintgardenData.coin_id as string | undefined;

    // Atomic: deduct credits + finalize mint + increment trait usage
    const batchStatements: D1PreparedStatement[] = [];

    // 1. Deduct credits
    batchStatements.push(
      env.DB
        .prepare(
          'INSERT INTO credit_spends (wallet_address, mint_id, credits_spent) VALUES (?, ?, ?)'
        )
        .bind(wallet, mintId, FREE_MINT_COST)
    );

    // 2. Finalize mint status
    batchStatements.push(
      env.DB
        .prepare(
          `UPDATE phase2_mints
           SET status = 'minted', minted_at = datetime('now'),
               mintgarden_launcher_id = ?
           WHERE id = ?`
        )
        .bind(coinId || null, mintId)
    );

    // 3. Increment trait usage for all dynamic-priced traits
    for (const [category, traitName] of Object.entries(layers)) {
      if (!traitName || traitName === 'none' || traitName === '') continue;
      batchStatements.push(
        env.DB
          .prepare(
            `INSERT INTO trait_usage (trait_category, trait_name, usage_count, updated_at)
             VALUES (?, ?, 1, datetime('now'))
             ON CONFLICT(trait_category, trait_name)
             DO UPDATE SET usage_count = usage_count + 1, updated_at = datetime('now')`
          )
          .bind(category, traitName)
      );
    }

    await env.DB.batch(batchStatements);

    // Set rate limit
    if (env.TRADE_VALUES_KV) {
      await env.TRADE_VALUES_KV.put(`mint_rate:${wallet}`, '1', {
        expirationTtl: RATE_LIMIT_SECONDS,
      });
    }

    console.log(`[Mint Prepare] Free mint #${paddedNumber} completed for ${wallet.slice(0, 12)}...`);

    return new Response(
      JSON.stringify({
        mint_id: mintId,
        mint_number: mintNumber,
        nft_name: nftName,
        coin_id: coinId || null,
        status: 'minted',
        ipfs_image_uri: `ipfs://${imageCid}`,
        ipfs_metadata_uri: `ipfs://${metadataCid}`,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Mint Prepare] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
};
