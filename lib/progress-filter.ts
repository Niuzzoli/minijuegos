import type { ProgressStore } from '../types/daily-progress';

export function filterStoreByGame(store: ProgressStore, game: string): ProgressStore {
  const filtered: ProgressStore = {};
  for (const [dateKey, progress] of Object.entries(store)) {
    if (progress.game === game) filtered[dateKey] = progress;
  }
  return filtered;
}
