/**
 * Layer Asset Base URL — single source of truth.
 *
 * Local dev / legacy: '/assets/wojak-layers' (default, served by Vite from public/)
 * Cloudflare R2:      'https://layers.wojak.ink' (production after migration)
 *
 * Set VITE_LAYER_BASE_URL in .env.local to override.
 * When using an absolute external base in local dev, route it through the Vite
 * proxy to avoid browser-side CORS failures on the layer manifests.
 */
const rawLayerBase = (import.meta.env.VITE_LAYER_BASE_URL || '/assets/wojak-layers').replace(/\/$/, '');
const isAbsoluteLayerBase = /^https?:\/\//i.test(rawLayerBase);
const shouldUseDevLayerProxy =
  import.meta.env.DEV &&
  !import.meta.env.VITEST &&
  isAbsoluteLayerBase;

export const LAYER_BASE =
  shouldUseDevLayerProxy ? '/__layer_proxy' : rawLayerBase;

/** G2 (YourWojak colorable layers) base path */
export const G2_LAYER_BASE = `${LAYER_BASE}/YourWojak-layers`;

/** Coin logos base path (Astronaut patches, detail selectors) */
export const COIN_LOGOS_BASE = `${LAYER_BASE}/CHIA_coin_logos`;

/** Mask assets base path */
export const MASK_LAYER_BASE = `${LAYER_BASE}/MASK`;
