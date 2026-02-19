// src/games/Wordle/words.test.ts
import { describe, it, expect } from 'vitest';
import { SOLUTIONS, VALID_GUESSES, getRandomSolution, isValidWord } from './words';

describe('SOLUTIONS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(SOLUTIONS)).toBe(true);
    expect(SOLUTIONS.length).toBeGreaterThan(0);
  });

  it('has a substantial list of solution words', () => {
    // Should have many curated solutions
    expect(SOLUTIONS.length).toBeGreaterThan(100);
  });

  it('the majority of solutions are 5 letters', () => {
    const fiveLetterWords = SOLUTIONS.filter(w => w.length === 5);
    expect(fiveLetterWords.length).toBeGreaterThan(SOLUTIONS.length * 0.99);
  });

  it('all solutions are uppercase', () => {
    for (const word of SOLUTIONS) {
      expect(word, `"${word}" should be uppercase`).toBe(word.toUpperCase());
    }
  });

  it('contains expected themed citrus/orange words', () => {
    expect(SOLUTIONS).toContain('JUICE');
    expect(SOLUTIONS).toContain('ZESTY');
    expect(SOLUTIONS).toContain('FRUIT');
  });

  it('contains common English words', () => {
    expect(SOLUTIONS).toContain('ABOUT');
    expect(SOLUTIONS).toContain('BREAD');
    expect(SOLUTIONS).toContain('DREAM');
  });

  it('contains only alphabetic characters', () => {
    for (const word of SOLUTIONS) {
      expect(word).toMatch(/^[A-Z]+$/);
    }
  });

  it('contains SWEET and TANGY', () => {
    expect(SOLUTIONS).toContain('SWEET');
    expect(SOLUTIONS).toContain('TANGY');
  });

  it('contains standard English words like BUILD and BRAVE', () => {
    expect(SOLUTIONS).toContain('BUILD');
    expect(SOLUTIONS).toContain('BRAVE');
  });
});

describe('VALID_GUESSES', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(VALID_GUESSES)).toBe(true);
    expect(VALID_GUESSES.length).toBeGreaterThan(0);
  });

  it('includes all SOLUTIONS (solutions are valid guesses)', () => {
    for (const solution of SOLUTIONS) {
      expect(VALID_GUESSES).toContain(solution);
    }
  });

  it('the majority of valid guesses are 5 letters', () => {
    const fiveLetterWords = VALID_GUESSES.filter(w => w.length === 5);
    expect(fiveLetterWords.length).toBeGreaterThan(VALID_GUESSES.length * 0.99);
  });

  it('all valid guesses are uppercase', () => {
    for (const word of VALID_GUESSES) {
      expect(word).toBe(word.toUpperCase());
    }
  });

  it('has at least as many entries as SOLUTIONS', () => {
    expect(VALID_GUESSES.length).toBeGreaterThanOrEqual(SOLUTIONS.length);
  });

  it('contains all alphabetic characters only', () => {
    for (const word of VALID_GUESSES) {
      expect(word).toMatch(/^[A-Z]+$/);
    }
  });

  it('has a large extended word list', () => {
    // Should have significantly more guesses than solutions
    expect(VALID_GUESSES.length).toBeGreaterThan(500);
  });
});

describe('getRandomSolution', () => {
  it('returns a string', () => {
    expect(typeof getRandomSolution()).toBe('string');
  });

  it('returns a word from SOLUTIONS', () => {
    const solution = getRandomSolution();
    expect(SOLUTIONS).toContain(solution);
  });

  it('returns an uppercase word', () => {
    const solution = getRandomSolution();
    expect(solution).toBe(solution.toUpperCase());
  });

  it('returns different words on multiple calls (probabilistic)', () => {
    // With 600+ solutions, calling 20 times should produce at least 2 unique values
    const results = new Set(Array.from({ length: 20 }, () => getRandomSolution()));
    expect(results.size).toBeGreaterThan(1);
  });

  it('never returns undefined or null', () => {
    for (let i = 0; i < 10; i++) {
      expect(getRandomSolution()).toBeTruthy();
    }
  });

  it('always returns a word that isValidWord accepts', () => {
    for (let i = 0; i < 5; i++) {
      const solution = getRandomSolution();
      expect(isValidWord(solution)).toBe(true);
    }
  });
});

describe('isValidWord', () => {
  it('returns true for a word in VALID_GUESSES (uppercase)', () => {
    const word = VALID_GUESSES.find(w => w.length === 5) as string;
    expect(isValidWord(word)).toBe(true);
  });

  it('accepts lowercase input and converts to uppercase', () => {
    const word = SOLUTIONS.find(w => w.length === 5) as string;
    expect(isValidWord(word.toLowerCase())).toBe(true);
  });

  it('accepts mixed case input', () => {
    const word = SOLUTIONS.find(w => w.length === 5) as string;
    const mixed = word.charAt(0) + word.slice(1).toLowerCase();
    expect(isValidWord(mixed)).toBe(true);
  });

  it('returns false for a word not in VALID_GUESSES', () => {
    expect(isValidWord('ZZZZZ')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isValidWord('')).toBe(false);
  });

  it('returns false for a clearly invalid word', () => {
    expect(isValidWord('XYZXQ')).toBe(false);
  });

  it('returns true for known solution words', () => {
    expect(isValidWord('JUICE')).toBe(true);
    expect(isValidWord('ABOUT')).toBe(true);
    expect(isValidWord('DREAM')).toBe(true);
  });

  it('returns true for lowercase known solution words', () => {
    expect(isValidWord('juice')).toBe(true);
    expect(isValidWord('about')).toBe(true);
  });

  it('returns true for all SOLUTIONS', () => {
    for (const solution of SOLUTIONS) {
      expect(isValidWord(solution), `"${solution}" should be a valid word`).toBe(true);
    }
  });
});
