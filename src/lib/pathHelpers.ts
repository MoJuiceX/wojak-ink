/**
 * Shared path-matching utilities used by rules engine and canvas renderer.
 */

/** Case-insensitive check whether `path` contains `identifier`. */
export function pathContains(path: string | undefined, identifier: string): boolean {
  if (!path) return false;
  return path.toLowerCase().includes(identifier.toLowerCase());
}
