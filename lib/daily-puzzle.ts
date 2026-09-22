import type { DailyPuzzle } from '../types/daily-puzzle';
import type { ConnectionsCategory } from '../types/connections';
import { diffInDays, getTodayKey } from './date';

// Fixed epoch anchor for the daily index. MUST NEVER CHANGE after shipping —
// changing it reshuffles every date's puzzle for BOTH games (see spec §7).
export const LAUNCH_DATE = new Date(2024, 0, 1);

function nonNegativeModulo(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function dailyIndexForPool(date: Date, poolLength: number): number {
  const daysSinceLaunch = diffInDays(date, LAUNCH_DATE);
  return nonNegativeModulo(daysSinceLaunch, poolLength);
}

export function getDailyWordlePuzzle(
  date: Date,
  solutions: readonly string[],
): Extract<DailyPuzzle, { game: 'wordle' }> {
  const index = dailyIndexForPool(date, solutions.length);
  return {
    id: `wordle-${index}`,
    date: getTodayKey(date),
    game: 'wordle',
    solution: solutions[index],
  };
}

export function getDailySudokuPuzzle(
  date: Date,
  puzzles: readonly { givens: string; solution: string }[],
): Extract<DailyPuzzle, { game: 'sudoku' }> {
  const index = dailyIndexForPool(date, puzzles.length);
  return {
    id: `sudoku-${index}`,
    date: getTodayKey(date),
    game: 'sudoku',
    givens: puzzles[index].givens,
    solution: puzzles[index].solution,
  };
}

export function getDailyConnectionsPuzzle(
  date: Date,
  puzzles: readonly { categories: ConnectionsCategory[] }[],
): Extract<DailyPuzzle, { game: 'connections' }> {
  const index = dailyIndexForPool(date, puzzles.length);
  return {
    id: `connections-${index}`,
    date: getTodayKey(date),
    game: 'connections',
    categories: puzzles[index].categories,
  };
}
