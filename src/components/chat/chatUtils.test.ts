// src/components/chat/chatUtils.test.ts
import { describe, it, expect } from 'vitest';
import type React from 'react';
import {
  formatTime,
  formatDateSeparator,
  shouldShowDateSeparator,
  shouldGroupWithPrevious,
  parseMentions,
  REACTION_EMOJIS,
  MINTGARDEN_URL,
  BOOT_MESSAGES,
} from './chatUtils';
import type { ChatMessage } from '@/types/chat';

// ============================================
// Test helpers
// ============================================

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    senderId: 'user-1',
    senderName: 'Alice',
    text: 'Hello world',
    nftCount: 1,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('chatUtils', () => {
  // ============================================
  // formatTime
  // ============================================
  describe('formatTime', () => {
    it('returns a non-empty string', () => {
      const result = formatTime(Date.now());
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('includes a colon separating hours and minutes', () => {
      const morning = new Date(2024, 0, 15, 8, 30).getTime();
      const result = formatTime(morning);
      expect(result).toMatch(/:/);
    });

    it('different timestamps produce different outputs', () => {
      const t1 = new Date(2024, 0, 15, 10, 0).getTime();
      const t2 = new Date(2024, 0, 15, 11, 0).getTime();
      expect(formatTime(t1)).not.toBe(formatTime(t2));
    });

    it('formats afternoon time without error', () => {
      const afternoon = new Date(2024, 0, 15, 14, 45).getTime();
      const result = formatTime(afternoon);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // formatDateSeparator
  // ============================================
  describe('formatDateSeparator', () => {
    it('returns "Today" for current date', () => {
      const now = Date.now();
      expect(formatDateSeparator(now)).toBe('Today');
    });

    it('returns "Yesterday" for yesterday\'s date', () => {
      const yesterday = Date.now() - 24 * 60 * 60 * 1000;
      expect(formatDateSeparator(yesterday)).toBe('Yesterday');
    });

    it('returns a formatted date string for older dates', () => {
      const oldDate = new Date(2023, 5, 15).getTime(); // June 15, 2023
      const result = formatDateSeparator(oldDate);
      expect(result).not.toBe('Today');
      expect(result).not.toBe('Yesterday');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('older date includes a numeric day', () => {
      const oldDate = new Date(2023, 5, 15).getTime();
      const result = formatDateSeparator(oldDate);
      expect(result).toMatch(/15/);
    });

    it('returns a month name for older dates', () => {
      const oldDate = new Date(2023, 5, 15).getTime(); // June
      const result = formatDateSeparator(oldDate);
      expect(result.length).toBeGreaterThan(3);
    });
  });

  // ============================================
  // shouldShowDateSeparator
  // ============================================
  describe('shouldShowDateSeparator', () => {
    it('returns true when there is no previous message', () => {
      const msg = makeMessage({ timestamp: Date.now() });
      expect(shouldShowDateSeparator(msg, undefined)).toBe(true);
    });

    it('returns false when two messages are on the same day', () => {
      const base = new Date(2024, 0, 15, 10, 0).getTime();
      const msg1 = makeMessage({ timestamp: base });
      const msg2 = makeMessage({ timestamp: base + 30 * 60 * 1000 }); // 30 min later
      expect(shouldShowDateSeparator(msg2, msg1)).toBe(false);
    });

    it('returns true when messages are on different days', () => {
      const day1 = new Date(2024, 0, 15, 23, 0).getTime();
      const day2 = new Date(2024, 0, 16, 1, 0).getTime();
      const msg1 = makeMessage({ timestamp: day1 });
      const msg2 = makeMessage({ timestamp: day2 });
      expect(shouldShowDateSeparator(msg2, msg1)).toBe(true);
    });

    it('returns false when same day regardless of sender', () => {
      const base = new Date(2024, 0, 15, 9, 0).getTime();
      const msg1 = makeMessage({ senderId: 'user-1', timestamp: base });
      const msg2 = makeMessage({ senderId: 'user-2', timestamp: base + 3600000 });
      expect(shouldShowDateSeparator(msg2, msg1)).toBe(false);
    });
  });

  // ============================================
  // shouldGroupWithPrevious
  // ============================================
  describe('shouldGroupWithPrevious', () => {
    it('returns false when there is no previous message', () => {
      const msg = makeMessage();
      expect(shouldGroupWithPrevious(msg, undefined)).toBe(false);
    });

    it('returns true when same sender within 5 minutes', () => {
      const base = 1_700_000_000_000;
      const msg1 = makeMessage({ senderId: 'user-1', timestamp: base });
      const msg2 = makeMessage({ senderId: 'user-1', timestamp: base + 2 * 60 * 1000 });
      expect(shouldGroupWithPrevious(msg2, msg1)).toBe(true);
    });

    it('returns false when different senders within 5 minutes', () => {
      const base = 1_700_000_000_000;
      const msg1 = makeMessage({ senderId: 'user-1', timestamp: base });
      const msg2 = makeMessage({ senderId: 'user-2', timestamp: base + 60 * 1000 });
      expect(shouldGroupWithPrevious(msg2, msg1)).toBe(false);
    });

    it('returns false when same sender but more than 5 minutes apart', () => {
      const base = 1_700_000_000_000;
      const msg1 = makeMessage({ senderId: 'user-1', timestamp: base });
      const msg2 = makeMessage({ senderId: 'user-1', timestamp: base + 6 * 60 * 1000 });
      expect(shouldGroupWithPrevious(msg2, msg1)).toBe(false);
    });

    it('returns true at just under 5 minutes', () => {
      const base = 1_700_000_000_000;
      const msg1 = makeMessage({ senderId: 'user-1', timestamp: base });
      const msg2 = makeMessage({ senderId: 'user-1', timestamp: base + 299_999 });
      expect(shouldGroupWithPrevious(msg2, msg1)).toBe(true);
    });

    it('returns false at exactly 5 minutes', () => {
      const base = 1_700_000_000_000;
      const msg1 = makeMessage({ senderId: 'user-1', timestamp: base });
      const msg2 = makeMessage({ senderId: 'user-1', timestamp: base + 5 * 60 * 1000 });
      expect(shouldGroupWithPrevious(msg2, msg1)).toBe(false);
    });

    it('returns false when messages are 1 day apart same sender', () => {
      const base = new Date(2024, 0, 15, 10, 0).getTime();
      const msg1 = makeMessage({ senderId: 'user-1', timestamp: base });
      const msg2 = makeMessage({ senderId: 'user-1', timestamp: base + 24 * 60 * 60 * 1000 });
      expect(shouldGroupWithPrevious(msg2, msg1)).toBe(false);
    });
  });

  // ============================================
  // parseMentions
  // ============================================
  describe('parseMentions', () => {
    it('returns an array with the plain text when no mentions', () => {
      const result = parseMentions('Hello world');
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('Hello world');
    });

    it('splits text around a single @mention into 3 parts', () => {
      const result = parseMentions('Hey @Alice how are you?');
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('Hey ');
      expect(result[2]).toBe(' how are you?');
    });

    it('creates a React element for a mention', () => {
      const result = parseMentions('@Bob');
      expect(result).toHaveLength(1);
      const el = result[0] as React.ReactElement;
      expect(el).toBeTruthy();
      expect(typeof el).toBe('object');
    });

    it('handles multiple mentions', () => {
      const result = parseMentions('@Alice and @Bob');
      // At least the two span elements should be present
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('handles text that is only a mention', () => {
      const result = parseMentions('@Alice');
      expect(result).toHaveLength(1);
    });

    it('handles text starting with mention followed by more text', () => {
      const result = parseMentions('@Alice hello');
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('returns unchanged string for empty input', () => {
      const result = parseMentions('');
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('');
    });
  });

  // ============================================
  // REACTION_EMOJIS
  // ============================================
  describe('REACTION_EMOJIS', () => {
    it('is an array', () => {
      expect(Array.isArray(REACTION_EMOJIS)).toBe(true);
    });

    it('has at least 4 emojis', () => {
      expect(REACTION_EMOJIS.length).toBeGreaterThanOrEqual(4);
    });

    it('includes the orange emoji', () => {
      expect(REACTION_EMOJIS).toContain('🍊');
    });

    it('includes thumbs up', () => {
      expect(REACTION_EMOJIS).toContain('👍');
    });

    it('includes thumbs down', () => {
      expect(REACTION_EMOJIS).toContain('👎');
    });

    it('all entries are non-empty strings', () => {
      REACTION_EMOJIS.forEach((emoji) => {
        expect(typeof emoji).toBe('string');
        expect(emoji.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================
  // MINTGARDEN_URL
  // ============================================
  describe('MINTGARDEN_URL', () => {
    it('is a string', () => {
      expect(typeof MINTGARDEN_URL).toBe('string');
    });

    it('starts with https://', () => {
      expect(MINTGARDEN_URL).toMatch(/^https:\/\//);
    });

    it('points to mintgarden.io', () => {
      expect(MINTGARDEN_URL).toContain('mintgarden.io');
    });
  });

  // ============================================
  // BOOT_MESSAGES
  // ============================================
  describe('BOOT_MESSAGES', () => {
    it('is an array', () => {
      expect(Array.isArray(BOOT_MESSAGES)).toBe(true);
    });

    it('has at least 3 entries', () => {
      expect(BOOT_MESSAGES.length).toBeGreaterThanOrEqual(3);
    });

    it('each entry has a text property', () => {
      BOOT_MESSAGES.forEach((msg) => {
        expect(typeof msg.text).toBe('string');
        expect(msg.text.length).toBeGreaterThan(0);
      });
    });

    it('each entry has a delay property that is a number', () => {
      BOOT_MESSAGES.forEach((msg) => {
        expect(typeof msg.delay).toBe('number');
        expect(msg.delay).toBeGreaterThanOrEqual(0);
      });
    });

    it('the last entry has success: true', () => {
      const last = BOOT_MESSAGES[BOOT_MESSAGES.length - 1];
      expect(last.success).toBe(true);
    });

    it('delays are monotonically non-decreasing', () => {
      for (let i = 1; i < BOOT_MESSAGES.length; i++) {
        expect(BOOT_MESSAGES[i].delay).toBeGreaterThanOrEqual(BOOT_MESSAGES[i - 1].delay);
      }
    });

    it('first entry has delay of 0', () => {
      expect(BOOT_MESSAGES[0].delay).toBe(0);
    });
  });
});
