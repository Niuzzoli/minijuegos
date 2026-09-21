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

  const persist = useCallback((next: ProgressStore) => {
    setStore(next);
    saveProgressStore(next);
  }, []);

  const recordAttempt = useCallback(
    (dateKey: string, attempt: WordleAttempt) => {
      setStore((current) => {
        const existing = current[dateKey];
        const progress: DailyProgress = {
          game: 'wordle',
          status: 'in-progress',
          attempts: [...(existing?.attempts ?? []), attempt],
        };
        const next = setDayProgress(current, dateKey, progress);
        saveProgressStore(next);
        return next;
      });
    },
    [],
  );

  const finishGame = useCallback(
    (dateKey: string, status: 'won' | 'lost') => {
      setStore((current) => {
        const existing = current[dateKey];
        const progress: DailyProgress = {
          game: 'wordle',
          status,
          attempts: existing?.attempts ?? [],
          completedAt: new Date().toISOString(),
        };
        const next = setDayProgress(current, dateKey, progress);
        saveProgressStore(next);
        return next;
      });
    },
    [],
  );

  return { store, hydrated, recordAttempt, finishGame, persist };
}
