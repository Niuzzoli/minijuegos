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

  it('migrates a legacy v1 (bare-date-keyed, always-Wordle) store to v2 composite keys', () => {
    const LEGACY_KEY = 'daily-puzzles-progress-v1';
    const legacyStore = {
      '2026-09-20': { game: 'wordle', status: 'won', attempts: [], completedAt: 'x' },
      '2026-09-21': { game: 'wordle', status: 'in-progress', attempts: [] },
    };
    window.localStorage.setItem(LEGACY_KEY, JSON.stringify(legacyStore));

    const migrated = loadProgressStore();
    expect(migrated).toEqual({
      'wordle:2026-09-20': { game: 'wordle', status: 'won', attempts: [], completedAt: 'x' },
      'wordle:2026-09-21': { game: 'wordle', status: 'in-progress', attempts: [] },
    });

    // The migration must have persisted under the new v2 key, not re-run
    // from the legacy key on every call.
    const persisted = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    expect(persisted).not.toBeNull();
    expect(JSON.parse(persisted as string)).toEqual(migrated);

    // A second call reads straight from v2 and returns the same result
    // (not re-migrating).
    expect(loadProgressStore()).toEqual(migrated);
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
