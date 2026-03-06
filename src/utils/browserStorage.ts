export function getBrowserStorage(): Storage | null {
  const storage = globalThis.localStorage;

  if (!storage) return null;
  if (typeof storage.getItem !== 'function') return null;
  if (typeof storage.setItem !== 'function') return null;
  if (typeof storage.removeItem !== 'function') return null;

  return storage;
}
