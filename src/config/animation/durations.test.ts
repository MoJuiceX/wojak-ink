// src/config/animation/durations.test.ts
import { describe, it, expect } from 'vitest';
import {
  DURATION,
  DEVICE_MULTIPLIER,
  getDeviceDuration,
  toSeconds,
  type DurationKey,
  type DeviceType,
} from './durations';

describe('DURATION', () => {
  it('defines instant as less than 100ms', () => {
    expect(DURATION.instant).toBeLessThan(100);
  });

  it('defines micro as 100ms', () => {
    expect(DURATION.micro).toBe(100);
  });

  it('defines fast as 150ms', () => {
    expect(DURATION.fast).toBe(150);
  });

  it('defines normal as 200ms', () => {
    expect(DURATION.normal).toBe(200);
  });

  it('defines moderate as 300ms', () => {
    expect(DURATION.moderate).toBe(300);
  });

  it('defines complex as 400ms', () => {
    expect(DURATION.complex).toBe(400);
  });

  it('defines slow as 500ms', () => {
    expect(DURATION.slow).toBe(500);
  });

  it('defines continuous as 1000ms', () => {
    expect(DURATION.continuous).toBe(1000);
  });

  it('durations are in ascending order', () => {
    const keys: DurationKey[] = ['instant', 'micro', 'fast', 'normal', 'moderate', 'complex', 'slow', 'continuous'];
    for (let i = 0; i < keys.length - 1; i++) {
      expect(DURATION[keys[i]]).toBeLessThanOrEqual(DURATION[keys[i + 1]]);
    }
  });

  it('all duration values are positive numbers', () => {
    for (const [key, value] of Object.entries(DURATION)) {
      expect(value, `${key} should be positive`).toBeGreaterThan(0);
    }
  });

  it('has 8 duration presets', () => {
    expect(Object.keys(DURATION)).toHaveLength(8);
  });
});

describe('DEVICE_MULTIPLIER', () => {
  it('mobile multiplier is 1 (baseline)', () => {
    expect(DEVICE_MULTIPLIER.mobile).toBe(1);
  });

  it('tablet multiplier is greater than 1 (larger distances)', () => {
    expect(DEVICE_MULTIPLIER.tablet).toBeGreaterThan(1);
  });

  it('desktop multiplier is less than 1 (faster response)', () => {
    expect(DEVICE_MULTIPLIER.desktop).toBeLessThan(1);
  });

  it('wearable multiplier is less than 1 (smaller distances)', () => {
    expect(DEVICE_MULTIPLIER.wearable).toBeLessThan(1);
  });

  it('all multipliers are positive', () => {
    for (const [device, multiplier] of Object.entries(DEVICE_MULTIPLIER)) {
      expect(multiplier, `${device} multiplier should be positive`).toBeGreaterThan(0);
    }
  });

  it('has all four device types', () => {
    const devices: DeviceType[] = ['mobile', 'tablet', 'desktop', 'wearable'];
    for (const device of devices) {
      expect(DEVICE_MULTIPLIER).toHaveProperty(device);
    }
  });
});

describe('getDeviceDuration', () => {
  it('scales base duration by mobile multiplier (1)', () => {
    expect(getDeviceDuration(200, 'mobile')).toBe(200);
  });

  it('scales base duration by tablet multiplier (1.3)', () => {
    expect(getDeviceDuration(200, 'tablet')).toBe(260);
  });

  it('scales base duration by desktop multiplier (0.75)', () => {
    expect(getDeviceDuration(200, 'desktop')).toBe(150);
  });

  it('scales base duration by wearable multiplier (0.7)', () => {
    expect(getDeviceDuration(200, 'wearable')).toBe(140);
  });

  it('returns an integer (rounds the result)', () => {
    const result = getDeviceDuration(150, 'tablet'); // 150 * 1.3 = 195
    expect(Number.isInteger(result)).toBe(true);
  });

  it('rounds correctly for non-integer results', () => {
    // 100 * 1.3 = 130 (exact)
    expect(getDeviceDuration(100, 'tablet')).toBe(130);
  });

  it('defaults to desktop when no device specified', () => {
    const result = getDeviceDuration(200);
    expect(result).toBe(getDeviceDuration(200, 'desktop'));
  });

  it('returns 0 for base duration of 0', () => {
    expect(getDeviceDuration(0, 'mobile')).toBe(0);
  });

  it('handles large base durations', () => {
    const result = getDeviceDuration(1000, 'tablet');
    expect(result).toBe(1300);
  });
});

describe('toSeconds', () => {
  it('converts milliseconds to seconds', () => {
    expect(toSeconds(1000)).toBe(1);
  });

  it('converts 500ms to 0.5s', () => {
    expect(toSeconds(500)).toBe(0.5);
  });

  it('converts 250ms to 0.25s', () => {
    expect(toSeconds(250)).toBe(0.25);
  });

  it('converts 150ms to 0.15s', () => {
    expect(toSeconds(150)).toBe(0.15);
  });

  it('converts 0ms to 0s', () => {
    expect(toSeconds(0)).toBe(0);
  });

  it('converts DURATION constants correctly', () => {
    expect(toSeconds(DURATION.normal)).toBe(0.2);
    expect(toSeconds(DURATION.fast)).toBe(0.15);
    expect(toSeconds(DURATION.continuous)).toBe(1);
  });

  it('always returns a number', () => {
    expect(typeof toSeconds(300)).toBe('number');
  });
});
