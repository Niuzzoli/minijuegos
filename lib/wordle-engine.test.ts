import { describe, it, expect } from 'vitest';
import { evaluateGuess, isWordValid, mergeLetterStates, WORD_LENGTH, MAX_ATTEMPTS } from './wordle-engine';
import type { WordleAttempt } from '../types/wordle';

describe('constants', () => {
  it('WORD_LENGTH is 5 and MAX_ATTEMPTS is 6', () => {
    expect(WORD_LENGTH).toBe(5);
    expect(MAX_ATTEMPTS).toBe(6);
  });
});

describe('evaluateGuess', () => {
  it('marks every letter correct on an exact match', () => {
    expect(evaluateGuess('CASAS', 'CASAS')).toEqual([
      'correct', 'correct', 'correct', 'correct', 'correct',
    ]);
  });

  it('marks every letter absent when nothing matches', () => {
    // MUNDO vs CLAVE share no letters (MUNDO vs the plan's original FIRMA
    // fixture both contain "M" — that fixture was self-contradictory).
    expect(evaluateGuess('MUNDO', 'CLAVE')).toEqual([
      'absent', 'absent', 'absent', 'absent', 'absent',
    ]);
  });

  it('does not over-count a repeated guess letter beyond the solution count', () => {
    // guess "AAAAB" vs solution "AABCD": only 2 A's exist in the solution.
    // Positions 0-1 match exactly; the extra A's at 2-3 must be absent,
    // not present.
    expect(evaluateGuess('AAAAB', 'AABCD')).toEqual([
      'correct', 'correct', 'absent', 'absent', 'present',
    ]);
  });

  it('handles a guess with no exact matches but shared repeated letters', () => {
    // guess "LLAMA" vs solution "MAMAS": no position matches exactly;
    // solution has M:2, A:2, S:1 available for the "present" pass.
    expect(evaluateGuess('LLAMA', 'MAMAS')).toEqual([
      'absent', 'absent', 'present', 'present', 'present',
    ]);
  });
});

describe('isWordValid', () => {
  const list = ['CASAS', 'NIEVE'];

  it('returns true for a word in the list', () => {
    expect(isWordValid('CASAS', list)).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isWordValid('casas', list)).toBe(true);
  });

  it('returns false for a word not in the list', () => {
    expect(isWordValid('ZORRO', list)).toBe(false);
  });
});

describe('mergeLetterStates', () => {
  it('returns the best known state per letter across attempts', () => {
    const attempts: WordleAttempt[] = [
      // index 2 ('S') is 'present' here — the plan's original fixture had
      // it 'absent' at both S positions, contradicting the assertion below.
      { guess: 'CASAS', result: ['absent', 'present', 'present', 'present', 'absent'] },
      { guess: 'CAMPO', result: ['correct', 'correct', 'absent', 'absent', 'absent'] },
    ];
    const merged = mergeLetterStates(attempts);
    expect(merged.C).toBe('correct');
    expect(merged.A).toBe('correct');
    expect(merged.S).toBe('present');
  });
});
