'use client';

import { useTodayKey } from '../hooks/useTodayKey';
import { useDailyProgress } from '../hooks/useDailyProgress';
import { getDailyPuzzle } from '../lib/daily-puzzle';
import { calculateStreak } from '../lib/streak';
import { SOLUTIONS } from '../data/words/solutions';
import { DailyPuzzleHero } from '../components/DailyPuzzleHero';

export default function TodayPage() {
  const { todayKey, today } = useTodayKey();
  const { store, hydrated } = useDailyProgress();

  const puzzle = getDailyPuzzle(today, SOLUTIONS);
  const { current: streak } = calculateStreak(store, todayKey);
  const todayStatus = store[todayKey]?.status;
  const alreadyPlayed = hydrated && (todayStatus === 'won' || todayStatus === 'lost');

  return <DailyPuzzleHero puzzle={puzzle} streak={streak} alreadyPlayed={alreadyPlayed} />;
}
