import type { DailyPuzzle } from '../types/daily-puzzle';
import { diffInDays, getTodayKey } from './date';

// Fixed epoch anchor for the daily index. MUST NEVER CHANGE after shipping —
// changing it reshuffles every date's puzzle (see spec §7).
export const LAUNCH_DATE = new Date(2024, 0, 1);

function nonNegativeModulo(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function getDailyPuzzle(date: Date, solutions: readonly string[]): DailyPuzzle {
  const daysSinceLaunch = diffInDays(date, LAUNCH_DATE);
  const index = nonNegativeModulo(daysSinceLaunch, solutions.length);

  return {
    id: `wordle-${index}`,
    date: getTodayKey(date),
    game: 'wordle',
    solution: solutions[index],
  };
}
