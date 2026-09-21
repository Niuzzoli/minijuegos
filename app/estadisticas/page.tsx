'use client';

import { useEffect, useState } from 'react';
import { calculateStats } from '../../lib/stats';
import { loadProgressStore } from '../../lib/storage';
import { getTodayKey } from '../../lib/date';
import { StatsPanel } from '../../components/StatsPanel';
import type { UserStats } from '../../types/user-stats';

const EMPTY_STATS: UserStats = {
  played: 0,
  won: 0,
  winPercentage: 0,
  currentStreak: 0,
  bestStreak: 0,
  attemptsDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
};

export default function StatsPage() {
  const [stats, setStats] = useState<UserStats>(EMPTY_STATS);

  useEffect(() => {
    // One-time read of localStorage on mount — same SSR-safe hydration
    // pattern as ThemeProvider/useDailyProgress (spec §11).
    const store = loadProgressStore();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStats(calculateStats(store, getTodayKey()));
  }, []);

  return (
    <div>
      <h1 className="font-heading mx-auto max-w-md px-4 pt-8 text-2xl font-bold">Estadísticas</h1>
      <StatsPanel stats={stats} />
    </div>
  );
}
