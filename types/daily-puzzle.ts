import type { ConnectionsCategory } from './connections';

export type DailyPuzzle =
  | { id: string; date: string; game: 'wordle'; solution: string }
  | { id: string; date: string; game: 'sudoku'; givens: string; solution: string }
  | { id: string; date: string; game: 'connections'; categories: ConnectionsCategory[] };
