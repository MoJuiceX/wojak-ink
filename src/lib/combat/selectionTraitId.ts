/**
 * Derive combat trait IDs from generator selection paths.
 *
 * Handles special background sentinels and normalizes G1 background filenames
 * so they map to TRAIT_COMBAT_MAP keys (e.g. Background_Everythings-Fine).
 */

const EXT_RE = /\.[^.]+$/;

function normalizeBackgroundSlug(raw: string): string {
  return raw
    .trim()
    .replace(/^BACKGROUND_/i, '')
    .replace(/['’`]/g, '')
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9.$-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Convert a selected layer path into a combat trait ID.
 *
 * Returns null for unsupported sentinel paths.
 */
export function deriveCombatTraitIdFromPath(layer: string, path: string): string | null {
  if (!path || typeof path !== 'string') return null;

  if (path.includes('__solid__')) {
    if (path.includes('__price_up__')) return 'Background_Price-Up';
    if (path.includes('__price_down__')) return 'Background_Price-Down';
    return 'Background_Solid-Color';
  }

  // Unknown virtual sentinel path
  if (path.startsWith('__')) return null;

  const parts = path.split('/');
  if (parts.length < 2) return null;

  const filename = parts[parts.length - 1].replace(EXT_RE, '');
  const folder = parts[parts.length - 2];
  if (!filename || !folder) return null;

  // G1 Background paths use folder "Scene"/"$CASHTAG". Normalize to Background_* IDs.
  if (layer === 'Background' || path.includes('/BACKGROUND/')) {
    const slug = normalizeBackgroundSlug(filename);
    return slug ? `Background_${slug}` : null;
  }

  // Existing fallback behavior for non-background layers
  return `${folder}_${filename}`;
}
