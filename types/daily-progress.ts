import type { WordleAttempt } from './wordle';
import type { SudokuBoard } from './sudoku';
import type { ConnectionsColor, ConnectionsCategory } from './connections';

export type GameStatus = 'in-progress' | 'won' | 'lost';

export type DailyProgress =
  | { game: 'wordle'; status: GameStatus; attempts: WordleAttempt[]; completedAt?: string }
  | { game: 'sudoku'; status: 'in-progress' | 'won'; board: SudokuBoard; completedAt?: string }
  | {
      game: 'connections';
      status: GameStatus; // Connections DOES use 'lost' (spec §2/§7), unlike Sudoku
      solvedCategories: ConnectionsCategory[]; // in solve order
      mistakesMade: number; // 0-4
      guessHistory: ConnectionsColor[][]; // each submitted guess's 4 item colors, in guess order
      completedAt?: string;
    };

export type ProgressStore = Record<string, DailyProgress>;
