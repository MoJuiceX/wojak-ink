/**
 * Settings Page
 *
 * Theme, audio, and app information settings.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { PageTransition } from '@/components/layout/PageTransition';
import { useLayout } from '@/hooks/useLayout';
import { useSettings } from '@/contexts/SettingsContext';
import {
  AudioSettings,
  AboutSection,
} from '@/components/settings';
import { settingsPageVariants } from '@/config/settingsAnimations';

export default function Settings() {
  const { contentPadding, isDesktop } = useLayout();
  const prefersReducedMotion = useReducedMotion();
  const {
    settings,
    setBackgroundMusicVolume,
    toggleBackgroundMusic,
    setSoundEffectsVolume,
    toggleSoundEffects,
  } = useSettings();

  return (
    <PageTransition>
      <motion.div
        className="min-h-full"
        style={{ padding: contentPadding }}
        variants={prefersReducedMotion ? undefined : settingsPageVariants}
        initial="initial"
        animate="animate"
      >
        <div
          className="space-y-8 pb-24"
          style={{ maxWidth: isDesktop ? '1000px' : undefined, margin: '0 auto' }}
        >
          {/* Audio */}
          <AudioSettings
            audio={settings.audio}
            onMusicVolumeChange={setBackgroundMusicVolume}
            onMusicToggle={toggleBackgroundMusic}
            onSfxVolumeChange={setSoundEffectsVolume}
            onSfxToggle={toggleSoundEffects}
          />

          {/* Divider */}
          <div
            className="h-px"
            style={{ background: 'var(--color-border)' }}
          />

          {/* About Section */}
          <AboutSection />

          {/* Footer */}
          <p
            className="text-center text-sm pt-4"
            style={{ color: 'var(--color-text-muted)' }}
          >
            More settings coming soon.
          </p>
        </div>
      </motion.div>
    </PageTransition>
  );
}
