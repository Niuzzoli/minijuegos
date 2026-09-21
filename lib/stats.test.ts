import { describe, it, expect } from 'vitest';
import { calculateStats } from './stats';
import type { ProgressStore } from '../types/daily-progress';
import type { WordleAttempt } from '../types/wordle';

function fakeAttempts(count: number): WordleAttempt[] {
  return Array.from({ length: count }, () => ({
    guess: 'XXXXX',
    result: ['absent', 'absent', 'absent', 'absent', 'absent'],
  }));
}

describe('calculateStats', () => {
  it('returns all zeros for an empty store', () => {
    expect(calculateStats({}, '2026-09-21')).toEqual({
      played: 0,
      won: 0,
      winPercentage: 0,
      currentStreak: 0,
      bestStreak: 0,
      attemptsDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    });
  });

  it('computes played/won/winPercentage and the attempts distribution from mixed history', () => {
    const store: ProgressStore = {
      '2026-09-18': { game: 'wordle', status: 'won', attempts: fakeAttempts(3), completedAt: 'x' },
      '2026-09-19': { game: 'wordle', status: 'lost', attempts: fakeAttempts(6), completedAt: 'x' },
      '2026-09-20': { game: 'wordle', status: 'won', attempts: fakeAttempts(3), completedAt: 'x' },
      '2026-09-21': { game: 'wordle', status: 'in-progress', attempts: fakeAttempts(1) },
    };

    const stats = calculateStats(store, '2026-09-20');

    // 3 finished entries (18 won, 19 lost, 20 won) — the 21st is
    // in-progress and correctly excluded from `played`. The plan's
    // original assertions (played: 2, winPercentage: 100) ignored the
    // 'lost' entry that the fixture itself and the test's own name
    // ("mixed history") already include — fixed to match the fixture.
    expect(stats.played).toBe(3);
    expect(stats.won).toBe(2);
    expect(stats.winPercentage).toBe(67); // round(2/3 * 100)
    expect(stats.attemptsDistribution[3]).toBe(2);
    expect(stats.attemptsDistribution[1]).toBe(0);
  });
});
