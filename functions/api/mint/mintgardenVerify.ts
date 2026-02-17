/**
 * MintGarden Verification — shared by cleanup.ts and confirm-payment.ts
 *
 * Consolidates detectLauncherByWallet and verifyLauncherOnChain with
 * proper AbortController timeouts to prevent hanging fetches.
 */

const VERIFY_TIMEOUT_MS = 10_000; // 10s timeout for MintGarden verification calls

/** MintGarden NFT item shape (subset of fields we need) */
export interface MintGardenNftItem {
  id?: string;
  encoded_id?: string;
  data?: {
    edition_number?: number;
    metadata_json?: {
      edition?: number;
      edition_number?: number;
      name?: string;
    };
  };
  owner_address?: { encoded_id?: string };
}

/**
 * Fetch with AbortController timeout.
 */
async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = VERIFY_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Verify a known launcherId on MintGarden.
 * Returns the verified launcherId, or null if not found/mismatch.
 * Returns null on network errors (does not throw).
 */
export async function verifyLauncherOnChain(
  launcherId: string,
  expectedWallet: string
): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(`https://api.mintgarden.io/nfts/${launcherId}`);
    if (!res.ok) return null;

    const nftData = await res.json() as { owner_address?: { encoded_id?: string } };
    const onChainOwner = nftData?.owner_address?.encoded_id;
    if (onChainOwner && onChainOwner.toLowerCase() !== expectedWallet.toLowerCase()) {
      return null; // Owner mismatch
    }
    return launcherId;
  } catch {
    return null;
  }
}

/**
 * Auto-detect the NFT for a mint by querying MintGarden for
 * NFTs owned by this wallet, matching by edition_number or name.
 * Returns the launcherId if found, or null.
 * Returns null on network errors (does not throw).
 */
export async function detectLauncherByWallet(
  walletAddress: string,
  mintNumber: number,
  collectionUuid: string
): Promise<string | null> {
  try {
    let url = `https://api.mintgarden.io/address/${walletAddress}/nfts?type=owned`;
    if (collectionUuid) {
      url += `&collection_id=${collectionUuid}`;
    }

    const res = await fetchWithTimeout(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'wojak.ink/1.0' },
    });
    if (!res.ok) return null;

    const data = await res.json() as { items?: MintGardenNftItem[] };
    const items = data.items || [];

    for (const item of items) {
      const editionNumber =
        item.data?.edition_number ??
        item.data?.metadata_json?.edition_number ??
        item.data?.metadata_json?.edition;

      if (editionNumber === mintNumber) {
        return item.encoded_id || item.id || null;
      }

      const name = item.data?.metadata_json?.name;
      if (name && name === `Your Wojak #${mintNumber}`) {
        return item.encoded_id || item.id || null;
      }
    }

    return null;
  } catch {
    return null;
  }
}
