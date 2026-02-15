/**
 * IPFS Upload — shared logic for uploading image + metadata to Pinata.
 *
 * Extracted from upload.ts to eliminate self-fetch anti-pattern.
 * Can be called directly from process.ts without an HTTP round-trip.
 */

const PINATA_PIN_FILE = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const PINATA_PIN_JSON = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const buffer = data instanceof Uint8Array ? data.buffer : data;
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Validate PNG magic bytes: 0x89 P N G at offset 0 */
function isValidPNG(buffer: Uint8Array): boolean {
  if (buffer.length < 8) return false;
  return (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 && // .PNG
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A   // \r\n\x1a\n
  );
}

/**
 * Generate redundant IPFS URIs for an IPFS CID.
 * Order: ipfs:// native, dedicated Pinata gateway (if provided), public gateways.
 * The dedicated gateway is prioritized because it's faster and more reliable.
 */
export function generateIPFSUris(ipfsCid: string, pinataGateway?: string): string[] {
  const uris: string[] = [`ipfs://${ipfsCid}`];
  if (pinataGateway) {
    const gw = pinataGateway.replace(/\/$/, '');
    uris.push(`https://${gw}/ipfs/${ipfsCid}`);
  }
  uris.push(`https://gateway.pinata.cloud/ipfs/${ipfsCid}`);
  uris.push(`https://ipfs.io/ipfs/${ipfsCid}`);
  return uris;
}

/**
 * Unpin a CID from Pinata. Used by cleanup to remove orphaned pins.
 * Returns true if unpinned or already gone (404). Returns false on error.
 */
export async function unpinFromIPFS(ipfsCid: string, pinataJwt: string): Promise<boolean> {
  if (!ipfsCid || !pinataJwt) return false;
  try {
    const response = await fetch(`https://api.pinata.cloud/pinning/unpin/${ipfsCid}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${pinataJwt}` },
    });
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}

/**
 * Extract IPFS CID from a URI (ipfs:// or gateway URL).
 * Returns null if the URI doesn't contain a recognizable CID.
 */
export function extractCidFromUri(uri: string): string | null {
  if (!uri) return null;
  if (uri.startsWith('ipfs://')) return uri.replace('ipfs://', '');
  const match = uri.match(/\/ipfs\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

export interface IPFSUploadResult {
  dataHash: string;
  dataUris: string[];
  metadataHash: string;
  metadataUris: string[];
}

/**
 * Upload image + metadata JSON to Pinata IPFS.
 * Returns hashes and multiple gateway URIs for redundancy.
 * Throws on failure — caller must handle errors.
 *
 * @param pinataGateway - Dedicated Pinata gateway hostname (e.g. "gold-important-gibbon-467.mypinata.cloud").
 *                        If provided, included as the second URI for faster resolution.
 *                        NFT URIs are IMMUTABLE once minted — always pass this in production.
 */
export async function uploadToIPFS(
  imageBase64: string,
  metadata: Record<string, unknown>,
  pinataJwt: string,
  pinataGateway?: string
): Promise<IPFSUploadResult> {
  const imageBytes = base64ToUint8Array(imageBase64);
  if (!isValidPNG(imageBytes)) {
    throw new Error('Invalid image format: expected PNG');
  }
  if (imageBytes.length > 5 * 1024 * 1024) {
    throw new Error('Image too large (max 5MB)');
  }

  const dataHash = await sha256Hex(imageBytes);
  const form = new FormData();
  form.append('file', new Blob([imageBytes], { type: 'image/png' }), 'image.png');

  const pinFileRes = await fetch(PINATA_PIN_FILE, {
    method: 'POST',
    headers: { Authorization: `Bearer ${pinataJwt}` },
    body: form,
  });
  if (!pinFileRes.ok) {
    const err = await pinFileRes.text();
    console.error('[IPFS Upload] Pinata file error:', pinFileRes.status, err);
    throw new Error(`IPFS image upload failed: HTTP ${pinFileRes.status}`);
  }
  const pinFileData = (await pinFileRes.json()) as { IpfsHash?: string };
  const ipfsHash = pinFileData.IpfsHash;
  if (!ipfsHash) {
    throw new Error('IPFS image upload: no hash returned');
  }
  const dataUris = generateIPFSUris(ipfsHash, pinataGateway);

  const metadataStr = JSON.stringify(metadata);
  const metadataBytes = new TextEncoder().encode(metadataStr);
  const metadataHash = await sha256Hex(metadataBytes);

  const pinJsonRes = await fetch(PINATA_PIN_JSON, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pinataJwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pinataContent: metadata }),
  });
  if (!pinJsonRes.ok) {
    const err = await pinJsonRes.text();
    console.error('[IPFS Upload] Pinata JSON error:', pinJsonRes.status, err);
    throw new Error(`IPFS metadata upload failed: HTTP ${pinJsonRes.status}`);
  }
  const pinJsonData = (await pinJsonRes.json()) as { IpfsHash?: string };
  const metaIpfsHash = pinJsonData.IpfsHash;
  if (!metaIpfsHash) {
    throw new Error('IPFS metadata upload: no hash returned');
  }
  const metadataUris = generateIPFSUris(metaIpfsHash, pinataGateway);

  return { dataHash, dataUris, metadataHash, metadataUris };
}
