import { describe, it, expect } from 'vitest';
import { hashStringToSeed, createSeededRng, shuffleDeterministic } from './deterministic-shuffle';

describe('hashStringToSeed', () => {
  it('is deterministic for the same string', () => {
    expect(hashStringToSeed('connections-5')).toBe(hashStringToSeed('connections-5'));
  });

  it('different strings hash differently (verified for this exact pair: the strings differ only in their last character, 5 vs 6, so the rolling hash differs by exactly 1)', () => {
    expect(hashStringToSeed('connections-5')).not.toBe(hashStringToSeed('connections-6'));
  });
});

describe('createSeededRng', () => {
  it('is deterministic: the same seed produces the same sequence', () => {
    const a = createSeededRng(42);
    const b = createSeededRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('different seeds diverge', () => {
    expect(createSeededRng(1)()).not.toBe(createSeededRng(2)());
  });
});

describe('shuffleDeterministic', () => {
  const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  it('the same seed always produces the same order', () => {
    expect(shuffleDeterministic(items, 7)).toEqual(shuffleDeterministic(items, 7));
  });

  it('different seeds produce a different order (verified for this exact pair)', () => {
    expect(shuffleDeterministic(items, 1)).not.toEqual(shuffleDeterministic(items, 2));
  });

  it('the output is a permutation of the input (same elements, reordered, not just same length)', () => {
    const shuffled = shuffleDeterministic(items, 3);
    expect(shuffled).toHaveLength(items.length);
    expect([...shuffled].sort()).toEqual([...items].sort());
  });

  it('does not mutate the input array', () => {
    const original = [...items];
    shuffleDeterministic(items, 9);
    expect(items).toEqual(original);
  });
});
