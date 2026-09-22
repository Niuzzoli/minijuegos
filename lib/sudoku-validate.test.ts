import { describe, it, expect } from 'vitest';
import { isBoardComplete, boardMatchesSolution } from './sudoku-validate';

// A well-known valid solved Sudoku grid (Wikipedia's Sudoku example).
const SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

describe('isBoardComplete', () => {
  it('is false when any cell is 0', () => {
    const board = SOLUTION.split('').map(Number);
    board[10] = 0;
    expect(isBoardComplete(board)).toBe(false);
  });

  it('is true when every cell is non-zero', () => {
    expect(isBoardComplete(SOLUTION.split('').map(Number))).toBe(true);
  });
});

describe('boardMatchesSolution', () => {
  it('matches when the board equals the solution', () => {
    const board = SOLUTION.split('').map(Number);
    expect(boardMatchesSolution(board, SOLUTION)).toBe(true);
  });

  it('does not match when a cell is wrong', () => {
    const board = SOLUTION.split('').map(Number);
    board[0] = 1; // SOLUTION[0] is '5' — 1 is definitely wrong here
    expect(boardMatchesSolution(board, SOLUTION)).toBe(false);
  });

  it('does not match an incomplete board even if every filled cell is correct', () => {
    const board = SOLUTION.split('').map(Number);
    board[5] = 0;
    expect(boardMatchesSolution(board, SOLUTION)).toBe(false);
  });
});
