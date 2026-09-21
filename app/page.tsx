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
  const alreadyPlayed = todayStatus === 'won' || todayStatus === 'lost';

  // Without this gate, Next.js statically prerenders this route at build
  // time (no dynamic API forces per-request rendering) and bakes the build
  // machine's date into the HTML — same SSR-safe hydration pattern as
  // app/jugar/wordle/page.tsx (spec §11).
  if (!hydrated) return null;

  return <DailyPuzzleHero puzzle={puzzle} streak={streak} alreadyPlayed={alreadyPlayed} />;
}
