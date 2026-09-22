import type { WordleAttempt } from './wordle';
import type { SudokuBoard } from './sudoku';

export type GameStatus = 'in-progress' | 'won' | 'lost';

export type DailyProgress =
  | { game: 'wordle'; status: GameStatus; attempts: WordleAttempt[]; completedAt?: string }
  | { game: 'sudoku'; status: 'in-progress' | 'won'; board: SudokuBoard; completedAt?: string };

export type ProgressStore = Record<string, DailyProgress>;
