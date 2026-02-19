// src/utils/validation.test.ts
import { describe, it, expect } from 'vitest';
import {
  validateUsername,
  generateUsernameSuggestions,
  validateEmail,
  USERNAME_RULES,
} from './validation';

describe('validation', () => {
  describe('USERNAME_RULES', () => {
    it('has correct minLength of 3', () => {
      expect(USERNAME_RULES.minLength).toBe(3);
    });

    it('has correct maxLength of 20', () => {
      expect(USERNAME_RULES.maxLength).toBe(20);
    });

    it('pattern allows alphanumeric and underscores', () => {
      expect(USERNAME_RULES.pattern.test('abc123_')).toBe(true);
    });

    it('pattern rejects hyphens', () => {
      expect(USERNAME_RULES.pattern.test('abc-def')).toBe(false);
    });

    it('pattern rejects spaces', () => {
      expect(USERNAME_RULES.pattern.test('ab cd')).toBe(false);
    });
  });

  describe('validateUsername', () => {
    it('returns valid for a proper username', () => {
      const result = validateUsername('hello_world');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects username shorter than 3 characters', () => {
      const result = validateUsername('ab');
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/at least 3 characters/);
    });

    it('rejects empty string', () => {
      const result = validateUsername('');
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/at least 3 characters/);
    });

    it('rejects username longer than 20 characters', () => {
      const result = validateUsername('a'.repeat(21));
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/20 characters or less/);
    });

    it('accepts username exactly 20 characters', () => {
      const result = validateUsername('a'.repeat(20));
      expect(result.isValid).toBe(true);
    });

    it('accepts username exactly 3 characters', () => {
      const result = validateUsername('abc');
      expect(result.isValid).toBe(true);
    });

    it('rejects username with special characters', () => {
      const result = validateUsername('abc!@#');
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/letters, numbers, and underscores/);
    });

    it('rejects username with spaces', () => {
      const result = validateUsername('my name');
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/letters, numbers, and underscores/);
    });

    it('rejects username with hyphens', () => {
      const result = validateUsername('my-name');
      expect(result.isValid).toBe(false);
    });

    it('rejects reserved word "admin"', () => {
      const result = validateUsername('admin');
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/reserved/);
    });

    it('rejects reserved word "wojak" (case-insensitive)', () => {
      const result = validateUsername('WOJAK');
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/reserved/);
    });

    it('rejects reserved word "moderator"', () => {
      const result = validateUsername('moderator');
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/reserved/);
    });

    it('rejects reserved word "official"', () => {
      const result = validateUsername('official');
      expect(result.isValid).toBe(false);
    });

    it('rejects reserved word "support"', () => {
      const result = validateUsername('support');
      expect(result.isValid).toBe(false);
    });

    it('accepts underscore-only names when valid length', () => {
      const result = validateUsername('___');
      expect(result.isValid).toBe(true);
    });

    it('accepts alphanumeric mixed case', () => {
      const result = validateUsername('CoolUser99');
      expect(result.isValid).toBe(true);
    });
  });

  describe('generateUsernameSuggestions', () => {
    it('returns an array', () => {
      const suggestions = generateUsernameSuggestions('player');
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('returns at most 4 suggestions', () => {
      const suggestions = generateUsernameSuggestions('player');
      expect(suggestions.length).toBeLessThanOrEqual(4);
    });

    it('returns at least 1 suggestion', () => {
      const suggestions = generateUsernameSuggestions('player');
      expect(suggestions.length).toBeGreaterThanOrEqual(1);
    });

    it('each suggestion is a string', () => {
      const suggestions = generateUsernameSuggestions('player');
      suggestions.forEach(s => expect(typeof s).toBe('string'));
    });

    it('each suggestion is 20 characters or fewer', () => {
      const suggestions = generateUsernameSuggestions('player');
      suggestions.forEach(s => expect(s.length).toBeLessThanOrEqual(20));
    });

    it('each suggestion starts with base name (truncated to 15)', () => {
      const suggestions = generateUsernameSuggestions('player');
      suggestions.forEach(s => expect(s).toMatch(/^player/));
    });

    it('truncates base name that is longer than 15 chars', () => {
      const suggestions = generateUsernameSuggestions('averylongusername123456');
      suggestions.forEach(s => expect(s.length).toBeLessThanOrEqual(20));
    });

    it('works with short base names', () => {
      const suggestions = generateUsernameSuggestions('ab');
      expect(suggestions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('validateEmail', () => {
    it('returns true for valid email', () => {
      expect(validateEmail('user@example.com')).toBe(true);
    });

    it('returns true for email with subdomain', () => {
      expect(validateEmail('user@mail.example.com')).toBe(true);
    });

    it('returns false for email without @', () => {
      expect(validateEmail('userexample.com')).toBe(false);
    });

    it('returns false for email without domain', () => {
      expect(validateEmail('user@')).toBe(false);
    });

    it('returns false for email without TLD', () => {
      expect(validateEmail('user@example')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(validateEmail('')).toBe(false);
    });

    it('returns false for email with spaces', () => {
      expect(validateEmail('user @example.com')).toBe(false);
    });

    it('returns true for email with plus addressing', () => {
      expect(validateEmail('user+tag@example.com')).toBe(true);
    });
  });
});
