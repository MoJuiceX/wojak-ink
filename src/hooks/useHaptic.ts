/**
 * Haptic Feedback Hook
 *
 * Provides haptic feedback on supported devices.
 *
 * GUIDELINES:
 * 1. Always check for support: "vibrate" in navigator
 * 2. Require user gesture (won't work without interaction)
 * 3. Keep durations SHORT (10-50ms for feedback)
 * 4. Respect user preferences
 */

import { useCallback, useMemo } from 'react';
import { useSettings } from '@/contexts/SettingsContext';

export const HAPTIC_PATTERNS: Record<string, number | number[]> = {
  // Micro-feedback (barely perceptible)
  tap: 10,
  selection: 15,
  toggle: 20,

  // Feedback (noticeable)
  success: 50,
  click: 30,

  // Patterns (distinct)
  error: [50, 30, 50, 30, 50],
  warning: [75, 50, 75],
  notification: [100, 50, 100, 50, 100],

  // Long (use sparingly)
  confirm: [100, 100, 200],
  celebration: [50, 50, 100, 50, 200],
};

export type HapticPatternName = keyof typeof HAPTIC_PATTERNS;

export function useHaptic() {
  const { settings } = useSettings();

  // Check if vibration is supported
  const isSupported = useMemo(() => {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }, []);

  // Main vibrate function
  const vibrate = useCallback(
    (pattern: number | number[]): boolean => {
      // Check support
      if (!isSupported) {
        return false;
      }

      // Check user preferences
      if (!settings.audio.masterEnabled) {
        return false;
      }

      // Check for reduced motion preference
      if (settings.motion.reducedMotion) {
        return false;
      }

      try {
        return navigator.vibrate(pattern);
      } catch (error) {
        console.warn('Haptic feedback failed:', error);
        return false;
      }
    },
    [isSupported, settings.audio.masterEnabled, settings.motion.reducedMotion]
  );

  // Cancel ongoing vibration
  const cancel = useCallback(() => {
    if (isSupported) {
      navigator.vibrate(0);
    }
  }, [isSupported]);

  // Preset patterns
  const tap = useCallback(() => vibrate(HAPTIC_PATTERNS.tap), [vibrate]);
  const success = useCallback(() => vibrate(HAPTIC_PATTERNS.success), [vibrate]);
  const error = useCallback(() => vibrate(HAPTIC_PATTERNS.error), [vibrate]);
  const warning = useCallback(() => vibrate(HAPTIC_PATTERNS.warning), [vibrate]);
  const selection = useCallback(() => vibrate(HAPTIC_PATTERNS.selection), [vibrate]);
  const toggle = useCallback(() => vibrate(HAPTIC_PATTERNS.toggle), [vibrate]);
  const notification = useCallback(
    () => vibrate(HAPTIC_PATTERNS.notification),
    [vibrate]
  );
  const click = useCallback(() => vibrate(HAPTIC_PATTERNS.click), [vibrate]);
  const confirm = useCallback(() => vibrate(HAPTIC_PATTERNS.confirm), [vibrate]);
  const celebration = useCallback(
    () => vibrate(HAPTIC_PATTERNS.celebration),
    [vibrate]
  );

  // Pattern by name
  const pattern = useCallback(
    (name: HapticPatternName) => vibrate(HAPTIC_PATTERNS[name]),
    [vibrate]
  );

  return useMemo(() => ({
    isSupported,
    vibrate,
    cancel,
    tap,
    success,
    error,
    warning,
    selection,
    toggle,
    notification,
    click,
    confirm,
    celebration,
    pattern,
  }), [
    isSupported, vibrate, cancel, tap, success, error, warning,
    selection, toggle, notification, click, confirm, celebration, pattern,
  ]);
}

export default useHaptic;
