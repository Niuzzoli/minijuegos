import type { ProgressStore } from '../types/daily-progress';
import type { UserStats } from '../types/user-stats';
import { calculateStreak } from './streak';

export function calculateStats(store: ProgressStore, todayKey: string): UserStats {
  const finishedEntries = Object.values(store).filter((p) => p.status !== 'in-progress');
  const wonEntries = finishedEntries.filter((p) => p.status === 'won');

  const played = finishedEntries.length;
  const won = wonEntries.length;
  const winPercentage = played === 0 ? 0 : Math.round((won / played) * 100);

  const attemptsDistribution: UserStats['attemptsDistribution'] = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
  };
  for (const entry of wonEntries) {
    const count = entry.attempts.length;
    if (count >= 1 && count <= 6) {
      attemptsDistribution[count as 1 | 2 | 3 | 4 | 5 | 6] += 1;
    }
  }

  const { current, best } = calculateStreak(store, todayKey);

  return {
    played,
    won,
    winPercentage,
    currentStreak: current,
    bestStreak: best,
    attemptsDistribution,
  };
}
