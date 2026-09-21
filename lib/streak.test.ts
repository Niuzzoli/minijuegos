import { describe, it, expect } from 'vitest';
import { calculateStreak } from './streak';
import type { ProgressStore } from '../types/daily-progress';

function won(dateKeys: string[]): ProgressStore {
  const store: ProgressStore = {};
  for (const key of dateKeys) {
    store[key] = { game: 'wordle', status: 'won', attempts: [], completedAt: `${key}T10:00:00Z` };
  }
  return store;
}

describe('calculateStreak', () => {
  it('returns 0/0 for no history', () => {
    expect(calculateStreak({}, '2026-09-21')).toEqual({ current: 0, best: 0 });
  });

  it('keeps best higher than current when the streak broke in the middle', () => {
    const store = won(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-10']);
    // 3-day streak (01-03), gap, then a lone win on the 10th (today).
    expect(calculateStreak(store, '2026-09-10')).toEqual({ current: 1, best: 3 });
  });

  it('counts the current streak as alive if the last win was yesterday', () => {
    const store = won(['2026-09-19', '2026-09-20']);
    expect(calculateStreak(store, '2026-09-21')).toEqual({ current: 2, best: 2 });
  });

  it('resets current to 0 but preserves best if the last win was 2+ days ago', () => {
    const store = won(['2026-09-17', '2026-09-18']);
    expect(calculateStreak(store, '2026-09-21')).toEqual({ current: 0, best: 2 });
  });

  it('extends the streak when today is already won', () => {
    const store = won(['2026-09-19', '2026-09-20', '2026-09-21']);
    expect(calculateStreak(store, '2026-09-21')).toEqual({ current: 3, best: 3 });
  });
});
