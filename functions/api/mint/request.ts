/**
 * MintGarden Dynamic Minting API — internal, called by prepare
 *
 * API: POST https://api.mintgarden.io/mint/dynamic
 * Docs: https://mintgarden.io/minting-api
 *
 * Request body (relevant fields):
 * - profile_id: MintGarden creator profile (DID).
 * - metadata: data_hash, data_uris, metadata_hash, metadata_uris, edition_number, edition_total.
 * - target_address: Chia (XCH) address that receives the NFT (or the offer is for).
 * - royalty_address: Chia address that receives royalties on secondary sales. We set this to the
 *   minter's wallet (Sage-connected) so the creator gets royalties.
 * - royalty_percentage: e.g. 10 (percent). From env PHASE2_ROYALTY_PCT.
 * - requested_mojos: (paid only) payment amount in mojos; API returns an offer file.
 *
 * Flow:
 * - Free: target_address only → NFT minted directly to that address; response includes launcher/coin ID.
 * - Paid: target_address + requested_mojos → API returns offer file; user accepts in wallet to complete mint.
 */

const MINTGARDEN_DYNAMIC_URL = 'https://api.mintgarden.io/mint/dynamic';
const MAX_RETRIES = 3;

/** 1 XCH = 10^12 mojos */
const MOJOS_PER_XCH = 1_000_000_000_000;

export interface MintRequestParams {
  walletAddress: string;
  mintType: 'paid' | 'free';
  ipfsImageUris: string[];
  ipfsMetadataUris: string[];
  imageHash: string;
  metadataHash: string;
  priceXch?: number;
  collectionUuid: string;
  editionNumber: number;
  editionTotal: number;
}

export interface MintRequestResult {
  offerFile?: string | null;
  launcherId?: string | null;
}

export interface MintGardenEnv {
  MINTGARDEN_API_KEY?: string;
  PHASE2_PROFILE_ID?: string;
  PHASE2_ROYALTY_ADDRESS?: string;
  PHASE2_ROYALTY_PCT?: string;
}

/** Response from MintGarden /mint/dynamic (Crate uses nft_coin_id, offer) */
interface MintGardenDynamicResponse {
  offer_file?: string | null;
  offer?: string | null;
  coin_id?: string | null;
  nft_coin_id?: string | null;
  launcher_id?: string | null;
  nft_id?: string | null;
  error?: string;
  message?: string;
}

function parseResponse(data: MintGardenDynamicResponse): MintRequestResult {
  const launcherId =
    data.launcher_id ??
    data.nft_coin_id ??
    data.coin_id ??
    data.nft_id ??
    null;
  const offerFile = data.offer_file ?? data.offer ?? null;
  return {
    offerFile: typeof offerFile === 'string' ? offerFile : null,
    launcherId: typeof launcherId === 'string' ? launcherId : null,
  };
}

/**
 * Call MintGarden Dynamic Minting API (with retries).
 * - Free: target_address only → mints to wallet, returns launcherId.
 * - Paid: target_address + requested_mojos → returns offer file for user to accept.
 * Retries up to MAX_RETRIES with exponential backoff (aligned with Crate queue_airdrop).
 */
export async function callMintGardenMint(
  params: MintRequestParams,
  env: MintGardenEnv
): Promise<MintRequestResult> {
  const apiKey = env.MINTGARDEN_API_KEY;
  const profileId = env.PHASE2_PROFILE_ID;
  const royaltyPct = env.PHASE2_ROYALTY_PCT;

  if (!apiKey || !profileId) {
    throw new Error('MintGarden configuration missing: MINTGARDEN_API_KEY and PHASE2_PROFILE_ID are required');
  }

  const body: Record<string, unknown> = {
    profile_id: profileId,
    metadata: {
      data_hash: params.imageHash,
      data_uris: params.ipfsImageUris.filter(Boolean),
      metadata_hash: params.metadataHash,
      metadata_uris: params.ipfsMetadataUris.filter(Boolean),
      edition_number: params.editionNumber,
      edition_total: params.editionTotal,
    },
    target_address: params.walletAddress,
    royalty_address: params.walletAddress,
    royalty_percentage: parseInt(royaltyPct ?? '10', 10) || 10,
  };

  if (params.mintType === 'paid' && params.priceXch != null && params.priceXch > 0) {
    body.requested_mojos = Math.round(params.priceXch * MOJOS_PER_XCH);
  }

  let lastError: string | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(MINTGARDEN_DYNAMIC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let data: MintGardenDynamicResponse = {};
      try {
        data = JSON.parse(text) as MintGardenDynamicResponse;
      } catch {
        console.error('[MintGarden] Non-JSON response:', text?.slice(0, 200));
        lastError = 'Invalid JSON response';
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
          continue;
        }
        return { offerFile: null, launcherId: null };
      }

      if (!res.ok) {
        console.error('[MintGarden] API error:', res.status, data.error ?? data.message ?? text);
        lastError = data.error ?? data.message ?? text ?? `HTTP ${res.status}`;
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
          continue;
        }
        return { offerFile: null, launcherId: null };
      }

      return parseResponse(data);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error('[MintGarden] Request failed:', lastError);
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  }

  console.error('[MintGarden] All retries exhausted:', lastError);
  return { offerFile: null, launcherId: null };
}
