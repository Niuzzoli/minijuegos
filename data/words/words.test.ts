import { describe, it, expect } from 'vitest';
import { SOLUTIONS } from './solutions';
import { VALID_GUESSES } from './valid-guesses';

const WORD_PATTERN = /^[A-ZÑ]{5}$/;

describe('SOLUTIONS', () => {
  it('every entry is a 5-letter uppercase word (no accents, Ñ allowed)', () => {
    for (const word of SOLUTIONS) {
      expect(word).toMatch(WORD_PATTERN);
    }
  });

  it('has no duplicates', () => {
    expect(new Set(SOLUTIONS).size).toBe(SOLUTIONS.length);
  });

  it('has at least 500 solutions', () => {
    expect(SOLUTIONS.length).toBeGreaterThanOrEqual(500);
  });
});

describe('VALID_GUESSES', () => {
  it('every entry is a 5-letter uppercase word (no accents, Ñ allowed)', () => {
    for (const word of VALID_GUESSES) {
      expect(word).toMatch(WORD_PATTERN);
    }
  });

  it('has no duplicates', () => {
    expect(new Set(VALID_GUESSES).size).toBe(VALID_GUESSES.length);
  });

  it('is at least as large as SOLUTIONS', () => {
    expect(VALID_GUESSES.length).toBeGreaterThanOrEqual(SOLUTIONS.length);
  });

  it('contains every solution word (strict superset)', () => {
    const guessSet = new Set(VALID_GUESSES);
    for (const word of SOLUTIONS) {
      expect(guessSet.has(word)).toBe(true);
    }
  });
});
