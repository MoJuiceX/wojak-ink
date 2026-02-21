/**
 * IPFS Upload — uploads image + metadata to Filebase (S3-compatible IPFS pinning).
 *
 * Uses raw fetch + AWS Signature v4 signing (no SDK needed — works in Cloudflare Workers).
 * Filebase returns the IPFS CID in the `x-amz-meta-cid` response header.
 *
 * Previously used Pinata — switched because Pinata's free tier has a 500 file limit.
 * Filebase offers unlimited files / 5 GB free with automatic IPFS pinning.
 */

// ─── Filebase S3 config ───
const FILEBASE_HOST = 's3.filebase.com';
const FILEBASE_REGION = 'us-east-1';
const FILEBASE_SERVICE = 's3';

// ─── Helpers ───

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const buffer = data instanceof Uint8Array
    ? (data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer)
    : data;
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Raw(data: ArrayBuffer | Uint8Array): Promise<ArrayBuffer> {
  const buffer = data instanceof Uint8Array
    ? (data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer)
    : data;
  return crypto.subtle.digest('SHA-256', buffer);
}

/** Validate PNG magic bytes: 0x89 P N G at offset 0 */
function isValidPNG(buffer: Uint8Array): boolean {
  if (buffer.length < 8) return false;
  return (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
  );
}

// ─── IPFS URI generation ───

/**
 * Generate redundant IPFS URIs for an IPFS CID.
 * Order: HTTPS gateways first (for MintGarden/explorer compatibility), ipfs:// last.
 * MintGarden's proxy uses the first URI to display images and rejects ipfs:// protocol URIs.
 */
export function generateIPFSUris(ipfsCid: string, _pinataGateway?: string): string[] {
  const uris: string[] = [];
  // Filebase dedicated gateway (fastest for our pins)
  uris.push(`https://ipfs.filebase.io/ipfs/${ipfsCid}`);
  // Public IPFS gateways (redundancy)
  uris.push(`https://gateway.pinata.cloud/ipfs/${ipfsCid}`);
  uris.push(`https://ipfs.io/ipfs/${ipfsCid}`);
  // ipfs:// native URI last — for IPFS-native clients (wallets, pinning services)
  uris.push(`ipfs://${ipfsCid}`);
  return uris;
}

// ─── AWS Signature V4 (minimal implementation for Cloudflare Workers) ───

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
  const keyBuf = key instanceof Uint8Array
    ? (key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer)
    : key;
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBuf, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

async function getSignatureKey(
  secretKey: string, dateStamp: string, region: string, service: string
): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + secretKey), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}

interface S3PutParams {
  bucket: string;
  key: string;
  body: Uint8Array | string;
  contentType: string;
  accessKey: string;
  secretKey: string;
}

/**
 * Upload a file to Filebase via S3 PutObject.
 * Returns the IPFS CID from the x-amz-meta-cid response header.
 */
async function s3PutObject(params: S3PutParams): Promise<string> {
  const { bucket, key, body, contentType, accessKey, secretKey } = params;

  const bodyBytes = typeof body === 'string' ? new TextEncoder().encode(body) : body;
  const payloadHash = await sha256Hex(bodyBytes);

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const host = `${bucket}.${FILEBASE_HOST}`;
  const canonicalUri = `/${encodeURIComponent(key).replace(/%2F/g, '/')}`;

  const headers: Record<string, string> = {
    'host': host,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
    'content-type': contentType,
    'content-length': String(bodyBytes.length),
  };

  // Canonical headers (sorted by lowercase key)
  const sortedKeys = Object.keys(headers).sort();
  const canonicalHeaders = sortedKeys.map(k => `${k}:${headers[k]}\n`).join('');
  const signedHeaders = sortedKeys.join(';');

  const canonicalRequest = [
    'PUT', canonicalUri, '', // method, uri, query string (empty)
    canonicalHeaders, signedHeaders, payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${FILEBASE_REGION}/${FILEBASE_SERVICE}/aws4_request`;
  const canonicalRequestHash = await sha256Hex(new TextEncoder().encode(canonicalRequest));

  const stringToSign = [
    'AWS4-HMAC-SHA256', amzDate, credentialScope, canonicalRequestHash,
  ].join('\n');

  const signingKey = await getSignatureKey(secretKey, dateStamp, FILEBASE_REGION, FILEBASE_SERVICE);
  const signature = toHex(await hmacSha256(signingKey, stringToSign));

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`https://${host}${canonicalUri}`, {
    method: 'PUT',
    headers: {
      ...headers,
      'Authorization': authorization,
    },
    body: bodyBytes.buffer.slice(bodyBytes.byteOffset, bodyBytes.byteOffset + bodyBytes.byteLength) as ArrayBuffer,
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error(`[Filebase] S3 PutObject error for ${key}:`, response.status, errBody);
    throw new Error(`IPFS ${key.endsWith('.json') ? 'metadata' : 'image'} upload failed: HTTP ${response.status}`);
  }

  // Filebase returns the IPFS CID in x-amz-meta-cid header
  const cid = response.headers.get('x-amz-meta-cid');
  if (!cid) {
    throw new Error(`IPFS upload succeeded but no CID returned for ${key}`);
  }

  return cid;
}

/**
 * Delete an object from Filebase S3 (unpin from IPFS).
 * Used by cleanup to remove orphaned pins.
 * Returns true if deleted or already gone. Returns false on error.
 */
async function s3DeleteObject(
  bucket: string, key: string, accessKey: string, secretKey: string
): Promise<boolean> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const host = `${bucket}.${FILEBASE_HOST}`;
  const canonicalUri = `/${encodeURIComponent(key).replace(/%2F/g, '/')}`;
  // S3 DELETE with empty payload
  const payloadHash = await sha256Hex(new Uint8Array(0));

  const headers: Record<string, string> = {
    'host': host,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
  };

  const sortedKeys = Object.keys(headers).sort();
  const canonicalHeaders = sortedKeys.map(k => `${k}:${headers[k]}\n`).join('');
  const signedHeaders = sortedKeys.join(';');

  const canonicalRequest = [
    'DELETE', canonicalUri, '',
    canonicalHeaders, signedHeaders, payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${FILEBASE_REGION}/${FILEBASE_SERVICE}/aws4_request`;
  const canonicalRequestHash = await sha256Hex(new TextEncoder().encode(canonicalRequest));
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, canonicalRequestHash].join('\n');

  const signingKey = await getSignatureKey(secretKey, dateStamp, FILEBASE_REGION, FILEBASE_SERVICE);
  const signature = toHex(await hmacSha256(signingKey, stringToSign));
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  try {
    const response = await fetch(`https://${host}${canonicalUri}`, {
      method: 'DELETE',
      headers: { ...headers, 'Authorization': authorization },
    });
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}

// ─── Public API (backwards-compatible signatures) ───

/**
 * Unpin a CID from IPFS via Filebase S3 DeleteObject.
 * The CID is used as the S3 object key.
 *
 * Note: for backwards compat, first two params match old Pinata signature.
 * New callers should pass filebaseAccessKey, filebaseSecretKey, filebaseBucket.
 */
export async function unpinFromIPFS(
  ipfsCid: string,
  _pinataJwt: string, // kept for signature compat — unused
  filebaseAccessKey?: string,
  filebaseSecretKey?: string,
  filebaseBucket?: string,
): Promise<boolean> {
  if (!ipfsCid) return false;
  if (!filebaseAccessKey || !filebaseSecretKey || !filebaseBucket) {
    console.warn('[IPFS Unpin] Missing Filebase credentials, skipping unpin');
    return false;
  }
  // Try both possible keys: the CID itself, and common filenames
  const keys = [`${ipfsCid}.png`, `${ipfsCid}.json`, ipfsCid];
  for (const key of keys) {
    const result = await s3DeleteObject(filebaseBucket, key, filebaseAccessKey, filebaseSecretKey);
    if (result) return true;
  }
  return false;
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

export interface FilebaseCredentials {
  accessKey: string;
  secretKey: string;
  bucket: string;
}

/**
 * Upload image + metadata JSON to Filebase IPFS.
 * Returns hashes and multiple gateway URIs for redundancy.
 * Throws on failure — caller must handle errors.
 *
 * @param imageBase64 - Base64-encoded PNG image
 * @param metadata - JSON metadata object (CHIP-0007)
 * @param pinataJwt - DEPRECATED, kept for signature compat. Pass empty string.
 * @param pinataGateway - DEPRECATED, kept for signature compat.
 * @param filebase - Filebase S3 credentials (required for upload)
 */
export async function uploadToIPFS(
  imageBase64: string,
  metadata: Record<string, unknown>,
  pinataJwt: string,
  pinataGateway?: string,
  filebase?: FilebaseCredentials,
): Promise<IPFSUploadResult> {
  if (!filebase) {
    throw new Error('Filebase credentials required for IPFS upload');
  }

  const imageBytes = base64ToUint8Array(imageBase64);
  if (!isValidPNG(imageBytes)) {
    throw new Error('Invalid image format: expected PNG');
  }
  if (imageBytes.length > 5 * 1024 * 1024) {
    throw new Error('Image too large (max 5MB)');
  }

  const dataHash = await sha256Hex(imageBytes);

  // Upload image to Filebase (S3 PutObject)
  // Use dataHash as the key prefix for deduplication
  const imageKey = `${dataHash}.png`;
  const imageCid = await s3PutObject({
    bucket: filebase.bucket,
    key: imageKey,
    body: imageBytes,
    contentType: 'image/png',
    accessKey: filebase.accessKey,
    secretKey: filebase.secretKey,
  });
  const dataUris = generateIPFSUris(imageCid);

  // Upload metadata JSON
  const metadataStr = JSON.stringify(metadata);
  const metadataBytes = new TextEncoder().encode(metadataStr);
  const metadataHash = await sha256Hex(metadataBytes);

  const metaKey = `${metadataHash}.json`;
  const metaCid = await s3PutObject({
    bucket: filebase.bucket,
    key: metaKey,
    body: metadataStr,
    contentType: 'application/json',
    accessKey: filebase.accessKey,
    secretKey: filebase.secretKey,
  });
  const metadataUris = generateIPFSUris(metaCid);

  return { dataHash, dataUris, metadataHash, metadataUris };
}
