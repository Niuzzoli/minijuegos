// lib/progress-filter.test.ts
import { describe, it, expect } from 'vitest';
import { filterStoreByGame } from './progress-filter';
import type { ProgressStore } from '../types/daily-progress';

describe('filterStoreByGame', () => {
  it('keeps only entries for the given game, keyed by plain date', () => {
    const store: ProgressStore = {
      'wordle:2026-09-20': { game: 'wordle', status: 'won', attempts: [] },
      'sudoku:2026-09-21': { game: 'sudoku', status: 'won', board: new Array(81).fill(1) },
    };
    expect(filterStoreByGame(store, 'wordle')).toEqual({
      '2026-09-20': { game: 'wordle', status: 'won', attempts: [] },
    });
    expect(filterStoreByGame(store, 'sudoku')).toEqual({
      '2026-09-21': { game: 'sudoku', status: 'won', board: new Array(81).fill(1) },
    });
  });

  it('returns an empty object for an empty store', () => {
    expect(filterStoreByGame({}, 'wordle')).toEqual({});
  });

  it('returns an empty object when no entries match the game', () => {
    const store: ProgressStore = {
      'wordle:2026-09-20': { game: 'wordle', status: 'won', attempts: [] },
    };
    expect(filterStoreByGame(store, 'sudoku')).toEqual({});
  });

  it('isolates each game entry for the SAME date without clobbering or leaking', () => {
    // The regression case that let C1 through: both games written on one
    // shared date. The store key is the single source of truth for which
    // game an entry belongs to — same-day collisions must not merge.
    const wordleEntry = { game: 'wordle' as const, status: 'won' as const, attempts: [] };
    const sudokuEntry = {
      game: 'sudoku' as const,
      status: 'won' as const,
      board: new Array(81).fill(0),
    };
    const store: ProgressStore = {
      'wordle:2026-09-22': wordleEntry,
      'sudoku:2026-09-22': sudokuEntry,
    };

    const wordleOnly = filterStoreByGame(store, 'wordle');
    const sudokuOnly = filterStoreByGame(store, 'sudoku');

    // Each game's filtered view has exactly its own entry for the shared
    // date, keyed by the plain date (prefix stripped) — not the composite key.
    expect(wordleOnly).toEqual({ '2026-09-22': wordleEntry });
    expect(sudokuOnly).toEqual({ '2026-09-22': sudokuEntry });

    // Output keys are plain dates, never still prefixed with the game name.
    expect(Object.keys(wordleOnly)).toEqual(['2026-09-22']);
    expect(Object.keys(sudokuOnly)).toEqual(['2026-09-22']);

    // Neither view leaks the other game's data for that date.
    expect(wordleOnly['2026-09-22']).not.toEqual(sudokuEntry);
    expect(sudokuOnly['2026-09-22']).not.toEqual(wordleEntry);
  });
});
