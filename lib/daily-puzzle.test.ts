import { describe, it, expect } from 'vitest';
import { getDailyPuzzle, LAUNCH_DATE } from './daily-puzzle';

const solutions = ['ALFA', 'BETA', 'GAMA'].map((w) => w.padEnd(5, 'X')); // 3-word pool for wraparound tests

describe('getDailyPuzzle', () => {
  it('is deterministic: same date always returns the same puzzle', () => {
    const date = new Date(2026, 5, 15);
    expect(getDailyPuzzle(date, solutions)).toEqual(getDailyPuzzle(date, solutions));
  });

  it('returns a different index on the next day (for a pool > 1)', () => {
    const day1 = getDailyPuzzle(new Date(2026, 5, 15), solutions);
    const day2 = getDailyPuzzle(new Date(2026, 5, 16), solutions);
    expect(day1.solution).not.toBe(day2.solution);
  });

  it('never throws or returns a negative index for a date before LAUNCH_DATE', () => {
    const beforeLaunch = new Date(LAUNCH_DATE.getFullYear() - 1, 0, 1);
    const puzzle = getDailyPuzzle(beforeLaunch, solutions);
    expect(solutions).toContain(puzzle.solution);
  });

  it('wraps around after solutions.length days', () => {
    const day0 = getDailyPuzzle(LAUNCH_DATE, solutions);
    const wrapped = getDailyPuzzle(
      new Date(LAUNCH_DATE.getFullYear(), LAUNCH_DATE.getMonth(), LAUNCH_DATE.getDate() + solutions.length),
      solutions,
    );
    expect(wrapped.solution).toBe(day0.solution);
  });

  it('includes the correct date key and game field', () => {
    const date = new Date(2026, 8, 21);
    const puzzle = getDailyPuzzle(date, solutions);
    expect(puzzle.date).toBe('2026-09-21');
    expect(puzzle.game).toBe('wordle');
  });
});
