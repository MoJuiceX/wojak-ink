import type { UILayerName } from '@/lib/layerRegistry';
import { pathContains } from '@/lib/pathHelpers';

interface TraitWithPath {
  g1Path?: string;
}

export function isExtraAccessoryPath(path: string | undefined | null): boolean {
  if (!path) return false;
  return pathContains(path, '/extra/') || pathContains(path, 'extra_hand') || pathContains(path, 'extra_wings');
}

export function isWingsExtraPath(path: string | undefined | null): boolean {
  if (!path) return false;
  return pathContains(path, 'extra_wings');
}

export function filterRandomizableTraitsForLayer<T extends TraitWithPath>(
  layer: UILayerName,
  traits: readonly T[],
): T[] {
  if (layer !== 'Mask') return [...traits];
  return traits.filter((trait) => !isExtraAccessoryPath(trait.g1Path));
}
