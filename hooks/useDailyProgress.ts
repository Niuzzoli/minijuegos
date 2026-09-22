'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DailyProgress, ProgressStore } from '../types/daily-progress';
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

  const updateDay = useCallback(
    (
      game: string,
      dateKey: string,
      buildProgress: (existing?: DailyProgress) => DailyProgress,
    ) => {
      setStore((current) => {
        const key = `${game}:${dateKey}`;
        const next = setDayProgress(current, key, buildProgress(current[key]));
        saveProgressStore(next);
        return next;
      });
    },
    [],
  );

  return { store, hydrated, updateDay };
}
