'use client';

import { useEffect, useState } from 'react';
import { calculateStats, calculateSudokuStats } from '../../lib/stats';
import { loadProgressStore } from '../../lib/storage';
import { useTodayKey } from '../../hooks/useTodayKey';
import { filterStoreByGame } from '../../lib/progress-filter';
import { StatsPanel } from '../../components/StatsPanel';
import type { WordleStats, SudokuStats } from '../../types/user-stats';

const EMPTY_WORDLE_STATS: WordleStats = {
  played: 0,
  won: 0,
  winPercentage: 0,
  currentStreak: 0,
  bestStreak: 0,
  attemptsDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
};

const EMPTY_SUDOKU_STATS: SudokuStats = {
  played: 0,
  won: 0,
  winPercentage: 0,
  currentStreak: 0,
  bestStreak: 0,
};

export default function StatsPage() {
  const { todayKey } = useTodayKey();
  const [wordleStats, setWordleStats] = useState<WordleStats>(EMPTY_WORDLE_STATS);
  const [sudokuStats, setSudokuStats] = useState<SudokuStats>(EMPTY_SUDOKU_STATS);

  useEffect(() => {
    const store = loadProgressStore();
    // calculateStats doesn't filter by game internally (kept as-is for
    // backward compatibility, see lib/stats.ts) — pre-filter here so a
    // Sudoku entry in the same store isn't double-counted into Wordle's
    // played/won. calculateSudokuStats filters internally already.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWordleStats(calculateStats(filterStoreByGame(store, 'wordle'), todayKey));
    setSudokuStats(calculateSudokuStats(store, todayKey));
  }, [todayKey]);

  return (
    <div>
      <h1 className="font-heading mx-auto max-w-md px-4 pt-8 text-2xl font-bold">Estadísticas</h1>
      <section>
        <h2 className="font-heading mx-auto max-w-md px-4 pt-6 text-lg font-semibold">Wordle</h2>
        <StatsPanel stats={wordleStats} />
      </section>
      <section>
        <h2 className="font-heading mx-auto max-w-md px-4 pt-2 text-lg font-semibold">Sudoku</h2>
        <StatsPanel stats={sudokuStats} />
      </section>
    </div>
  );
}
