// Runtime-safe deterministic shuffle — used by app/jugar/connections/page.tsx to derive
// a stable on-screen grid order from the day's puzzle id, so a page refresh mid-game
// never reshuffles the board (spec §6). Deliberately NOT importing from
// lib/sudoku-generator.ts, which is dev-tooling only (see that file's header comment) —
// this file exists specifically because Connections' shuffle IS meant to run at
// player-facing runtime, on every render, not just once at data-generation time.

export function hashStringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i);
  }
  return hash >>> 0;
}

export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleDeterministic<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  const rng = createSeededRng(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
