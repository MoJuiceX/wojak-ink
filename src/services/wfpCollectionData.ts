/**
 * Shared Wojak Farmers Plot collection data loaders.
 *
 * Use the smaller metadata-lite payload by default and fall back to the
 * legacy full metadata file if the lite asset is missing.
 */

export interface WfpTraitAttribute {
  trait_type: string;
  value: string;
}

export interface WfpMetadataLiteEntry {
  name: string;
  edition: number;
  date?: number;
  attributes: WfpTraitAttribute[];
}

export type WfpRarityEntry = [number, number, string, ...string[]];

const METADATA_LITE_URL = '/assets/nft-data/metadata-lite.json';
const METADATA_URL = '/assets/nft-data/metadata.json';
const RARITY_URL = '/assets/nft-data/rarity.json';

let metadataCache: WfpMetadataLiteEntry[] | null = null;
let metadataPromise: Promise<WfpMetadataLiteEntry[]> | null = null;
let metadataByEditionCache: Map<number, WfpMetadataLiteEntry> | null = null;
let metadataByBaseCache: Map<string, WfpMetadataLiteEntry[]> | null = null;

let rarityCache: Record<string, WfpRarityEntry> | null = null;
let rarityPromise: Promise<Record<string, WfpRarityEntry>> | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function loadWfpMetadataLite(): Promise<WfpMetadataLiteEntry[]> {
  if (metadataCache) return metadataCache;

  if (!metadataPromise) {
    metadataPromise = (async () => {
      try {
        const data = await fetchJson<WfpMetadataLiteEntry[]>(METADATA_LITE_URL);
        metadataCache = data;
        return data;
      } catch (liteError) {
        console.warn('[WFPMetadata] metadata-lite unavailable, falling back to metadata.json:', liteError);
        const fallback = await fetchJson<WfpMetadataLiteEntry[]>(METADATA_URL);
        metadataCache = fallback;
        return fallback;
      }
    })().catch((error) => {
      metadataPromise = null;
      throw error;
    });
  }

  return metadataPromise;
}

export async function loadWfpMetadataByEdition(): Promise<Map<number, WfpMetadataLiteEntry>> {
  if (metadataByEditionCache) return metadataByEditionCache;

  const metadata = await loadWfpMetadataLite();
  metadataByEditionCache = new Map(metadata.map((entry) => [entry.edition, entry]));
  return metadataByEditionCache;
}

export async function loadWfpMetadataByBase(): Promise<Map<string, WfpMetadataLiteEntry[]>> {
  if (metadataByBaseCache) return metadataByBaseCache;

  const metadata = await loadWfpMetadataLite();
  const grouped = new Map<string, WfpMetadataLiteEntry[]>();

  for (const entry of metadata) {
    const base = entry.attributes.find((attr) => attr.trait_type === 'Base')?.value;
    if (!base) continue;
    if (!grouped.has(base)) {
      grouped.set(base, []);
    }
    grouped.get(base)!.push(entry);
  }

  metadataByBaseCache = grouped;
  return grouped;
}

export async function loadWfpRarity(): Promise<Record<string, WfpRarityEntry>> {
  if (rarityCache) return rarityCache;
  if (!rarityPromise) {
    rarityPromise = fetchJson<Record<string, WfpRarityEntry>>(RARITY_URL)
      .then((data) => {
        rarityCache = data;
        return data;
      })
      .catch((error) => {
        rarityPromise = null;
        throw error;
      });
  }
  return rarityPromise;
}

export function clearWfpCollectionDataCache(): void {
  metadataCache = null;
  metadataPromise = null;
  metadataByEditionCache = null;
  metadataByBaseCache = null;
  rarityCache = null;
  rarityPromise = null;
}
