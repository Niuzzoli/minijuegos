import type { ProgressStore } from '../types/daily-progress';

// Store keys are composite `${game}:${dateKey}` (see types/daily-progress.ts
// and lib/storage.ts) — the key is the single source of truth for which game
// an entry belongs to. Filtering strips the prefix so the result is a plain
// date-keyed ProgressStore, which is what calculateStreak/calculateStats
// expect (they treat store keys as date strings directly).
export function filterStoreByGame(store: ProgressStore, game: string): ProgressStore {
  const prefix = `${game}:`;
  const filtered: ProgressStore = {};
  for (const [key, progress] of Object.entries(store)) {
    if (key.startsWith(prefix)) filtered[key.slice(prefix.length)] = progress;
  }
  return filtered;
}
