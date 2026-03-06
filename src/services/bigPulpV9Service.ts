/**
 * BigPulp V9 dataset loader
 *
 * The V9 payload is large (~4.4 MB). Keep it fully lazy and shared so the
 * BigPulp route shell does not download it until a user actually requests
 * an analysis.
 */

export interface BigPulpNFTData {
  edition: number;
  name: string;
  open_rarity_rank: number;
  hp_count: number;
  image_ipfs: string;
  launcher_id: string;
  mintgarden_url: string;
  traits: Record<string, string>;
  hp_traits: string[];
  named_combos: string[];
  cultures: string[];
  is_five_hp: boolean;
  description: string;
  is_homie_edition?: boolean;
  homie_name?: string;
}

let nftDataMapCache: Record<string, BigPulpNFTData> | null = null;
let nftDataMapPromise: Promise<Record<string, BigPulpNFTData>> | null = null;

export async function loadBigPulpV9Data(): Promise<Record<string, BigPulpNFTData>> {
  if (nftDataMapCache) return nftDataMapCache;
  if (!nftDataMapPromise) {
    nftDataMapPromise = fetch('/assets/BigPulp/bigPv9/big_pulp_v9_output.json')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to load big_pulp_v9_output.json: ${res.status}`);
        }
        const data = await res.json() as Record<string, BigPulpNFTData>;
        nftDataMapCache = data;
        return data;
      })
      .catch((error) => {
        nftDataMapPromise = null;
        throw error;
      });
  }

  return nftDataMapPromise;
}

export async function getBigPulpV9Entry(id: number | string): Promise<BigPulpNFTData | undefined> {
  const data = await loadBigPulpV9Data();
  return data[String(id)];
}

export function clearBigPulpV9Cache(): void {
  nftDataMapCache = null;
  nftDataMapPromise = null;
}
