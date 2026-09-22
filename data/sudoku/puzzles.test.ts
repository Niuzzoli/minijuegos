import { describe, it, expect } from 'vitest';
import { SUDOKU_PUZZLES } from './puzzles';
import { countSolutions } from '../../lib/sudoku-generator';

describe('SUDOKU_PUZZLES pool', () => {
  it('has at least 200 puzzles', () => {
    expect(SUDOKU_PUZZLES.length).toBeGreaterThanOrEqual(200);
  });

  it('every puzzle has well-formed givens/solution strings', () => {
    for (const { givens, solution } of SUDOKU_PUZZLES) {
      expect(givens).toMatch(/^[0-9]{81}$/);
      expect(solution).toMatch(/^[1-9]{81}$/);
    }
  });

  it('givens is always a true subset of solution', () => {
    for (const { givens, solution } of SUDOKU_PUZZLES) {
      for (let i = 0; i < 81; i++) {
        if (givens[i] !== '0') expect(givens[i]).toBe(solution[i]);
      }
    }
  });

  it('every puzzle has exactly one solution', () => {
    for (const { givens } of SUDOKU_PUZZLES) {
      const board = givens.split('').map(Number);
      expect(countSolutions(board, 2)).toBe(1);
    }
  });
});
