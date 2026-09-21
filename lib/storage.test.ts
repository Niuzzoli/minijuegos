import { describe, it, expect, beforeEach } from 'vitest';
import {
  PROGRESS_STORAGE_KEY,
  loadProgressStore,
  saveProgressStore,
  getDayProgress,
  setDayProgress,
} from './storage';
import type { ProgressStore, DailyProgress } from '../types/daily-progress';

beforeEach(() => {
  window.localStorage.clear();
});

describe('loadProgressStore / saveProgressStore', () => {
  it('round-trips a store through localStorage', () => {
    const store: ProgressStore = {
      '2026-09-21': { game: 'wordle', status: 'won', attempts: [], completedAt: 'x' },
    };
    saveProgressStore(store);
    expect(loadProgressStore()).toEqual(store);
  });

  it('returns an empty object when nothing is stored', () => {
    expect(loadProgressStore()).toEqual({});
  });

  it('returns an empty object when the stored value is corrupted JSON', () => {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, '{not valid json');
    expect(loadProgressStore()).toEqual({});
  });
});

describe('getDayProgress / setDayProgress', () => {
  it('getDayProgress reads an existing entry', () => {
    const progress: DailyProgress = { game: 'wordle', status: 'in-progress', attempts: [] };
    const store: ProgressStore = { '2026-09-21': progress };
    expect(getDayProgress(store, '2026-09-21')).toBe(progress);
  });

  it('getDayProgress returns undefined for a missing entry', () => {
    expect(getDayProgress({}, '2026-09-21')).toBeUndefined();
  });

  it('setDayProgress returns a new store without mutating the original', () => {
    const original: ProgressStore = {};
    const progress: DailyProgress = { game: 'wordle', status: 'in-progress', attempts: [] };
    const updated = setDayProgress(original, '2026-09-21', progress);

    expect(updated).not.toBe(original);
    expect(original).toEqual({});
    expect(updated['2026-09-21']).toBe(progress);
  });
});
