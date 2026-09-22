import type { SudokuBoard } from '../types/sudoku';

export function isBoardComplete(board: SudokuBoard): boolean {
  return board.every((value) => value !== 0);
}

export function boardMatchesSolution(board: SudokuBoard, solution: string): boolean {
  return board.every((value, i) => String(value) === solution[i]);
}
