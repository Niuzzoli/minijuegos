import type { ProgressStore } from '../types/daily-progress';
import type { WordleStats, SudokuStats } from '../types/user-stats';
import { calculateStreak } from './streak';
import { filterStoreByGame } from './progress-filter';

export function calculateStats(store: ProgressStore, todayKey: string): WordleStats {
  const finishedEntries = Object.values(store).filter((p) => p.status !== 'in-progress');
  const wonEntries = finishedEntries.filter((p) => p.status === 'won');

  const played = finishedEntries.length;
  const won = wonEntries.length;
  const winPercentage = played === 0 ? 0 : Math.round((won / played) * 100);

  const attemptsDistribution: WordleStats['attemptsDistribution'] = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
  };
  for (const entry of wonEntries) {
    if (entry.game !== 'wordle') continue;
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

// Unlike calculateStats above (kept as-is for backward compatibility —
// it does NOT filter by game internally), this one is self-contained: it
// filters to sudoku entries itself, so callers don't have to remember to.
// See app/estadisticas/page.tsx (Task 18) for why calculateStats' caller
// still has to pre-filter and this one doesn't.
export function calculateSudokuStats(store: ProgressStore, todayKey: string): SudokuStats {
  const sudokuStore = filterStoreByGame(store, 'sudoku');
  const finishedEntries = Object.values(sudokuStore).filter((p) => p.status !== 'in-progress');
  const wonEntries = finishedEntries.filter((p) => p.status === 'won');

  const played = finishedEntries.length;
  const won = wonEntries.length;
  const winPercentage = played === 0 ? 0 : Math.round((won / played) * 100);

  const { current, best } = calculateStreak(sudokuStore, todayKey);

  return {
    played,
    won,
    winPercentage,
    currentStreak: current,
    bestStreak: best,
  };
}
