/**
 * Safe localStorage wrapper
 *
 * Prevents crashes in Safari private browsing and when quota is exceeded.
 * All methods are no-op safe — they never throw.
 */

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      console.warn(`[safeStorage] Failed to read key: ${key}`);
      return null;
    }
  },

  setItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      console.warn(`[safeStorage] Failed to write key: ${key}`);
      return false;
    }
  },

  removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      console.warn(`[safeStorage] Failed to remove key: ${key}`);
      return false;
    }
  },

  getJSON<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      console.warn(`[safeStorage] Failed to parse key: ${key}`);
      return fallback;
    }
  },

  setJSON(key: string, value: unknown): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      console.warn(`[safeStorage] Failed to write JSON key: ${key}`);
      return false;
    }
  },
};
