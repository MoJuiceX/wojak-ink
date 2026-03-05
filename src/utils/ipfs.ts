const DEFAULT_PINATA_GATEWAY_HOST = 'bronze-used-crow-589.mypinata.cloud';

const PUBLIC_IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
] as const;

const UNSTABLE_GATEWAY_MARKERS = ['.ipfs.w3s.link', '.web.link'] as const;

function parseGatewayHost(raw: string | undefined): string {
  if (!raw) return DEFAULT_PINATA_GATEWAY_HOST;
  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_PINATA_GATEWAY_HOST;

  try {
    const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    return parsed.hostname || DEFAULT_PINATA_GATEWAY_HOST;
  } catch {
    const cleaned = trimmed
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '')
      .trim();
    return cleaned || DEFAULT_PINATA_GATEWAY_HOST;
  }
}

function toCandidateList(rawValue: string): string[] {
  const raw = rawValue.trim();
  if (!raw) return [];

  if (!raw.startsWith('[')) {
    return [raw];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
    }
  } catch {
    // Fall through to raw string.
  }

  return [raw];
}

function isUnstableGateway(url: string): boolean {
  return UNSTABLE_GATEWAY_MARKERS.some(marker => url.includes(marker));
}

export function getPinataGatewayHost(): string {
  const configured = (import.meta.env.VITE_PINATA_GATEWAY as string | undefined);
  return parseGatewayHost(configured);
}

export function extractCidAndPath(input: string): { cid: string; path: string } | null {
  const value = input.trim();
  if (!value) return null;

  const ipfsMatch = value.match(/^ipfs:\/\/([^/?#]+)(\/[^?#]*)?/i);
  if (ipfsMatch) {
    return {
      cid: ipfsMatch[1],
      path: ipfsMatch[2] || '',
    };
  }

  try {
    const url = new URL(value);

    const pathStyle = url.pathname.match(/^\/ipfs\/([^/?#]+)(\/[^?#]*)?/i);
    if (pathStyle) {
      return {
        cid: pathStyle[1],
        path: pathStyle[2] || '',
      };
    }

    const hostParts = url.hostname.split('.');
    if (hostParts.length > 0) {
      const first = hostParts[0];
      const looksLikeCid = /^baf[a-z0-9]+$/i.test(first) || /^Qm[a-zA-Z0-9]+$/.test(first);
      if (looksLikeCid) {
        return {
          cid: first,
          path: url.pathname || '',
        };
      }
    }
  } catch {
    // Non-URL string.
  }

  return null;
}

export function buildGatewayUrls(cid: string, path: string = ''): string[] {
  const normalizedPath = path
    ? (path.startsWith('/') ? path : `/${path}`)
    : '';

  const urls: string[] = [];
  const seen = new Set<string>();
  const push = (url: string) => {
    if (seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  };

  push(`https://${getPinataGatewayHost()}/ipfs/${cid}${normalizedPath}`);
  for (const gateway of PUBLIC_IPFS_GATEWAYS) {
    push(`${gateway}${cid}${normalizedPath}`);
  }

  return urls;
}

export function buildIpfsUrlCandidates(rawValue: string | null | undefined): string[] {
  if (!rawValue) return [];

  const sources: string[] = [];
  const seen = new Set<string>();
  const push = (url: string) => {
    const cleaned = url.trim();
    if (!cleaned || seen.has(cleaned)) return;
    seen.add(cleaned);
    sources.push(cleaned);
  };

  for (const candidate of toCandidateList(rawValue)) {
    const ipfs = extractCidAndPath(candidate);
    if (!ipfs) {
      if (!isUnstableGateway(candidate)) {
        push(candidate);
      }
      continue;
    }

    for (const gatewayUrl of buildGatewayUrls(ipfs.cid, ipfs.path)) {
      push(gatewayUrl);
    }

    const keepOriginal = /^https?:\/\//i.test(candidate) && !isUnstableGateway(candidate);
    if (keepOriginal) {
      push(candidate);
    }
  }

  return sources;
}

export function getPreferredIpfsUrl(rawValue: string | null | undefined): string | null {
  const candidates = buildIpfsUrlCandidates(rawValue);
  return candidates[0] || null;
}

export function getWojakNftImageCandidates(
  nftId: string | number,
  collectionCid: string
): string[] {
  const paddedId = String(nftId).padStart(4, '0');
  return buildGatewayUrls(collectionCid, `/${paddedId}.png`);
}

export function getWojakNftImageUrl(
  nftId: string | number,
  collectionCid: string
): string {
  const candidates = getWojakNftImageCandidates(nftId, collectionCid);
  return candidates[0];
}
