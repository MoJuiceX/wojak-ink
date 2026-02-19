/**
 * Settings Page
 *
 * Theme, audio, and app information settings.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { Monitor } from 'lucide-react';
import { PageTransition } from '@/components/layout/PageTransition';
import { PageSEO } from '@/components/seo';
import { useLayout } from '@/hooks/useLayout';
import { useSettings } from '@/contexts/SettingsContext';
import {
  AudioSettings,
  AboutSection,
  DisplayNameEditor,
} from '@/components/settings';
import { settingsPageVariants, settingsSectionVariants } from '@/config/settingsAnimations';

export default function Settings() {
  const { contentPadding, isDesktop } = useLayout();
  const prefersReducedMotion = useReducedMotion();
  const {
    settings,
    updateAppSettings,
    setBackgroundMusicVolume,
    toggleBackgroundMusic,
    setSoundEffectsVolume,
    toggleSoundEffects,
  } = useSettings();

  const skipBoot = settings.app.skipBootSequence;

  return (
    <PageTransition>
      <PageSEO
        title="Settings"
        description="Customize your Wojak.ink experience — display preferences, notifications, and account settings."
        path="/settings"
      />
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

          {/* Display Name (only shown when signed in) */}
          <DisplayNameEditor />

          {/* Divider */}
          <div
            className="h-px"
            style={{ background: 'var(--color-border)' }}
          />

          {/* General */}
          <motion.section
            variants={prefersReducedMotion ? undefined : settingsSectionVariants}
            initial="initial"
            animate="animate"
            className="space-y-4"
            aria-labelledby="general-section-heading"
          >
            <div className="flex items-center gap-2">
              <Monitor size={20} className="text-accent" />
              <h2
                id="general-section-heading"
                className="text-lg font-bold text-primary"
              >
                General
              </h2>
            </div>

            <div
              className="p-4 rounded-xl"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p
                    className="text-sm font-medium text-primary"
                  >
                    Skip Boot Sequence
                  </p>
                  <p
                    className="text-xs mt-0.5 text-muted"
                  >
                    Skip the startup animation on future visits
                  </p>
                </div>

                <div
                  role="switch"
                  aria-checked={skipBoot}
                  aria-label="Toggle skip boot sequence"
                  tabIndex={0}
                  onClick={() => updateAppSettings({ skipBootSequence: !skipBoot })}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); updateAppSettings({ skipBootSequence: !skipBoot }); } }}
                  className="cursor-pointer flex items-center"
                  style={{
                    position: 'relative',
                    width: '52px',
                    height: '24px',
                    borderRadius: '9999px',
                    background: skipBoot ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    flexShrink: 0,
                    transition: 'background 0.2s ease',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      fontSize: '9px',
                      fontWeight: 600,
                      lineHeight: 1,
                      color: skipBoot ? 'var(--color-white-90)' : 'var(--color-white-40)',
                      left: skipBoot ? '6px' : undefined,
                      right: skipBoot ? undefined : '6px',
                      transition: 'opacity 0.2s ease',
                      userSelect: 'none',
                    }}
                  >
                    {skipBoot ? 'ON' : 'OFF'}
                  </span>
                  <div
                    style={{
                      position: 'absolute',
                      width: '18px',
                      height: '18px',
                      top: '3px',
                      borderRadius: '9999px',
                      background: 'white',
                      left: skipBoot ? '31px' : '3px',
                      transition: 'left 0.2s ease',
                    }}
                  />
                </div>
              </div>
            </div>
          </motion.section>

          {/* Divider */}
          <div
            className="h-px"
            style={{ background: 'var(--color-border)' }}
          />

          {/* About Section */}
          <AboutSection />

          {/* Footer */}
          <p
            className="text-center text-sm pt-4 text-muted"
          >
            More settings coming soon.
          </p>
        </div>
      </motion.div>
    </PageTransition>
  );
}
