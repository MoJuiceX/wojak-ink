/**
 * IPFS Upload API — internal, called by prepare
 *
 * POST body: { imageBase64: string, metadata: object }
 *
 * 1. Decode base64 → WebP buffer, SHA256 → data_hash
 * 2. Upload image to Pinata pinFileToIPFS
 * 3. SHA256 of metadata JSON → metadata_hash
 * 4. Upload metadata to Pinata pinJSONToIPFS
 *
 * Returns: { dataHash, dataUris, metadataHash, metadataUris }
 *
 * Requires: PINATA_JWT secret
 */

interface Env {
  PINATA_JWT?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const PINATA_PIN_FILE = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const PINATA_PIN_JSON = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const buffer = data instanceof Uint8Array ? data.buffer : data;
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
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

  const jwt = env.PINATA_JWT;
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'IPFS upload not configured' }), {
      status: 503,
      headers: corsHeaders,
    });
  }

  let body: { imageBase64?: string; metadata?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const imageBase64 = body.imageBase64;
  const metadata = body.metadata;

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing imageBase64' }), {
      status: 400,
      headers: corsHeaders,
    });
  }
  if (!metadata || typeof metadata !== 'object') {
    return new Response(JSON.stringify({ error: 'Missing metadata object' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    const imageBytes = base64ToUint8Array(imageBase64);
    if (imageBytes.length > 2 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Image too large (max 2MB)' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const dataHash = await sha256Hex(imageBytes);
    const form = new FormData();
    form.append('file', new Blob([imageBytes], { type: 'image/webp' }), 'image.webp');

    const pinFileRes = await fetch(PINATA_PIN_FILE, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}` },
      body: form,
    });
    if (!pinFileRes.ok) {
      const err = await pinFileRes.text();
      console.error('[Mint Upload] Pinata file error:', pinFileRes.status, err);
      return new Response(JSON.stringify({ error: 'IPFS image upload failed' }), {
        status: 502,
        headers: corsHeaders,
      });
    }
    const pinFileData = (await pinFileRes.json()) as { IpfsHash?: string };
    const ipfsHash = pinFileData.IpfsHash;
    if (!ipfsHash) {
      return new Response(JSON.stringify({ error: 'IPFS image upload: no hash returned' }), {
        status: 502,
        headers: corsHeaders,
      });
    }
    // Multiple gateway URLs for redundancy
    const dataUris = [
      `ipfs://${ipfsHash}`,
      `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      `https://ipfs.io/ipfs/${ipfsHash}`,
    ];

    const metadataStr = JSON.stringify(metadata);
    const metadataBytes = new TextEncoder().encode(metadataStr);
    const metadataHash = await sha256Hex(metadataBytes);

    const pinJsonRes = await fetch(PINATA_PIN_JSON, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      body: metadataStr,
    });
    if (!pinJsonRes.ok) {
      const err = await pinJsonRes.text();
      console.error('[Mint Upload] Pinata JSON error:', pinJsonRes.status, err);
      return new Response(JSON.stringify({ error: 'IPFS metadata upload failed' }), {
        status: 502,
        headers: corsHeaders,
      });
    }
    const pinJsonData = (await pinJsonRes.json()) as { IpfsHash?: string };
    const metaIpfsHash = pinJsonData.IpfsHash;
    if (!metaIpfsHash) {
      return new Response(JSON.stringify({ error: 'IPFS metadata upload: no hash returned' }), {
        status: 502,
        headers: corsHeaders,
      });
    }
    // Multiple gateway URLs for redundancy
    const metadataUris = [
      `ipfs://${metaIpfsHash}`,
      `https://gateway.pinata.cloud/ipfs/${metaIpfsHash}`,
      `https://ipfs.io/ipfs/${metaIpfsHash}`,
    ];

    return new Response(
      JSON.stringify({
        dataHash,
        dataUris,
        metadataHash,
        metadataUris,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Mint Upload] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
