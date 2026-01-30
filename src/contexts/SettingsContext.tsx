/* eslint-disable react-refresh/only-export-components */
/**
 * Settings Context
 *
 * Global settings state provider with persistence, system preference
 * detection, and theme/motion application.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import type {
  SettingsState,
  SettingsContextValue,
  SettingsThemeId,
  ResolvedTheme,
  MotionPreference,
  AppSettings,
} from '@/types/settings';

// Inline defaults (previously from settingsThemes.ts)
const DEFAULT_SETTINGS: SettingsState = {
  theme: {
    selected: 'tang-orange',
    resolved: 'tang-orange',
    systemPreference: 'dark',
  },
  audio: {
    masterEnabled: true,
    masterVolume: 0.7,
    backgroundMusicEnabled: true,
    backgroundMusicVolume: 0.5,
    soundEffectsEnabled: true,
    soundEffectsVolume: 0.8,
    muteOnFocusLoss: false,
    fadeOnPause: true,
  },
  motion: {
    preference: 'system',
    reducedMotion: false,
  },
  app: {
    compactMode: false,
    showTooltips: true,
    confirmBeforeClose: false,
    autoSave: true,
    developerMode: false,
    analyticsEnabled: true,
    skipBootSequence: false,
  },
};

// Hardcoded theme (dark/orange only)
const THEME_CONFIG = { isDark: true, id: 'tang-orange' };
const getTheme = (themeId?: string) => { void themeId; return THEME_CONFIG; };
const isValidThemeId = (themeId?: string) => { void themeId; return true; };
const THEME_TRANSITION_DURATION = 300;

const STORAGE_KEY = 'wojak-settings';

// Create context
const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

// ============ System Preference Hooks ============

function getSystemColorScheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getSystemReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ============ Storage Utilities ============

function loadSettings(): SettingsState {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        theme: {
          ...DEFAULT_SETTINGS.theme,
          ...parsed.theme,
          systemPreference: getSystemColorScheme(),
        },
        motion: {
          ...DEFAULT_SETTINGS.motion,
          ...parsed.motion,
        },
      };
    }
  } catch {
    // Invalid JSON, use defaults
  }

  return {
    ...DEFAULT_SETTINGS,
    theme: {
      ...DEFAULT_SETTINGS.theme,
      systemPreference: getSystemColorScheme(),
    },
  };
}

function saveSettings(settings: SettingsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage unavailable
  }
}

// ============ DOM Application Utilities ============

function applyThemeToDOM(themeId: ResolvedTheme, enableTransition: boolean): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const theme = getTheme(themeId);

  // Add transition class if enabled and reduced motion is not preferred
  const prefersReduced = getSystemReducedMotion();
  if (enableTransition && !prefersReduced) {
    root.classList.add('theme-transitioning');
  }

  // Apply theme attributes
  root.setAttribute('data-theme', themeId);

  // Set color-scheme for native elements
  root.style.colorScheme = theme.isDark ? 'dark' : 'light';

  // Remove transition class after animation
  if (enableTransition && !prefersReduced) {
    setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, THEME_TRANSITION_DURATION);
  }
}

function applyMotionPreferenceToDOM(reduced: boolean): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-reduced-motion', String(reduced));
}

// ============ Screen Reader Announcement ============

function announceToScreenReader(message: string): void {
  if (typeof document === 'undefined') return;

  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.style.cssText =
    'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';
  announcement.textContent = message;
  document.body.appendChild(announcement);
  setTimeout(() => announcement.remove(), 1000);
}

// ============ Provider Component ============

interface SettingsProviderProps {
  children: React.ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<SettingsState>(loadSettings);
  const isInitialMount = useRef(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ============ Resolve Theme ============
  // Always tang-orange (dark mode only)

  const resolvedTheme = useMemo<ResolvedTheme>(() => {
    return 'tang-orange';
  }, []);

  // ============ Resolve Motion ============

  const resolvedMotion = useMemo(() => {
    const systemReduced = getSystemReducedMotion();
    switch (settings.motion.preference) {
      case 'system':
        return systemReduced;
      case 'reduced':
        return true;
      case 'full':
        return false;
      default:
        return systemReduced;
    }
  }, [settings.motion.preference]);

  // ============ Apply Theme to DOM ============

  useEffect(() => {
    const enableTransition = !isInitialMount.current;
    applyThemeToDOM(resolvedTheme, enableTransition);
    isInitialMount.current = false;
  }, [resolvedTheme]);

  // ============ Apply Motion to DOM ============

  useEffect(() => {
    applyMotionPreferenceToDOM(resolvedMotion);

    // Update settings state with resolved motion
    queueMicrotask(() => {
      setSettings((prev) => ({
        ...prev,
        motion: {
          ...prev.motion,
          reducedMotion: resolvedMotion,
        },
      }));
    });
  }, [resolvedMotion]);

  // ============ System Preference Listeners ============

  useEffect(() => {
    const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleColorSchemeChange = (e: MediaQueryListEvent) => {
      const newPref = e.matches ? 'dark' : 'light';
      setSettings((prev) => ({
        ...prev,
        theme: {
          ...prev.theme,
          systemPreference: newPref,
        },
      }));
    };

    const handleMotionChange = () => {
      // Re-trigger the motion resolution
      setSettings((prev) => ({ ...prev }));
    };

    colorSchemeQuery.addEventListener('change', handleColorSchemeChange);
    motionQuery.addEventListener('change', handleMotionChange);

    return () => {
      colorSchemeQuery.removeEventListener('change', handleColorSchemeChange);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  // ============ Debounced Persistence ============

  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveSettings(settings);
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [settings]);

  // ============ Theme Actions ============

  const setTheme = useCallback((themeId: SettingsThemeId) => {
    // Add transition class
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('theme-transitioning');
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, THEME_TRANSITION_DURATION);
    }

    setSettings((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        selected: themeId,
      },
    }));

    const themeName = themeId === 'system' ? 'System' : themeId;
    announceToScreenReader(`Theme changed to ${themeName}`);
  }, []);

  // ============ Audio Actions ============

  const setMasterVolume = useCallback((volume: number) => {
    setSettings((prev) => ({
      ...prev,
      audio: {
        ...prev.audio,
        masterVolume: Math.max(0, Math.min(1, volume)),
      },
    }));
  }, []);

  const toggleMasterAudio = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      audio: {
        ...prev.audio,
        masterEnabled: !prev.audio.masterEnabled,
      },
    }));
  }, []);

  const setBackgroundMusicVolume = useCallback((volume: number) => {
    setSettings((prev) => ({
      ...prev,
      audio: {
        ...prev.audio,
        backgroundMusicVolume: Math.max(0, Math.min(1, volume)),
      },
    }));
  }, []);

  const toggleBackgroundMusic = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      audio: {
        ...prev.audio,
        backgroundMusicEnabled: !prev.audio.backgroundMusicEnabled,
      },
    }));
  }, []);

  const setSoundEffectsVolume = useCallback((volume: number) => {
    setSettings((prev) => ({
      ...prev,
      audio: {
        ...prev.audio,
        soundEffectsVolume: Math.max(0, Math.min(1, volume)),
      },
    }));
  }, []);

  const toggleSoundEffects = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      audio: {
        ...prev.audio,
        soundEffectsEnabled: !prev.audio.soundEffectsEnabled,
      },
    }));
  }, []);

  // ============ Motion Actions ============

  const setMotionPreference = useCallback((pref: MotionPreference) => {
    setSettings((prev) => ({
      ...prev,
      motion: {
        ...prev.motion,
        preference: pref,
      },
    }));

    const prefLabel =
      pref === 'system' ? 'System' : pref === 'reduced' ? 'Reduced' : 'Full';
    announceToScreenReader(`Motion preference changed to ${prefLabel}`);
  }, []);

  // ============ App Settings Actions ============

  const updateAppSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings((prev) => ({
      ...prev,
      app: {
        ...prev.app,
        ...updates,
      },
    }));
  }, []);

  // ============ Bulk Actions ============

  const resetToDefaults = useCallback(() => {
    setSettings({
      ...DEFAULT_SETTINGS,
      theme: {
        ...DEFAULT_SETTINGS.theme,
        systemPreference: getSystemColorScheme(),
      },
    });
    announceToScreenReader('Settings reset to defaults');
  }, []);

  const exportSettings = useCallback(() => {
    return JSON.stringify(settings, null, 2);
  }, [settings]);

  const importSettings = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json);

      // Validate theme
      if (
        parsed.theme?.selected &&
        parsed.theme.selected !== 'system' &&
        !isValidThemeId(parsed.theme.selected)
      ) {
        return false;
      }

      setSettings((prev) => ({
        ...DEFAULT_SETTINGS,
        ...parsed,
        theme: {
          ...DEFAULT_SETTINGS.theme,
          ...parsed.theme,
          systemPreference: prev.theme.systemPreference,
        },
        motion: {
          ...DEFAULT_SETTINGS.motion,
          ...parsed.motion,
        },
      }));

      announceToScreenReader('Settings imported successfully');
      return true;
    } catch {
      return false;
    }
  }, []);

  // ============ Context Value ============

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings: {
        ...settings,
        theme: {
          ...settings.theme,
          resolved: resolvedTheme,
        },
        motion: {
          ...settings.motion,
          reducedMotion: resolvedMotion,
        },
      },
      setTheme,
      setMasterVolume,
      toggleMasterAudio,
      setBackgroundMusicVolume,
      toggleBackgroundMusic,
      setSoundEffectsVolume,
      toggleSoundEffects,
      setMotionPreference,
      updateAppSettings,
      resetToDefaults,
      exportSettings,
      importSettings,
    }),
    [
      settings,
      resolvedTheme,
      resolvedMotion,
      setTheme,
      setMasterVolume,
      toggleMasterAudio,
      setBackgroundMusicVolume,
      toggleBackgroundMusic,
      setSoundEffectsVolume,
      toggleSoundEffects,
      setMotionPreference,
      updateAppSettings,
      resetToDefaults,
      exportSettings,
      importSettings,
    ]
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

// ============ Hook ============

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);

  if (context === undefined) {
    throw new Error(
      'useSettings must be used within a SettingsProvider. ' +
        'Wrap your app in <SettingsProvider> to use this hook.'
    );
  }

  return context;
}

export default SettingsProvider;
