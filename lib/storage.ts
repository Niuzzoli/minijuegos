import type { DailyProgress, ProgressStore } from '../types/daily-progress';

export const PROGRESS_STORAGE_KEY = 'daily-puzzles-progress-v2';

// v1 shipped before Sudoku existed, so every store key was a bare date and
// every entry was always Wordle. Kept only as a one-time migration source —
// see loadProgressStore below.
const LEGACY_PROGRESS_STORAGE_KEY_V1 = 'daily-puzzles-progress-v1';

export function loadProgressStore(): ProgressStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as ProgressStore) : {};
    }

    // No v2 data yet — check for a legacy v1 store to migrate once. v1 keys
    // were bare date strings for Wordle-only progress; migrate each entry to
    // the new `wordle:${dateKey}` composite key and persist under v2 so this
    // only runs once.
    const legacyRaw = window.localStorage.getItem(LEGACY_PROGRESS_STORAGE_KEY_V1);
    if (!legacyRaw) return {};
    const legacyParsed = JSON.parse(legacyRaw);
    if (!legacyParsed || typeof legacyParsed !== 'object') return {};

    const migrated: ProgressStore = {};
    for (const [dateKey, progress] of Object.entries(legacyParsed as Record<string, DailyProgress>)) {
      migrated[`wordle:${dateKey}`] = progress;
    }
    saveProgressStore(migrated);
    return migrated;
  } catch {
    return {};
  }
}

export function saveProgressStore(store: ProgressStore): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(store));
}

export function getDayProgress(store: ProgressStore, dateKey: string): DailyProgress | undefined {
  return store[dateKey];
}

export function setDayProgress(
  store: ProgressStore,
  dateKey: string,
  progress: DailyProgress,
): ProgressStore {
  return { ...store, [dateKey]: progress };
}
