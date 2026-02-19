/**
 * Audio Settings Component
 *
 * Audio control section with music and SFX controls.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { VolumeSlider } from './VolumeSlider';
import { settingsSectionVariants } from '@/config/settingsAnimations';
import type { AudioSettings as AudioSettingsType } from '@/types/settings';

interface AudioSettingsProps {
  audio: AudioSettingsType;
  onMusicVolumeChange: (volume: number) => void;
  onMusicToggle: () => void;
  onSfxVolumeChange: (volume: number) => void;
  onSfxToggle: () => void;
}

export function AudioSettings({
  audio,
  onMusicVolumeChange,
  onMusicToggle,
  onSfxVolumeChange,
  onSfxToggle,
}: AudioSettingsProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.section
      variants={prefersReducedMotion ? undefined : settingsSectionVariants}
      initial="initial"
      animate="animate"
      className="space-y-4"
      aria-labelledby="audio-section-heading"
    >
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <Volume2 size={20} style={{ color: 'var(--color-primary)' }} />
        <h2
          id="audio-section-heading"
          className="text-lg font-bold"
          style={{ color: 'var(--color-text)' }}
        >
          Audio Settings
        </h2>
      </div>

      {/* Audio Controls */}
      <div className="space-y-3">
        <VolumeSlider
          id="background-music"
          label="Background Music"
          description="Music and video audio"
          volume={audio.backgroundMusicVolume}
          enabled={audio.backgroundMusicEnabled}
          onVolumeChange={onMusicVolumeChange}
          onToggle={onMusicToggle}
        />

        <VolumeSlider
          id="sound-effects"
          label="Sound Effects"
          description="Game sounds"
          volume={audio.soundEffectsVolume}
          enabled={audio.soundEffectsEnabled}
          onVolumeChange={onSfxVolumeChange}
          onToggle={onSfxToggle}
        />
      </div>
    </motion.section>
  );
}

export default AudioSettings;
