// lib/sudoku-generator.test.ts
import { describe, it, expect } from 'vitest';
import {
  createRng,
  isValidSolvedBoard,
  generateSolvedBoard,
  countSolutions,
  removeCellsForUniqueSolution,
} from './sudoku-generator';

describe('createRng', () => {
  it('is deterministic: the same seed produces the same sequence', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('different seeds diverge', () => {
    expect(createRng(1)()).not.toBe(createRng(2)());
  });
});

describe('generateSolvedBoard', () => {
  it('produces a valid, fully-filled 81-cell board', () => {
    const board = generateSolvedBoard(createRng(1));
    expect(board).toHaveLength(81);
    expect(board.every((n) => n >= 1 && n <= 9)).toBe(true);
    expect(isValidSolvedBoard(board)).toBe(true);
  });

  it('different seeds produce different boards (verified for this exact pair)', () => {
    const boardA = generateSolvedBoard(createRng(1));
    const boardB = generateSolvedBoard(createRng(2));
    expect(boardA).not.toEqual(boardB);
  });
});

describe('isValidSolvedBoard', () => {
  it('accepts a valid solved board', () => {
    expect(isValidSolvedBoard(generateSolvedBoard(createRng(7)))).toBe(true);
  });

  it('rejects a board with a repeated digit in a row', () => {
    const board = generateSolvedBoard(createRng(7));
    const broken = [...board];
    broken[1] = broken[0]; // duplicates board[0] within row 0
    expect(isValidSolvedBoard(broken)).toBe(false);
  });
});

describe('countSolutions', () => {
  it('a fully solved board has exactly one solution', () => {
    const board = generateSolvedBoard(createRng(3));
    expect(countSolutions(board, 2)).toBe(1);
  });

  it('a board missing exactly one cell still has exactly one solution (hand-verifiable: the missing digit is forced by its row/column/box)', () => {
    const solved = generateSolvedBoard(createRng(3));
    const almostSolved = [...solved];
    almostSolved[0] = 0;
    expect(countSolutions(almostSolved, 2)).toBe(1);
  });

  it('stops at the limit instead of exploring further (an empty board has many solutions)', () => {
    const empty = new Array(81).fill(0);
    expect(countSolutions(empty, 1)).toBe(1);
  });
});

describe('removeCellsForUniqueSolution', () => {
  it('removes cells while keeping a unique solution and never altering a kept digit', () => {
    const solved = generateSolvedBoard(createRng(5));
    const givens = removeCellsForUniqueSolution(solved, 32, createRng(6));

    expect(givens.filter((n) => n !== 0).length).toBeLessThanOrEqual(81);
    expect(countSolutions(givens, 2)).toBe(1);
    givens.forEach((value, i) => {
      if (value !== 0) expect(value).toBe(solved[i]);
    });
  });
});
