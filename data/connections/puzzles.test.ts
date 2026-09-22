// data/connections/puzzles.test.ts
import { describe, it, expect } from 'vitest';
import { CONNECTIONS_PUZZLES } from './puzzles';
import type { ConnectionsColor } from '../../types/connections';

const ALL_COLORS: ConnectionsColor[] = ['yellow', 'green', 'blue', 'purple'];

describe('CONNECTIONS_PUZZLES pool', () => {
  it('has at least 60 puzzles', () => {
    expect(CONNECTIONS_PUZZLES.length).toBeGreaterThanOrEqual(60);
  });

  it('every puzzle has exactly 4 categories', () => {
    for (const puzzle of CONNECTIONS_PUZZLES) {
      expect(puzzle.categories).toHaveLength(4);
    }
  });

  it('every category has exactly 4 items', () => {
    for (const puzzle of CONNECTIONS_PUZZLES) {
      for (const category of puzzle.categories) {
        expect(category.items).toHaveLength(4);
      }
    }
  });

  it('all 16 items are unique within a puzzle', () => {
    for (const puzzle of CONNECTIONS_PUZZLES) {
      const allItems = puzzle.categories.flatMap((category) => category.items);
      expect(new Set(allItems).size).toBe(16);
    }
  });

  it('all 4 colors are present exactly once per puzzle', () => {
    for (const puzzle of CONNECTIONS_PUZZLES) {
      const colors = puzzle.categories.map((category) => category.color).slice().sort();
      expect(colors).toEqual([...ALL_COLORS].sort());
    }
  });

  it('no category has an empty or whitespace-only title', () => {
    for (const puzzle of CONNECTIONS_PUZZLES) {
      for (const category of puzzle.categories) {
        expect(category.title.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
