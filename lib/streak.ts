import type { ProgressStore } from '../types/daily-progress';
import { diffInDays, parseDateKey } from './date';

export type StreakInfo = { current: number; best: number };

export function calculateStreak(store: ProgressStore, todayKey: string): StreakInfo {
  const wonDates = Object.entries(store)
    .filter(([, progress]) => progress.status === 'won')
    .map(([dateKey]) => dateKey)
    .sort();

  if (wonDates.length === 0) {
    return { current: 0, best: 0 };
  }

  let best = 1;
  let run = 1;
  for (let i = 1; i < wonDates.length; i++) {
    const gap = diffInDays(parseDateKey(wonDates[i]), parseDateKey(wonDates[i - 1]));
    run = gap === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }

  const mostRecent = wonDates[wonDates.length - 1];
  const daysSinceMostRecent = diffInDays(parseDateKey(todayKey), parseDateKey(mostRecent));

  if (daysSinceMostRecent > 1) {
    return { current: 0, best };
  }

  let current = 1;
  for (let i = wonDates.length - 1; i > 0; i--) {
    const gap = diffInDays(parseDateKey(wonDates[i]), parseDateKey(wonDates[i - 1]));
    if (gap === 1) {
      current += 1;
    } else {
      break;
    }
  }

  return { current, best };
}
