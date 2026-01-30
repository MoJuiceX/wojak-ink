/**
 * Settings System Types
 *
 * Comprehensive type definitions for the settings page including
 * audio controls, motion preferences, and app settings.
 */

// ============ Theme Types (simplified - dark/orange only) ============

export type ThemeId = 'tang-orange' | 'dark';
export type SettingsThemeId = ThemeId | 'system';
export type ResolvedTheme = ThemeId;

export interface ThemePreview {
  background: string;
  foreground: string;
  accent: string;
  gradient?: string;
}

export interface SettingsThemeConfig {
  id: SettingsThemeId;
  name: string;
  description: string;
  icon: string;
  preview: ThemePreview;
  hasGlow?: boolean;
  isSpecial?: boolean;
}

// ============ Audio Types ============

export interface AudioSettings {
  masterEnabled: boolean;
  masterVolume: number;
  backgroundMusicEnabled: boolean;
  backgroundMusicVolume: number;
  soundEffectsEnabled: boolean;
  soundEffectsVolume: number;
  muteOnFocusLoss: boolean;
  fadeOnPause: boolean;
}

// ============ Motion Preferences ============

export type MotionPreference = 'system' | 'reduced' | 'full';

export interface MotionSettings {
  preference: MotionPreference;
  reducedMotion: boolean;
}

// ============ App Settings ============

export interface AppSettings {
  compactMode: boolean;
  showTooltips: boolean;
  confirmBeforeClose: boolean;
  autoSave: boolean;
  developerMode: boolean;
  analyticsEnabled: boolean;
  skipBootSequence: boolean;
}

// ============ Combined Settings State ============

export interface SettingsState {
  theme: {
    selected: SettingsThemeId;
    resolved: ResolvedTheme;
    systemPreference: 'dark' | 'light';
  };
  audio: AudioSettings;
  motion: MotionSettings;
  app: AppSettings;
}

// ============ Settings Context ============

export interface SettingsContextValue {
  settings: SettingsState;

  // Theme
  setTheme: (themeId: SettingsThemeId) => void;

  // Audio
  setMasterVolume: (volume: number) => void;
  toggleMasterAudio: () => void;
  setBackgroundMusicVolume: (volume: number) => void;
  toggleBackgroundMusic: () => void;
  setSoundEffectsVolume: (volume: number) => void;
  toggleSoundEffects: () => void;

  // Motion
  setMotionPreference: (pref: MotionPreference) => void;

  // App
  updateAppSettings: (settings: Partial<AppSettings>) => void;

  // Bulk
  resetToDefaults: () => void;
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
}

// ============ Toast Types ============

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  type: ToastType;
  /** Main toast title */
  title?: string;
  /** Description/message text */
  message: string;
  /** Custom icon emoji */
  icon?: string;
  /** Auto-dismiss duration in ms (0 = no auto-dismiss) */
  duration?: number;
  /** Optional action button */
  action?: ToastAction;
}

export interface ToastOptions {
  title?: string;
  icon?: string;
  duration?: number;
  action?: ToastAction;
}

export interface ToastContextValue {
  toasts: Toast[];
  showToast: (type: ToastType, message: string, options?: ToastOptions) => void;
  dismissToast: (id: string) => void;
  /** Convenience methods */
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
}

// ============ Admin Types ============

export interface AdminInfo {
  isAdmin: boolean;
  userId?: string;
  permissions?: string[];
}
