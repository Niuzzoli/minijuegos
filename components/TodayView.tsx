'use client';

import { useTodayKey } from '../hooks/useTodayKey';
import { useDailyProgress } from '../hooks/useDailyProgress';
import { getDailyPuzzle } from '../lib/daily-puzzle';
import { calculateStreak } from '../lib/streak';
import { SOLUTIONS } from '../data/words/solutions';
import { DailyPuzzleHero } from './DailyPuzzleHero';

export function TodayView() {
  const { todayKey, today } = useTodayKey();
  const { store } = useDailyProgress();

  const puzzle = getDailyPuzzle(today, SOLUTIONS);
  const { current: streak } = calculateStreak(store, todayKey);
  const todayStatus = store[todayKey]?.status;
  // Before hydration, `store` is `{}` (spec §11's neutral state), so this
  // is already `false` — no separate gate needed, unlike a hard
  // `if (!hydrated) return null` which left the page blank indefinitely
  // if hydration was ever delayed.
  const alreadyPlayed = todayStatus === 'won' || todayStatus === 'lost';

  return <DailyPuzzleHero puzzle={puzzle} streak={streak} alreadyPlayed={alreadyPlayed} />;
}
