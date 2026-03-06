import { describe, expect, it } from 'vitest';
import { createManagedAudio } from './audioElement';

describe('createManagedAudio', () => {
  it('creates an audio element with metadata preload', () => {
    const audio = createManagedAudio();

    expect(audio).toBeInstanceOf(Audio);
    expect(audio.preload).toBe('metadata');
  });

  it('sets the src when provided', () => {
    const audio = createManagedAudio('/audio/music/example.mp3');

    expect(audio.src).toContain('/audio/music/example.mp3');
    expect(audio.preload).toBe('metadata');
  });
});
