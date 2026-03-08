import { type HapticPattern, HAPTIC_PATTERNS, scalePattern } from './patterns';
import { safeStorage } from '@/utils/safeStorage';

class HapticManagerClass {
  private isSupported: boolean = false;
  private isEnabled: boolean = true;
  private intensity: number = 1; // 0-1 scale

  constructor() {
    // Check for vibration support (guard against SSR/non-browser environments)
    this.isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;
    this.loadPreferences();
  }

  /**
   * Check if haptics are supported on this device
   */
  getIsSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Check if haptics are currently enabled
   */
  getIsEnabled(): boolean {
    return this.isEnabled && this.isSupported;
  }

  /**
   * Get current intensity setting
   */
  getIntensity(): number {
    return this.intensity;
  }

  /**
   * Trigger a haptic pattern
   */
  trigger(pattern: HapticPattern): void {
    if (!this.isSupported || !this.isEnabled) return;
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;

    const vibrationPattern = HAPTIC_PATTERNS[pattern];
    if (!vibrationPattern) {
      console.warn(`Haptic pattern not found: ${pattern}`);
      return;
    }

    // Scale pattern by intensity
    const scaledPattern = scalePattern(vibrationPattern, this.intensity);

    try {
      navigator.vibrate(scaledPattern);
    } catch {
      // Vibration failed, ignore
    }
  }

  /**
   * Trigger a custom vibration pattern
   */
  triggerCustom(pattern: number | number[]): void {
    if (!this.isSupported || !this.isEnabled) return;
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;

    const scaledPattern = scalePattern(pattern, this.intensity);

    try {
      navigator.vibrate(scaledPattern);
    } catch {
      // Vibration failed, ignore
    }
  }

  /**
   * Stop any ongoing vibration
   */
  stop(): void {
    if (!this.isSupported) return;
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;

    try {
      navigator.vibrate(0);
    } catch {
      // Ignore
    }
  }

  /**
   * Enable or disable haptics
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.savePreferences();

    // Stop any current vibration when disabling
    if (!enabled) {
      this.stop();
    }
  }

  /**
   * Toggle enabled state
   */
  toggleEnabled(): boolean {
    this.setEnabled(!this.isEnabled);
    return this.isEnabled;
  }

  /**
   * Set intensity (0-1)
   */
  setIntensity(intensity: number): void {
    this.intensity = Math.max(0, Math.min(1, intensity));
    this.savePreferences();
  }

  /**
   * Save preferences to localStorage
   */
  private savePreferences(): void {
    safeStorage.setJSON('wojak-haptic-prefs', {
      isEnabled: this.isEnabled,
      intensity: this.intensity
    });
  }

  /**
   * Load preferences from localStorage
   */
  private loadPreferences(): void {
    const prefs = safeStorage.getJSON<{
      isEnabled?: boolean;
      intensity?: number;
    } | null>('wojak-haptic-prefs', null);
    if (prefs) {
      this.isEnabled = prefs.isEnabled ?? true;
      this.intensity = prefs.intensity ?? 1;
    }
  }
}

// Singleton instance
export const HapticManager = new HapticManagerClass();
