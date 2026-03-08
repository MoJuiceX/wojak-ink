/**
 * Sound Manager
 *
 * Core sound management class using audio element pooling for low latency.
 * Handles preloading, volume control, and sound playback.
 *
 * JUICE PHILOSOPHY:
 * - All sounds have slight pitch variation (±5%) to prevent fatigue
 * - Positive sounds pitched slightly up (1.05-1.1)
 * - Negative sounds pitched slightly down (0.95)
 * - Combos escalate in pitch to create "I want to hear the next one" addiction
 */

import { type SoundName, type SoundDefinition, SOUND_DEFINITIONS } from './sounds';
import { safeStorage } from '@/utils/safeStorage';

interface SoundInstance {
  audio: HTMLAudioElement;
  isPlaying: boolean;
}

interface SoundPool {
  definition: SoundDefinition;
  instances: SoundInstance[];
  currentIndex: number;
}

// Default pitch settings for sound categories
const SOUND_PITCH_DEFAULTS: Partial<Record<SoundName, { base: number; variation: number }>> = {
  // Positive sounds - pitched slightly up
  'score': { base: 1.05, variation: 0.05 },
  'success': { base: 1.08, variation: 0.05 },
  'high-score': { base: 1.0, variation: 0.03 },
  'achievement': { base: 1.0, variation: 0.02 },
  'currency-earn': { base: 1.1, variation: 0.08 },
  'level-up': { base: 1.05, variation: 0.03 },

  // Combo sounds - escalating pitch built into the sounds
  'combo-1': { base: 1.0, variation: 0.03 },
  'combo-2': { base: 1.0, variation: 0.03 },
  'combo-3': { base: 1.0, variation: 0.03 },
  'combo-4': { base: 1.0, variation: 0.03 },
  'combo-5': { base: 1.0, variation: 0.03 },
  'combo-max': { base: 1.0, variation: 0.02 },

  // Neutral/feedback sounds
  'button-click': { base: 1.0, variation: 0.05 },
  'countdown': { base: 1.0, variation: 0.0 }, // Keep consistent
  'countdown-go': { base: 1.05, variation: 0.02 },
  'game-start': { base: 1.02, variation: 0.02 },

  // Negative sounds - pitched slightly down, NOT punishing
  'game-over': { base: 0.98, variation: 0.02 },
  'error': { base: 0.95, variation: 0.03 },
  'warning': { base: 1.0, variation: 0.02 },

  // Vote sounds - playful variation
  'vote-whoosh': { base: 1.1, variation: 0.15 },
  'vote-splat': { base: 1.15, variation: 0.2 },
  'vote-plop': { base: 0.95, variation: 0.2 },
  'vote-rain': { base: 1.0, variation: 0.0 },
};

class SoundManagerClass {
  private pools: Map<SoundName, SoundPool> = new Map();
  private masterVolume: number = 1;
  private sfxVolume: number = 1;
  private uiVolume: number = 1;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;
  private pendingSounds: Array<{ name: SoundName; volume: number }> = [];
  private loadedSounds: Set<SoundName> = new Set();
  private visibilityHandlerSetup: boolean = false;

  constructor() {
    this.loadPreferences();
    this.setupVisibilityHandler();
  }

  /**
   * Set up visibility change handler to pause/stop sounds when browser goes to background
   * This is critical for mobile where closing the browser should stop all audio
   */
  private setupVisibilityHandler(): void {
    if (this.visibilityHandlerSetup) return;
    this.visibilityHandlerSetup = true;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Stop all sounds when page is hidden
        this.stopAll();
      }
      // Note: We don't resume sounds when visible - SFX are short and would be confusing to resume
    });
  }

  /**
   * Initialize the audio system
   * Should be called after user interaction (click/tap) due to browser policies
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Preload all sounds
      await this.preloadSounds();
      this.isInitialized = true;

      // Play any sounds that were requested before initialization
      this.pendingSounds.forEach(({ name, volume }) => this.play(name, volume));
      this.pendingSounds = [];
    } catch (error) {
      console.error('Failed to initialize sound system:', error);
    }
  }

  /**
   * Check if system is initialized
   */
  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Preload all sound files
   */
  private async preloadSounds(): Promise<void> {
    const loadPromises = SOUND_DEFINITIONS.map(async (definition) => {
      const instances: SoundInstance[] = [];

      // Create pool of audio elements for each sound
      for (let i = 0; i < definition.maxInstances; i++) {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.volume = definition.volume * this.getVolumeForCategory(definition.category);

        // Set source and wait for load
        audio.src = definition.url;

        await new Promise<void>((resolve) => {
          const handleLoad = () => {
            this.loadedSounds.add(definition.name);
            resolve();
          };

          const handleError = () => {
            // Don't warn for missing files - they might not exist yet
            resolve();
          };

          audio.addEventListener('canplaythrough', handleLoad, { once: true });
          audio.addEventListener('error', handleError, { once: true });

          // Timeout after 3 seconds
          setTimeout(resolve, 3000);
        });

        instances.push({ audio, isPlaying: false });
      }

      this.pools.set(definition.name, {
        definition,
        instances,
        currentIndex: 0
      });
    });

    await Promise.all(loadPromises);
  }

  /**
   * Get volume multiplier for a category
   */
  private getVolumeForCategory(category: 'sfx' | 'music' | 'ui'): number {
    if (this.isMuted) return 0;

    switch (category) {
      case 'sfx':
        return this.masterVolume * this.sfxVolume;
      case 'ui':
        return this.masterVolume * this.uiVolume;
      case 'music':
        return this.masterVolume;
      default:
        return this.masterVolume;
    }
  }

  /**
   * Play a sound with automatic pitch variation for juicy feel
   */
  play(name: SoundName, volumeMultiplier: number = 1): void {
    // Get default pitch settings for this sound
    const pitchDefaults = SOUND_PITCH_DEFAULTS[name];

    if (pitchDefaults) {
      this.playWithOptions(name, {
        volumeMultiplier,
        pitchShift: pitchDefaults.base,
        pitchVariation: pitchDefaults.variation,
      });
    } else {
      // No defaults - use small default variation to prevent fatigue
      this.playWithOptions(name, {
        volumeMultiplier,
        pitchVariation: 0.03, // ±3% by default
      });
    }
  }

  /**
   * Play a sound with options (pitch variation, volume)
   */
  playWithOptions(
    name: SoundName,
    options: {
      volumeMultiplier?: number;
      pitchVariation?: number; // 0-1, how much to vary pitch (0.1 = ±10%)
      pitchShift?: number; // Direct pitch multiplier (1.0 = normal, 1.2 = higher, 0.8 = lower)
    } = {}
  ): void {
    const { volumeMultiplier = 1, pitchVariation = 0, pitchShift = 1 } = options;

    // If not initialized, queue the sound
    if (!this.isInitialized) {
      this.pendingSounds.push({ name, volume: volumeMultiplier });
      return;
    }

    if (this.isMuted) return;

    const pool = this.pools.get(name);
    if (!pool) {
      return;
    }

    // Check if sound was loaded successfully
    if (!this.loadedSounds.has(name)) {
      return;
    }

    // Find an available instance or use the next in rotation
    const instance = pool.instances[pool.currentIndex];
    if (!instance) return;

    // Reset and play
    instance.audio.currentTime = 0;
    instance.audio.volume = pool.definition.volume *
      this.getVolumeForCategory(pool.definition.category) *
      volumeMultiplier;

    // Apply pitch variation
    let finalPitch = pitchShift;
    if (pitchVariation > 0) {
      // Random variation: e.g., 0.1 means pitch can be 0.9 to 1.1
      const variation = (Math.random() * 2 - 1) * pitchVariation;
      finalPitch = pitchShift * (1 + variation);
    }
    instance.audio.playbackRate = Math.max(0.5, Math.min(2, finalPitch));

    instance.audio.play().catch(() => {
      // Autoplay was prevented - this is normal on first interaction
    });

    // Rotate to next instance
    pool.currentIndex = (pool.currentIndex + 1) % pool.instances.length;
  }

  /**
   * Play vote throw sound with satisfying variation
   */
  playVoteThrow(): void {
    this.playWithOptions('vote-whoosh', {
      volumeMultiplier: 0.8,
      pitchVariation: 0.15,
      pitchShift: 1.1, // Slightly higher pitch feels more energetic
    });
  }

  /**
   * Play vote impact sound (donut or poop) with satisfying variation
   */
  playVoteImpact(type: 'donut' | 'poop'): void {
    const soundName = type === 'donut' ? 'vote-splat' : 'vote-plop';
    this.playWithOptions(soundName as SoundName, {
      volumeMultiplier: 1.0,
      pitchVariation: 0.2, // More variation keeps it fresh
      pitchShift: type === 'donut' ? 1.15 : 0.95, // Donut higher, poop lower
    });
  }

  /**
   * Play combo sound with escalating pitch based on combo level
   * THE ADDICTION ENGINE: Each level sounds slightly higher,
   * making players subconsciously want to hear the next one
   */
  playCombo(level: number): void {
    // Get the appropriate combo sound
    let soundName: SoundName;
    if (level >= 10) soundName = 'combo-max';
    else if (level >= 8) soundName = 'combo-5';
    else if (level >= 6) soundName = 'combo-4';
    else if (level >= 4) soundName = 'combo-3';
    else if (level >= 2) soundName = 'combo-2';
    else soundName = 'combo-1';

    // Calculate pitch multiplier based on combo level
    // Each level adds ~6% pitch (roughly a semitone)
    const semitones = Math.min(level - 1, 11); // Cap at one octave
    const pitchMultiplier = Math.pow(2, semitones / 12);

    // Clamp to reasonable range
    const finalPitch = Math.min(Math.max(pitchMultiplier, 0.8), 2.0);

    this.playWithOptions(soundName, {
      volumeMultiplier: Math.min(0.6 + level * 0.05, 1.0), // Volume increases with combo
      pitchShift: finalPitch,
      pitchVariation: 0.02, // Small variation to keep it fresh
    });
  }

  /**
   * Play a satisfying score sound with slight positive pitch
   */
  playScore(): void {
    this.play('score');
  }

  /**
   * Play game over sound - gentle, not punishing
   */
  playGameOver(): void {
    this.play('game-over');
  }

  /**
   * Stop a specific sound
   */
  stop(name: SoundName): void {
    const pool = this.pools.get(name);
    if (!pool) return;

    pool.instances.forEach(instance => {
      instance.audio.pause();
      instance.audio.currentTime = 0;
    });
  }

  /**
   * Stop all sounds
   */
  stopAll(): void {
    this.pools.forEach(pool => {
      pool.instances.forEach(instance => {
        instance.audio.pause();
        instance.audio.currentTime = 0;
      });
    });
  }

  /**
   * Set master volume (0-1)
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
    this.savePreferences();
  }

  /**
   * Set SFX volume (0-1)
   */
  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
    this.savePreferences();
  }

  /**
   * Set UI volume (0-1)
   */
  setUiVolume(volume: number): void {
    this.uiVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
    this.savePreferences();
  }

  /**
   * Toggle mute
   */
  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.updateAllVolumes();
    this.savePreferences();
    return this.isMuted;
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.updateAllVolumes();
    this.savePreferences();
  }

  /**
   * Get current mute state
   */
  getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Get current volumes
   */
  getVolumes(): { master: number; sfx: number; ui: number; muted: boolean } {
    return {
      master: this.masterVolume,
      sfx: this.sfxVolume,
      ui: this.uiVolume,
      muted: this.isMuted
    };
  }

  /**
   * Update volumes on all audio elements
   */
  private updateAllVolumes(): void {
    this.pools.forEach(pool => {
      const volume = pool.definition.volume * this.getVolumeForCategory(pool.definition.category);
      pool.instances.forEach(instance => {
        instance.audio.volume = volume;
      });
    });
  }

  /**
   * Save preferences to localStorage
   */
  private savePreferences(): void {
    const prefs = {
      masterVolume: this.masterVolume,
      sfxVolume: this.sfxVolume,
      uiVolume: this.uiVolume,
      isMuted: this.isMuted
    };
    safeStorage.setJSON('wojak-sound-prefs', prefs);
  }

  /**
   * Load preferences from localStorage
   */
  private loadPreferences(): void {
    const prefs = safeStorage.getJSON<{
      masterVolume?: number;
      sfxVolume?: number;
      uiVolume?: number;
      isMuted?: boolean;
    } | null>('wojak-sound-prefs', null);
    if (prefs) {
      this.masterVolume = prefs.masterVolume ?? 1;
      this.sfxVolume = prefs.sfxVolume ?? 1;
      this.uiVolume = prefs.uiVolume ?? 1;
      this.isMuted = prefs.isMuted ?? false;
    }
  }
}

// Singleton instance
export const SoundManager = new SoundManagerClass();
