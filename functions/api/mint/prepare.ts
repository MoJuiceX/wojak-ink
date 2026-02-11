/**
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
 * Validates layers/colors, uploads to IPFS, calls MintGarden via request.ts (paid/free),
 * creates pending (paid) or completes mint (free).
 */

import { callMintGardenMint } from './request';

interface Env {
  DB: D1Database;
  PINATA_JWT?: string;
  PHASE2_COLLECTION_UUID?: string;
  PHASE2_PROFILE_ID?: string;
  PHASE2_ROYALTY_ADDRESS?: string;
  PHASE2_ROYALTY_PCT?: string;
  MINTGARDEN_API_KEY?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const SUPPLY_TOTAL = 4200;
const FREE_MINT_CREDITS = 10000; // 100 credits in x100 units
const BASE_PRICE_XCH = 0.2;
const SURCHARGE_BASE = 0.2;
const SURCHARGE_USES_DIVISOR = 20;
const OFFER_EXPIRY_MINUTES = 15;

const VALID_LAYER_NAMES = new Set([
  'Background', 'Base', 'Clothes', 'FacialHair', 'MouthBase', 'MouthItem', 'Mask', 'Eyes', 'Head',
]);

function isValidHex(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

function surchargeXch(usageCount: number): number {
  return SURCHARGE_BASE * Math.log(1 + usageCount / SURCHARGE_USES_DIVISOR);
}

interface PrepareBody {
  walletAddress?: string;
  selectedLayers?: Record<string, string>;
  selectedColors?: Record<string, string>;
  imageBase64?: string;
  mintType?: 'paid' | 'free';
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Service not configured' }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  let body: PrepareBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const wallet = body.walletAddress;
  const selectedLayers = body.selectedLayers || {};
  const selectedColors = body.selectedColors || {};
  const imageBase64 = body.imageBase64;
  const mintType = body.mintType === 'paid' ? 'paid' : 'free';
  const collectionUuid = env.PHASE2_COLLECTION_UUID || 'USER_PROVIDES_UUID';

  if (!wallet || !wallet.startsWith('xch1')) {
    return new Response(JSON.stringify({ error: 'Missing or invalid walletAddress' }), {
      status: 400,
      headers: corsHeaders,
    });
  }
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing imageBase64' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  for (const layer of Object.keys(selectedLayers)) {
    if (!VALID_LAYER_NAMES.has(layer)) {
      return new Response(JSON.stringify({ error: `Invalid layer: ${layer}` }), {
        status: 400,
        headers: corsHeaders,
      });
    }
  }
  for (const [layer, color] of Object.entries(selectedColors)) {
    if (color && !isValidHex(color)) {
      return new Response(JSON.stringify({ error: `Invalid color for ${layer}: ${color}` }), {
        status: 400,
        headers: corsHeaders,
      });
    }
  }

  try {
    await env.DB.prepare(
      `UPDATE phase2_mints SET status = 'expired'
       WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < datetime('now')`
    ).run();

    const existingPending = await env.DB.prepare(
      `SELECT id, offer_file, expires_at, created_at FROM phase2_mints
       WHERE wallet_address = ? AND status = 'pending' AND (expires_at IS NULL OR expires_at > datetime('now'))`
    )
      .bind(wallet)
      .first<{ id: number; offer_file: string | null; expires_at: string | null; created_at: string }>();

    if (existingPending) {
      return new Response(
        JSON.stringify({
          pending: true,
          mintId: existingPending.id,
          offerFile: existingPending.offer_file,
          expiresAt: existingPending.expires_at,
          createdAt: existingPending.created_at,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    const supplyRow = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM phase2_mints WHERE status = 'minted'"
    ).first<{ count: number }>();
    const mintedCount = supplyRow?.count ?? 0;
    if (mintedCount >= SUPPLY_TOTAL) {
      return new Response(JSON.stringify({ error: 'Sold out', supply: { minted: mintedCount, total: SUPPLY_TOTAL } }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (mintType === 'free') {
      const balanceRow = await env.DB.prepare(
        `SELECT
          (SELECT COALESCE(SUM(credits_earned), 0) FROM credit_events WHERE wallet_address = ?) -
          (SELECT COALESCE(SUM(credits_spent), 0) FROM credit_spends WHERE wallet_address = ?) AS balance`
      )
        .bind(wallet, wallet)
        .first<{ balance: number }>();
      const balance = balanceRow?.balance ?? 0;
      if (balance < FREE_MINT_CREDITS) {
        return new Response(JSON.stringify({ error: 'Insufficient credits', balance: balance / 100 }), {
          status: 400,
          headers: corsHeaders,
        });
      }
    }

    const layersJson = JSON.stringify(selectedLayers);
    const colorsJson = JSON.stringify(selectedColors);

    const metadata = {
      format: 'CHIP-0007',
      name: `Your Wojak #${mintedCount + 1}`,
      description: 'A custom Wojak created on wojak.ink',
      sensitive_content: false,
      collection: { name: 'Your Wojak', id: collectionUuid },
      attributes: [
        ...Object.entries(selectedLayers).map(([trait_type, value]) => ({
          trait_type,
          value: value.split('/').pop()?.replace(/\.png$/, '') || value,
        })),
        ...Object.entries(selectedColors).filter(([, v]) => v).map(([trait_type, value]) => ({
          trait_type: `${trait_type} Color`,
          value,
        })),
      ],
    };

    const uploadUrl = new URL('/api/mint/upload', request.url).toString();
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, metadata }),
    });
    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({ error: 'Upload failed' }));
      return new Response(JSON.stringify(err), {
        status: uploadRes.status,
        headers: corsHeaders,
      });
    }
    const uploadData = (await uploadRes.json()) as {
      dataHash: string;
      dataUris: string[];
      metadataHash: string;
      metadataUris: string[];
    };

    const ipfsImageUri = uploadData.dataUris[0] ?? null;
    const ipfsMetadataUri = uploadData.metadataUris[0] ?? null;

    if (mintType === 'free') {
      const mintResult = await callMintGardenMint(
        {
          walletAddress: wallet,
          mintType: 'free',
          ipfsImageUri: ipfsImageUri ?? '',
          ipfsMetadataUri: ipfsMetadataUri ?? '',
          imageHash: uploadData.dataHash,
          metadataHash: uploadData.metadataHash,
          collectionUuid: env.PHASE2_COLLECTION_UUID || '',
        },
        env
      );
      const launcherId = mintResult.launcherId ?? null;

      const nextNumRow = await env.DB.prepare(
        "SELECT COALESCE(MAX(mint_number), 0) + 1 AS next_num FROM phase2_mints WHERE status = 'minted'"
      ).first<{ next_num: number }>();
      const mintNumber = nextNumRow?.next_num ?? 1;

      await env.DB.prepare(
        `INSERT INTO credit_spends (wallet_address, mint_id, credits_spent) VALUES (?, ?, ?)`
      )
        .bind(wallet, mintNumber, FREE_MINT_CREDITS)
        .run();

      await env.DB.prepare(
        `INSERT INTO phase2_mints (
          mint_number, wallet_address, layers_json, colors_json,
          ipfs_image_uri, ipfs_metadata_uri, image_hash, metadata_hash,
          mint_type, total_price_xch, status, minted_at, mintgarden_launcher_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'free', NULL, 'minted', datetime('now'), ?)`
      )
        .bind(
          mintNumber,
          wallet,
          layersJson,
          colorsJson,
          ipfsImageUri,
          ipfsMetadataUri,
          uploadData.dataHash,
          uploadData.metadataHash,
          launcherId
        )
        .run();

      for (const [category, path] of Object.entries(selectedLayers)) {
        if (!path) continue;
        const traitName = path.split('/').pop()?.replace(/\.(png|webp)$/i, '') || path;
        await env.DB.prepare(
          `INSERT INTO trait_usage (trait_category, trait_name, usage_count, updated_at)
           VALUES (?, ?, 1, datetime('now'))
           ON CONFLICT(trait_category, trait_name) DO UPDATE SET
             usage_count = usage_count + 1,
             updated_at = datetime('now')`
        )
          .bind(category, traitName)
          .run();
      }

      const mintgardenUrl = launcherId ? `https://mintgarden.io/nfts/${launcherId}` : null;
      return new Response(
        JSON.stringify({
          success: true,
          mintType: 'free',
          mintNumber,
          launcherId,
          mintgardenUrl,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    const traitRows = await env.DB.prepare('SELECT trait_category, trait_name, usage_count FROM trait_usage').all<{
      trait_category: string;
      trait_name: string;
      usage_count: number;
    }>();
    const usageMap = new Map<string, number>();
    for (const r of traitRows.results || []) {
      usageMap.set(`${r.trait_category}_${r.trait_name}`, r.usage_count);
    }
    let maxSurcharge = 0;
    let highestTrait: string | null = null;
    for (const [layer, path] of Object.entries(selectedLayers)) {
      if (!path) continue;
      const traitName = path.split('/').pop()?.replace(/\.(png|webp)$/i, '') || path;
      const usage = usageMap.get(`${layer}_${traitName}`) ?? 0;
      const surcharge = surchargeXch(usage);
      if (surcharge > maxSurcharge) {
        maxSurcharge = surcharge;
        highestTrait = `${layer}_${traitName}`;
      }
    }
    const totalPriceXch = BASE_PRICE_XCH + maxSurcharge;
    const totalPriceStored = Math.round(totalPriceXch * 100000);
    const surchargeStored = Math.round(maxSurcharge * 100000);
    const expiresAt = new Date(Date.now() + OFFER_EXPIRY_MINUTES * 60 * 1000).toISOString();

    const mintResult = await callMintGardenMint(
      {
        walletAddress: wallet,
        mintType: 'paid',
        ipfsImageUri: ipfsImageUri ?? '',
        ipfsMetadataUri: ipfsMetadataUri ?? '',
        imageHash: uploadData.dataHash,
        metadataHash: uploadData.metadataHash,
        priceXch: totalPriceXch,
        collectionUuid,
      },
      env
    );
    const offerFile = mintResult.offerFile ?? null;

    const insert = await env.DB.prepare(
      `INSERT INTO phase2_mints (
        wallet_address, layers_json, colors_json,
        ipfs_image_uri, ipfs_metadata_uri, image_hash, metadata_hash,
        mint_type, total_price_xch, trait_surcharge_xch, highest_surcharge_trait,
        offer_file, status, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?, 'pending', ?)`
    )
      .bind(
        wallet,
        layersJson,
        colorsJson,
        ipfsImageUri,
        ipfsMetadataUri,
        uploadData.dataHash,
        uploadData.metadataHash,
        totalPriceStored,
        surchargeStored,
        highestTrait,
        offerFile,
        expiresAt
      )
      .run();

    const mintId = insert.meta?.last_row_id ?? 0;

    const message = offerFile
      ? 'Accept the offer in your wallet before it expires.'
      : 'MintGarden offer not created (check API key and env). You can try free mint or try again later.';
    return new Response(
      JSON.stringify({
        pending: true,
        mintId: Number(mintId),
        offerFile,
        expiresAt,
        totalPriceXch: Math.round(totalPriceXch * 1000) / 1000,
        message,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Mint Prepare] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
