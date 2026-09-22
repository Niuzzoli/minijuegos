import { describe, it, expect } from 'vitest';
import { getDailyWordlePuzzle, getDailySudokuPuzzle, LAUNCH_DATE } from './daily-puzzle';

const solutions = ['ALFA', 'BETA', 'GAMA'].map((w) => w.padEnd(5, 'X')); // 3-word pool for wraparound tests

describe('getDailyWordlePuzzle', () => {
  it('is deterministic: same date always returns the same puzzle', () => {
    const date = new Date(2026, 5, 15);
    expect(getDailyWordlePuzzle(date, solutions)).toEqual(getDailyWordlePuzzle(date, solutions));
  });

  it('returns a different index on the next day (for a pool > 1)', () => {
    const day1 = getDailyWordlePuzzle(new Date(2026, 5, 15), solutions);
    const day2 = getDailyWordlePuzzle(new Date(2026, 5, 16), solutions);
    expect(day1.solution).not.toBe(day2.solution);
  });

  it('never throws or returns a negative index for a date before LAUNCH_DATE', () => {
    const beforeLaunch = new Date(LAUNCH_DATE.getFullYear() - 1, 0, 1);
    const puzzle = getDailyWordlePuzzle(beforeLaunch, solutions);
    expect(solutions).toContain(puzzle.solution);
  });

  it('wraps around after solutions.length days', () => {
    const day0 = getDailyWordlePuzzle(LAUNCH_DATE, solutions);
    const wrapped = getDailyWordlePuzzle(
      new Date(LAUNCH_DATE.getFullYear(), LAUNCH_DATE.getMonth(), LAUNCH_DATE.getDate() + solutions.length),
      solutions,
    );
    expect(wrapped.solution).toBe(day0.solution);
  });

  it('includes the correct date key and game field', () => {
    const date = new Date(2026, 8, 21);
    const puzzle = getDailyWordlePuzzle(date, solutions);
    expect(puzzle.date).toBe('2026-09-21');
    expect(puzzle.game).toBe('wordle');
  });
});

const sudokuPuzzles = [
  { givens: '0'.repeat(81), solution: '1'.repeat(81) },
  { givens: '0'.repeat(81), solution: '2'.repeat(81) },
  { givens: '0'.repeat(81), solution: '3'.repeat(81) },
];

describe('getDailySudokuPuzzle', () => {
  it('is deterministic: same date always returns the same puzzle', () => {
    const date = new Date(2026, 5, 15);
    expect(getDailySudokuPuzzle(date, sudokuPuzzles)).toEqual(getDailySudokuPuzzle(date, sudokuPuzzles));
  });

  it('returns a different index on the next day (for a pool > 1)', () => {
    const day1 = getDailySudokuPuzzle(new Date(2026, 5, 15), sudokuPuzzles);
    const day2 = getDailySudokuPuzzle(new Date(2026, 5, 16), sudokuPuzzles);
    expect(day1.solution).not.toBe(day2.solution);
  });

  it('wraps around after puzzles.length days', () => {
    const day0 = getDailySudokuPuzzle(LAUNCH_DATE, sudokuPuzzles);
    const wrapped = getDailySudokuPuzzle(
      new Date(LAUNCH_DATE.getFullYear(), LAUNCH_DATE.getMonth(), LAUNCH_DATE.getDate() + sudokuPuzzles.length),
      sudokuPuzzles,
    );
    expect(wrapped.solution).toBe(day0.solution);
  });

  it('includes the correct date key and game field', () => {
    const date = new Date(2026, 8, 21);
    const puzzle = getDailySudokuPuzzle(date, sudokuPuzzles);
    expect(puzzle.date).toBe('2026-09-21');
    expect(puzzle.game).toBe('sudoku');
  });
});
