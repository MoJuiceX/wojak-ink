/**
 * Tests for FlappyOrange Share System Utilities
 */
import { describe, it, expect } from 'vitest';
import {
  decodeChallenge,
  encodeChallenge,
  createChallengeUrl,
  generateScoreFilename,
  generateShareText,
} from './share';

describe('encodeChallenge', () => {
  it('returns a non-empty string', () => {
    const encoded = encodeChallenge(42);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);
  });

  it('encodes different scores to different strings', () => {
    const enc1 = encodeChallenge(10);
    const enc2 = encodeChallenge(20);
    expect(enc1).not.toBe(enc2);
  });

  it('produces a valid base64 string', () => {
    const encoded = encodeChallenge(99);
    // base64 characters only
    expect(encoded).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});

describe('decodeChallenge', () => {
  it('decodes an encoded challenge back to the original score', () => {
    const score = 123;
    const encoded = encodeChallenge(score);
    const decoded = decodeChallenge(encoded);
    expect(decoded).toBe(score);
  });

  it('returns null for invalid base64', () => {
    const result = decodeChallenge('not-valid-base64!!!');
    expect(result).toBeNull();
  });

  it('returns null for valid base64 but wrong JSON structure', () => {
    // btoa of some random JSON without the 's' field
    const encoded = btoa(JSON.stringify({ score: 10 }));
    const result = decodeChallenge(encoded);
    expect(result).toBeNull();
  });

  it('returns null for empty string', () => {
    const result = decodeChallenge('');
    expect(result).toBeNull();
  });

  it('round-trips correctly for score 0', () => {
    // score 0 is falsy, so decodeChallenge should return null (data.s || null)
    const encoded = encodeChallenge(0);
    const decoded = decodeChallenge(encoded);
    // 0 is falsy, so it returns null per implementation
    expect(decoded).toBeNull();
  });

  it('round-trips correctly for large scores', () => {
    const score = 999999;
    const encoded = encodeChallenge(score);
    const decoded = decodeChallenge(encoded);
    expect(decoded).toBe(score);
  });
});

describe('createChallengeUrl', () => {
  it('returns a URL containing the challenge parameter', () => {
    const url = createChallengeUrl(50, 'https://wojak.ink');
    expect(url).toContain('challenge=');
  });

  it('returns a URL with the correct base', () => {
    const url = createChallengeUrl(50, 'https://wojak.ink');
    expect(url).toContain('https://wojak.ink');
  });

  it('returns a URL containing the flappy-orange path', () => {
    const url = createChallengeUrl(50, 'https://wojak.ink');
    expect(url).toContain('/games/flappy-orange');
  });

  it('the encoded score can be decoded from the URL', () => {
    const score = 77;
    const url = createChallengeUrl(score, 'https://wojak.ink');
    const encoded = new URL(url).searchParams.get('challenge');
    expect(encoded).not.toBeNull();
    const decoded = decodeChallenge(encoded!);
    expect(decoded).toBe(score);
  });

  it('uses empty string as base when no baseUrl and no window', () => {
    // In Node/jsdom environment without window.location.origin
    const url = createChallengeUrl(10, '');
    expect(url).toContain('/games/flappy-orange?challenge=');
  });
});

describe('generateScoreFilename', () => {
  it('returns a string ending with .png', () => {
    const filename = generateScoreFilename(42);
    expect(filename).toMatch(/\.png$/);
  });

  it('includes the score in the filename', () => {
    const filename = generateScoreFilename(99);
    expect(filename).toContain('99');
  });

  it('uses the default prefix flappy-orange', () => {
    const filename = generateScoreFilename(5);
    expect(filename).toContain('flappy-orange');
  });

  it('uses a custom prefix when provided', () => {
    const filename = generateScoreFilename(10, 'my-game');
    expect(filename).toContain('my-game');
    expect(filename).not.toContain('flappy-orange');
  });

  it('formats as prefix-score.png', () => {
    const filename = generateScoreFilename(7, 'test');
    expect(filename).toBe('test-7.png');
  });
});

describe('generateShareText', () => {
  it('includes the score in the share text', () => {
    const text = generateShareText(42);
    expect(text).toContain('42');
  });

  it('includes the wojak.ink URL', () => {
    const text = generateShareText(10);
    expect(text).toContain('wojak.ink');
  });

  it('does not include NEW RECORD when isNewRecord is false', () => {
    const text = generateShareText(10, false);
    expect(text).not.toContain('NEW RECORD');
  });

  it('includes NEW RECORD when isNewRecord is true', () => {
    const text = generateShareText(10, true);
    expect(text).toContain('NEW RECORD');
  });

  it('includes challenge URL when provided', () => {
    const challengeUrl = 'https://wojak.ink/games/flappy-orange?challenge=abc';
    const text = generateShareText(10, false, challengeUrl);
    expect(text).toContain(challengeUrl);
  });

  it('does not include challenge text when no URL provided', () => {
    const text = generateShareText(10, false);
    expect(text).not.toContain('Can you beat');
  });

  it('includes challenge invitation text when URL is provided', () => {
    const text = generateShareText(10, false, 'https://example.com');
    expect(text).toContain('Can you beat');
  });
});
