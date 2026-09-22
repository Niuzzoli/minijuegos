// lib/progress-filter.test.ts
import { describe, it, expect } from 'vitest';
import { filterStoreByGame } from './progress-filter';
import type { ProgressStore } from '../types/daily-progress';

describe('filterStoreByGame', () => {
  it('keeps only entries for the given game', () => {
    const store: ProgressStore = {
      '2026-09-20': { game: 'wordle', status: 'won', attempts: [] },
      '2026-09-21': { game: 'sudoku', status: 'won', board: new Array(81).fill(1) },
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
      '2026-09-20': { game: 'wordle', status: 'won', attempts: [] },
    };
    expect(filterStoreByGame(store, 'sudoku')).toEqual({});
  });
});
