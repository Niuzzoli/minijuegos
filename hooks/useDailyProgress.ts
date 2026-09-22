'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DailyProgress, ProgressStore } from '../types/daily-progress';
import type { WordleAttempt } from '../types/wordle';
import { loadProgressStore, saveProgressStore, setDayProgress } from '../lib/storage';

export function useDailyProgress() {
  const [store, setStore] = useState<ProgressStore>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // One-time read of localStorage on mount to hydrate client-only state
    // — the standard SSR-safe pattern (spec §11), not the repeated-setState
    // cascading-renders case this lint rule targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStore(loadProgressStore());
    setHydrated(true);
  }, []);

  // Shared by recordAttempt/finishGame: compute the day's next progress
  // from its current value, persist it, and update state — the one place
  // that saves to localStorage instead of three.
  const updateDay = useCallback(
    (dateKey: string, buildProgress: (existing?: DailyProgress) => DailyProgress) => {
      setStore((current) => {
        const next = setDayProgress(current, dateKey, buildProgress(current[dateKey]));
        saveProgressStore(next);
        return next;
      });
    },
    [],
  );

  const recordAttempt = useCallback(
    (dateKey: string, attempt: WordleAttempt) => {
      updateDay(dateKey, (existing) => ({
        game: 'wordle',
        status: 'in-progress',
        attempts: [...(existing?.game === 'wordle' ? existing.attempts : []), attempt],
      }));
    },
    [updateDay],
  );

  const finishGame = useCallback(
    (dateKey: string, status: 'won' | 'lost') => {
      updateDay(dateKey, (existing) => ({
        game: 'wordle',
        status,
        attempts: existing?.game === 'wordle' ? existing.attempts : [],
        completedAt: new Date().toISOString(),
      }));
    },
    [updateDay],
  );

  return { store, hydrated, recordAttempt, finishGame };
}
