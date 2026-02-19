import { describe, it, expect, vi } from 'vitest';
import {
  MUSIC_PLAYLIST,
  playTone,
  playPassNote,
  playCoinSound,
  playThunderSound,
} from './audio';
import { JUICE_CONFIG } from './config';

// Minimal AudioContext mock that records calls without hitting Web Audio API
function makeAudioContextMock(): AudioContext {
  const oscillatorMock = {
    connect: vi.fn().mockReturnThis(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: {
      value: 0,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    type: 'sine' as OscillatorType,
  };

  const gainMock = {
    connect: vi.fn().mockReturnThis(),
    gain: {
      value: 0,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
  };

  return {
    state: 'running',
    currentTime: 0,
    destination: {} as AudioDestinationNode,
    resume: vi.fn().mockResolvedValue(undefined),
    createOscillator: vi.fn().mockReturnValue(oscillatorMock),
    createGain: vi.fn().mockReturnValue(gainMock),
  } as unknown as AudioContext;
}

describe('MUSIC_PLAYLIST', () => {
  it('contains exactly 4 tracks', () => {
    expect(MUSIC_PLAYLIST).toHaveLength(4);
  });

  it('each track has a src and name', () => {
    for (const track of MUSIC_PLAYLIST) {
      expect(typeof track.src).toBe('string');
      expect(track.src.length).toBeGreaterThan(0);
      expect(typeof track.name).toBe('string');
      expect(track.name.length).toBeGreaterThan(0);
    }
  });

  it('all track srcs point to audio files', () => {
    for (const track of MUSIC_PLAYLIST) {
      expect(track.src).toMatch(/\.(mp3|ogg|wav)$/i);
    }
  });

  it('track names are unique', () => {
    const names = MUSIC_PLAYLIST.map(t => t.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('track srcs are unique', () => {
    const srcs = MUSIC_PLAYLIST.map(t => t.src);
    const unique = new Set(srcs);
    expect(unique.size).toBe(srcs.length);
  });
});

describe('playTone — null context guard', () => {
  it('returns immediately without throwing when ctx is null', () => {
    expect(() => playTone(null, 440, 0.5, 200)).not.toThrow();
  });
});

describe('playTone — with mock context', () => {
  it('creates an oscillator and gain node', () => {
    const ctx = makeAudioContextMock();
    playTone(ctx, 440, 0.5, 200);
    expect(ctx.createOscillator).toHaveBeenCalled();
    expect(ctx.createGain).toHaveBeenCalled();
  });

  it('connects oscillator to gain to destination', () => {
    const ctx = makeAudioContextMock();
    playTone(ctx, 440, 0.5, 200);
    const osc = vi.mocked(ctx.createOscillator).mock.results[0].value;
    expect(osc.connect).toHaveBeenCalled();
  });

  it('starts and stops the oscillator', () => {
    const ctx = makeAudioContextMock();
    playTone(ctx, 440, 0.5, 200);
    const osc = vi.mocked(ctx.createOscillator).mock.results[0].value;
    expect(osc.start).toHaveBeenCalled();
    expect(osc.stop).toHaveBeenCalled();
  });

  it('sets oscillator type to sine', () => {
    const ctx = makeAudioContextMock();
    playTone(ctx, 440, 0.5, 200);
    const osc = vi.mocked(ctx.createOscillator).mock.results[0].value;
    expect(osc.type).toBe('sine');
  });

  it('resumes a suspended AudioContext before playing', () => {
    const ctx = makeAudioContextMock();
    (ctx as unknown as { state: string }).state = 'suspended';
    playTone(ctx, 440, 0.5, 200);
    expect(ctx.resume).toHaveBeenCalled();
  });
});

describe('playPassNote', () => {
  it('does not throw when ctx is null', () => {
    expect(() => playPassNote(null, 1)).not.toThrow();
  });

  it('cycles through scale frequencies based on pipe number', () => {
    const scaleLength = JUICE_CONFIG.PASS_SCALE_FREQUENCIES.length;
    const ctx = makeAudioContextMock();

    // Pipe 1 should use note index 0
    playPassNote(ctx, 1);
    let osc = vi.mocked(ctx.createOscillator).mock.results[0].value;
    expect(osc.frequency.value).toBe(JUICE_CONFIG.PASS_SCALE_FREQUENCIES[0]);

    // Reset mock
    vi.mocked(ctx.createOscillator).mockClear();

    // Pipe (scaleLength + 1) should wrap back to index 0
    playPassNote(ctx, scaleLength + 1);
    osc = vi.mocked(ctx.createOscillator).mock.results[0].value;
    expect(osc.frequency.value).toBe(JUICE_CONFIG.PASS_SCALE_FREQUENCIES[0]);
  });

  it('uses pipe 2 for index 1 in the scale', () => {
    const ctx = makeAudioContextMock();
    playPassNote(ctx, 2);
    const osc = vi.mocked(ctx.createOscillator).mock.results[0].value;
    expect(osc.frequency.value).toBe(JUICE_CONFIG.PASS_SCALE_FREQUENCIES[1]);
  });

  it('wraps correctly at full scale length', () => {
    const ctx = makeAudioContextMock();
    const scaleLength = JUICE_CONFIG.PASS_SCALE_FREQUENCIES.length;
    playPassNote(ctx, scaleLength + 3);
    const osc = vi.mocked(ctx.createOscillator).mock.results[0].value;
    expect(osc.frequency.value).toBe(JUICE_CONFIG.PASS_SCALE_FREQUENCIES[2]);
  });
});

describe('playCoinSound', () => {
  it('does not throw when ctx is null', () => {
    expect(() => playCoinSound(null)).not.toThrow();
  });

  it('creates 3 oscillators (C5, E5, G5) for chime effect', () => {
    const ctx = makeAudioContextMock();
    playCoinSound(ctx);
    expect(vi.mocked(ctx.createOscillator).mock.calls.length).toBe(3);
  });

  it('creates 3 gain nodes to control each oscillator', () => {
    const ctx = makeAudioContextMock();
    playCoinSound(ctx);
    expect(vi.mocked(ctx.createGain).mock.calls.length).toBe(3);
  });

  it('uses sine wave for all oscillators', () => {
    const ctx = makeAudioContextMock();
    playCoinSound(ctx);
    const oscillators = vi.mocked(ctx.createOscillator).mock.results.map(r => r.value);
    for (const osc of oscillators) {
      expect(osc.type).toBe('sine');
    }
  });

  it('resumes a suspended context before playing', () => {
    const ctx = makeAudioContextMock();
    (ctx as unknown as { state: string }).state = 'suspended';
    playCoinSound(ctx);
    expect(ctx.resume).toHaveBeenCalled();
  });
});

describe('playThunderSound', () => {
  it('does not throw when ctx is null', () => {
    expect(() => playThunderSound(null)).not.toThrow();
  });

  it('creates an oscillator for low rumble', () => {
    const ctx = makeAudioContextMock();
    playThunderSound(ctx);
    expect(ctx.createOscillator).toHaveBeenCalled();
    // Thunder uses a low frequency (60 Hz)
    const osc = vi.mocked(ctx.createOscillator).mock.results[0].value;
    expect(osc.frequency.value).toBe(60);
  });
});
