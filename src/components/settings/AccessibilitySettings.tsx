/**
 * Accessibility Settings Component
 *
 * Motion preferences and accessibility options.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { Accessibility } from 'lucide-react';
import { Dropdown } from '@/components/ui/Dropdown';
import { Toggle } from '@/components/ui/Toggle';
import { settingsSectionVariants } from '@/config/settingsAnimations';
import type { MotionPreference } from '@/types/settings';

interface AccessibilitySettingsProps {
  motionPreference: MotionPreference;
  reducedMotion: boolean;
  showTooltips: boolean;
  onMotionChange: (pref: MotionPreference) => void;
  onTooltipsChange: (enabled: boolean) => void;
}

const motionOptions = [
  {
    value: 'system' as MotionPreference,
    label: 'System (follow device)',
    description: 'Automatically matches your device settings',
  },
  {
    value: 'reduced' as MotionPreference,
    label: 'Reduced (minimal motion)',
    description: 'Disables most animations for comfort',
  },
  {
    value: 'full' as MotionPreference,
    label: 'Full (all animations)',
    description: 'Enable all animations and transitions',
  },
];

export function AccessibilitySettings({
  motionPreference,
  reducedMotion,
  showTooltips,
  onMotionChange,
  onTooltipsChange,
}: AccessibilitySettingsProps) {
  const prefersReducedMotion = useReducedMotion();

  const currentMotionStatus = reducedMotion
    ? 'Animations reduced'
    : 'Animations enabled';

  return (
    <motion.section
      variants={prefersReducedMotion ? undefined : settingsSectionVariants}
      initial="initial"
      animate="animate"
      className="space-y-4"
      aria-labelledby="accessibility-section-heading"
    >
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <Accessibility size={20} style={{ color: 'var(--color-primary)' }} />
        <h2
          id="accessibility-section-heading"
          className="text-lg font-bold"
          style={{ color: 'var(--color-text)' }}
        >
          Accessibility
        </h2>
      </div>

      {/* Settings */}
      <div className="space-y-4">
        {/* Motion Preference */}
        <div
          className="p-4 rounded-xl"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <Dropdown
            id="motion-preference"
            label="Motion Preference"
            description="Control animations and transitions"
            value={motionPreference}
            options={motionOptions}
            onChange={onMotionChange}
          />
          <p
            className="text-xs mt-3"
            style={{ color: 'var(--color-text-muted)' }}
            aria-live="polite"
          >
            Currently: {currentMotionStatus}
          </p>
        </div>

        {/* Show Tooltips */}
        <div
          className="p-4 rounded-xl"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <Toggle
            id="show-tooltips"
            label="Show Tooltips"
            description="Display helpful hints on hover"
            checked={showTooltips}
            onChange={onTooltipsChange}
          />
        </div>
      </div>
    </motion.section>
  );
}

export default AccessibilitySettings;
