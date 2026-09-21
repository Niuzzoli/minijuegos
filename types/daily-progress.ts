import type { WordleAttempt } from './wordle';

export type GameStatus = 'in-progress' | 'won' | 'lost';

export type DailyProgress = {
  game: string;
  status: GameStatus;
  attempts: WordleAttempt[];
  completedAt?: string;
};

export type ProgressStore = Record<string, DailyProgress>;
