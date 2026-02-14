/**
 * IPFS Upload — shared logic for uploading image + metadata to Pinata.
 *
 * Extracted from upload.ts to eliminate self-fetch anti-pattern.
 * Can be called directly from prepare.ts without an HTTP round-trip.
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

/** Validate WebP magic bytes: RIFF at offset 0, WEBP at offset 8 */
function isValidWebP(buffer: Uint8Array): boolean {
  if (buffer.length < 12) return false;
  return (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // RIFF
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50   // WEBP
  );
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
 */
export async function uploadToIPFS(
  imageBase64: string,
  metadata: Record<string, unknown>,
  pinataJwt: string
): Promise<IPFSUploadResult> {
  const imageBytes = base64ToUint8Array(imageBase64);
  if (!isValidWebP(imageBytes)) {
    throw new Error('Invalid image format: expected WebP');
  }
  if (imageBytes.length > 2 * 1024 * 1024) {
    throw new Error('Image too large (max 2MB)');
  }

  const dataHash = await sha256Hex(imageBytes);
  const form = new FormData();
  form.append('file', new Blob([imageBytes], { type: 'image/webp' }), 'image.webp');

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
  // Multiple gateway URLs for redundancy
  const metadataUris = [
    `ipfs://${metaIpfsHash}`,
    `https://gateway.pinata.cloud/ipfs/${metaIpfsHash}`,
    `https://ipfs.io/ipfs/${metaIpfsHash}`,
  ];

  return { dataHash, dataUris, metadataHash, metadataUris };
}
