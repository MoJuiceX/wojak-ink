/**
 * FlappyOrange Audio Module
 *
 * Pure audio functions for the FlappyOrange game.
 * These functions handle tone generation and sound effects using the Web Audio API.
 */

import { JUICE_CONFIG } from './config';

/**
 * Background music playlist - 4 quiet songs
 */
export const MUSIC_PLAYLIST = [
  { src: '/audio/music/FlappyOrange/gourmet-race-whisper.mp3', name: 'Gourmet Race' },
  { src: '/audio/music/FlappyOrange/lost-woods-whisper.mp3', name: 'Lost Woods' },
  { src: '/audio/music/FlappyOrange/tetris-troika-whisper.mp3', name: 'Tetris' },
  { src: '/audio/music/FlappyOrange/smb3-overworld-whisper.mp3', name: 'SMB3 Overworld' },
];

/**
 * Play a tone using Web Audio API
 *
 * @param audioContext - The AudioContext instance (or null if not available)
 * @param frequency - The frequency of the tone in Hz
 * @param volume - The volume level (0-1)
 * @param duration - The duration in milliseconds
 */
export function playTone(
  audioContext: AudioContext | null,
  frequency: number,
  volume: number,
  duration: number
): void {
  if (!audioContext) return;

  try {
    const ctx = audioContext;
    if (ctx.state === 'suspended') ctx.resume();

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch (_e) {
    // Audio context may not be available
  }
}

/**
 * Play musical note for pipe pass
 *
 * @param audioContext - The AudioContext instance (or null if not available)
 * @param pipeNumber - The pipe number (1-indexed), used to select note from scale
 */
export function playPassNote(
  audioContext: AudioContext | null,
  pipeNumber: number
): void {
  const noteIndex = (pipeNumber - 1) % JUICE_CONFIG.PASS_SCALE_FREQUENCIES.length;
  const frequency = JUICE_CONFIG.PASS_SCALE_FREQUENCIES[noteIndex];
  playTone(audioContext, frequency, 0.15, 200);
}

/**
 * Play soft synthesized coin chime - gentle two-note rising tone
 *
 * @param audioContext - The AudioContext instance (or null if not available)
 */
export function playCoinSound(audioContext: AudioContext | null): void {
  if (!audioContext) return;

  const ctx = audioContext;
  if (ctx.state === 'suspended') ctx.resume();

  const now = ctx.currentTime;
  const volume = 0.12; // Soft volume

  // First note - soft sine wave (C5 = 523Hz)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(523, now);
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(volume, now + 0.02); // Quick attack
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15); // Gentle decay
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.15);

  // Second note - slightly higher (E5 = 659Hz), slight delay for "chime" feel
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(659, now + 0.05);
  gain2.gain.setValueAtTime(0, now + 0.05);
  gain2.gain.linearRampToValueAtTime(volume * 0.8, now + 0.07); // Softer second note
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.05);
  osc2.stop(now + 0.2);

  // Third note - even higher for sparkle (G5 = 784Hz)
  const osc3 = ctx.createOscillator();
  const gain3 = ctx.createGain();
  osc3.type = 'sine';
  osc3.frequency.setValueAtTime(784, now + 0.08);
  gain3.gain.setValueAtTime(0, now + 0.08);
  gain3.gain.linearRampToValueAtTime(volume * 0.5, now + 0.1); // Even softer
  gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  osc3.connect(gain3);
  gain3.connect(ctx.destination);
  osc3.start(now + 0.08);
  osc3.stop(now + 0.25);
}

/**
 * Play thunder sound effect for lightning
 *
 * @param audioContext - The AudioContext instance (or null if not available)
 */
export function playThunderSound(audioContext: AudioContext | null): void {
  playTone(audioContext, 60, 0.15, 400); // Low rumble
}

/**
 * Create or get an AudioContext instance
 * Handles WebKit prefix for Safari
 */
export function createAudioContext(): AudioContext {
  return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
}
