'use client';

import { useEffect, useState } from 'react';
import { getTodayKey, resolveDebugDate } from '../lib/date';

function computeToday(): { todayKey: string; today: Date } {
  if (typeof window === 'undefined') {
    const today = new Date();
    return { todayKey: getTodayKey(today), today };
  }

  const params = new URLSearchParams(window.location.search);
  const debugDate = resolveDebugDate(
    params.get('debugDate'),
    process.env.NODE_ENV === 'production',
  );
  const today = debugDate ?? new Date();
  return { todayKey: getTodayKey(today), today };
}

export function useTodayKey(): { todayKey: string; today: Date } {
  const [value, setValue] = useState(computeToday);

  useEffect(() => {
    const recompute = () => {
      const next = computeToday();
      setValue((current) => (current.todayKey === next.todayKey ? current : next));
    };

    recompute();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') recompute();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', recompute);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', recompute);
    };
  }, []);

  return value;
}
