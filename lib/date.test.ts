import { describe, it, expect } from 'vitest';
import { diffInDays, getTodayKey, parseDateKey, resolveDebugDate } from './date';

describe('getTodayKey', () => {
  it('returns local YYYY-MM-DD, zero-padded', () => {
    expect(getTodayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('uses the local calendar day, not UTC', () => {
    // 21 Sep 2026, 23:30 local time — must still report the LOCAL day
    // regardless of what UTC date that instant falls on.
    expect(getTodayKey(new Date(2026, 8, 21, 23, 30))).toBe('2026-09-21');
  });
});

describe('parseDateKey', () => {
  it('round-trips with getTodayKey', () => {
    const date = parseDateKey('2026-09-21');
    expect(getTodayKey(date)).toBe('2026-09-21');
  });
});

describe('diffInDays', () => {
  it('returns 0 for the same local day at different times', () => {
    expect(diffInDays(new Date(2026, 5, 10, 8), new Date(2026, 5, 10, 22))).toBe(0);
  });

  it('returns 1 for consecutive days', () => {
    expect(diffInDays(new Date(2026, 5, 11), new Date(2026, 5, 10))).toBe(1);
  });

  it('returns a negative number when a is before b', () => {
    expect(diffInDays(new Date(2026, 0, 1), new Date(2026, 0, 5))).toBe(-4);
  });

  it('counts correctly across a leap day (2024)', () => {
    expect(diffInDays(new Date(2024, 2, 1), new Date(2024, 1, 28))).toBe(2);
  });
});

describe('resolveDebugDate', () => {
  it('returns null in production regardless of the param', () => {
    expect(resolveDebugDate('2026-09-25', true)).toBeNull();
  });

  it('returns null when there is no param', () => {
    expect(resolveDebugDate(null, false)).toBeNull();
  });

  it('returns null for a malformed string', () => {
    expect(resolveDebugDate('25-09-2026', false)).toBeNull();
  });

  it('returns null for a non-existent calendar date', () => {
    expect(resolveDebugDate('2026-02-30', false)).toBeNull();
  });

  it('parses a valid date string into a local Date', () => {
    const result = resolveDebugDate('2026-09-25', false);
    expect(result).not.toBeNull();
    expect(getTodayKey(result as Date)).toBe('2026-09-25');
  });
});
