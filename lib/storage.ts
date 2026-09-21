import type { DailyProgress, ProgressStore } from '../types/daily-progress';

export const PROGRESS_STORAGE_KEY = 'daily-puzzles-progress-v1';

export function loadProgressStore(): ProgressStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as ProgressStore) : {};
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
