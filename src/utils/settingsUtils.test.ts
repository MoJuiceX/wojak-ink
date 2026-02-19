// src/utils/settingsUtils.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadSettings,
  saveSettings,
  applyTheme,
  type AppSettings,
  type ThemeMode,
} from './settingsUtils';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock document.documentElement
const mockClassList = {
  add: vi.fn(),
  remove: vi.fn(),
};
const mockStyle: Record<string, string> = {};
Object.defineProperty(global, 'document', {
  value: {
    documentElement: {
      classList: mockClassList,
      style: mockStyle,
    },
  },
  writable: true,
});

describe('settingsUtils', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('loadSettings', () => {
    it('returns default settings when localStorage is empty', () => {
      const settings = loadSettings();
      expect(settings.backgroundMusic).toBe(true);
      expect(settings.soundEffects).toBe(true);
      expect(settings.theme).toBe('dark');
    });

    it('returns stored settings when they exist', () => {
      const customSettings: AppSettings = {
        backgroundMusic: false,
        soundEffects: false,
        theme: 'orange',
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(customSettings));

      const settings = loadSettings();
      expect(settings.backgroundMusic).toBe(false);
      expect(settings.soundEffects).toBe(false);
      expect(settings.theme).toBe('orange');
    });

    it('merges stored settings with defaults (partial override)', () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ theme: 'light' }));
      const settings = loadSettings();
      expect(settings.theme).toBe('light');
      // defaults preserved for missing keys
      expect(settings.backgroundMusic).toBe(true);
      expect(settings.soundEffects).toBe(true);
    });

    it('returns default settings on malformed JSON', () => {
      localStorageMock.getItem.mockReturnValueOnce('not-valid-json{{{');
      const settings = loadSettings();
      expect(settings.theme).toBe('dark');
      expect(settings.backgroundMusic).toBe(true);
    });

    it('returns default settings when localStorage throws', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Storage unavailable');
      });
      const settings = loadSettings();
      expect(settings).toMatchObject({ theme: 'dark', backgroundMusic: true, soundEffects: true });
    });
  });

  describe('saveSettings', () => {
    it('saves settings to localStorage', () => {
      const settings: AppSettings = {
        backgroundMusic: false,
        soundEffects: true,
        theme: 'green',
      };
      saveSettings(settings);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('saves valid JSON', () => {
      const settings: AppSettings = {
        backgroundMusic: true,
        soundEffects: true,
        theme: 'dark',
      };
      saveSettings(settings);
      const [, value] = localStorageMock.setItem.mock.calls[0];
      expect(() => JSON.parse(value)).not.toThrow();
      const parsed = JSON.parse(value);
      expect(parsed.theme).toBe('dark');
    });

    it('saves all three settings fields', () => {
      const settings: AppSettings = {
        backgroundMusic: false,
        soundEffects: false,
        theme: 'orange',
      };
      saveSettings(settings);
      const [, value] = localStorageMock.setItem.mock.calls[0];
      const parsed = JSON.parse(value);
      expect(parsed).toHaveProperty('backgroundMusic');
      expect(parsed).toHaveProperty('soundEffects');
      expect(parsed).toHaveProperty('theme');
    });

    it('does not throw when localStorage is unavailable', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });
      expect(() => saveSettings({ backgroundMusic: true, soundEffects: true, theme: 'dark' })).not.toThrow();
    });

    it('can round-trip save and load', () => {
      const settings: AppSettings = {
        backgroundMusic: false,
        soundEffects: true,
        theme: 'light',
      };
      saveSettings(settings);
      const [, saved] = localStorageMock.setItem.mock.calls[0];
      localStorageMock.getItem.mockReturnValueOnce(saved);
      const loaded = loadSettings();
      expect(loaded.backgroundMusic).toBe(false);
      expect(loaded.theme).toBe('light');
    });
  });

  describe('applyTheme', () => {
    it('adds theme-dark class for dark theme', () => {
      applyTheme('dark');
      expect(mockClassList.add).toHaveBeenCalledWith('theme-dark');
    });

    it('adds theme-light class for light theme', () => {
      applyTheme('light');
      expect(mockClassList.add).toHaveBeenCalledWith('theme-light');
    });

    it('adds theme-orange class for orange theme', () => {
      applyTheme('orange');
      expect(mockClassList.add).toHaveBeenCalledWith('theme-orange');
    });

    it('adds theme-green class for green theme', () => {
      applyTheme('green');
      expect(mockClassList.add).toHaveBeenCalledWith('theme-green');
    });

    it('removes all theme classes before adding new one', () => {
      applyTheme('dark');
      expect(mockClassList.remove).toHaveBeenCalledWith(
        'theme-light', 'theme-dark', 'theme-orange', 'theme-green'
      );
    });

    it('sets colorScheme to "light" for light theme', () => {
      applyTheme('light');
      expect(mockStyle.colorScheme).toBe('light');
    });

    it('sets colorScheme to "dark" for non-light themes', () => {
      applyTheme('dark');
      expect(mockStyle.colorScheme).toBe('dark');
      applyTheme('orange');
      expect(mockStyle.colorScheme).toBe('dark');
      applyTheme('green');
      expect(mockStyle.colorScheme).toBe('dark');
    });
  });

  describe('ThemeMode type', () => {
    it('accepts all valid theme values', () => {
      const themes: ThemeMode[] = ['light', 'dark', 'orange', 'green'];
      expect(themes).toHaveLength(4);
    });
  });
});
