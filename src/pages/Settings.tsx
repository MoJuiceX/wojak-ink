/**
 * Settings Page
 *
 * Theme, audio, and app information settings.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { Smartphone } from 'lucide-react';
import { PageTransition } from '@/components/layout/PageTransition';
import { useLayout } from '@/hooks/useLayout';
import { useSettings } from '@/contexts/SettingsContext';
import {
  AudioSettings,
  AboutSection,
} from '@/components/settings';
import { settingsPageVariants } from '@/config/settingsAnimations';

// Motion Effects Section (Coming Soon)
function MotionEffectsSection() {
  return (
    <div className="space-y-4">
      <h2
        className="text-lg font-semibold"
        style={{ color: 'var(--color-text-primary)' }}
      >
        Motion Effects
      </h2>
      <div
        className="p-4 rounded-xl relative overflow-hidden"
        style={{
          background: 'var(--color-glass-bg)',
          border: '1px solid var(--color-border)',
          opacity: 0.6,
        }}
      >
        {/* Coming Soon Badge */}
        <div
          className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{
            background: 'linear-gradient(90deg, #F97316, #FFD700)',
            color: 'black',
          }}
        >
          Coming Soon
        </div>

        <div className="flex items-center gap-4">
          <div
            className="p-3 rounded-xl"
            style={{ background: 'rgba(249, 115, 22, 0.15)' }}
          >
            <Smartphone size={24} style={{ color: '#F97316' }} />
          </div>
          <div className="flex-1">
            <div
              className="font-medium mb-1"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Gyroscope Parallax
            </div>
            <div
              className="text-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Images move when you tilt your phone
            </div>
          </div>
          {/* Disabled Toggle */}
          <div
            className="w-12 h-7 rounded-full relative"
            style={{
              background: 'var(--color-border)',
              cursor: 'not-allowed',
            }}
          >
            <div
              className="absolute top-1 left-1 w-5 h-5 rounded-full"
              style={{ background: 'var(--color-text-muted)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

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
          {/* Desktop layout */}
          {isDesktop ? (
            <div className="space-y-8">
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

              {/* Motion Effects (Coming Soon) */}
              <MotionEffectsSection />
            </div>
          ) : (
            /* Mobile: Single column layout */
            <>
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

              {/* Motion Effects (Coming Soon) */}
              <MotionEffectsSection />
            </>
          )}

          {/* Divider */}
          <div
            className="h-px"
            style={{ background: 'var(--color-border)' }}
          />

          {/* About Section */}
          <AboutSection />
        </div>
      </motion.div>
    </PageTransition>
  );
}
