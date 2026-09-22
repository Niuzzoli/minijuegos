# Connections (v3 third game) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Connections as a third playable daily-puzzle game alongside the already-shipped Wordle and Sudoku, with its own deterministic daily puzzle drawn from a hand-curated pool of ≥60 Spanish-language puzzles, its own streak/stats section, and a game page that reuses the already-generic `useDailyProgress`/`filterStoreByGame` infrastructure without further refactoring it.

**Architecture:** A hand-curated pool of 60 puzzles (4 categories × 4 items each, committed as static data — same shape as Wordle's word list and Sudoku's board pool) is selected daily via the same epoch-day-modulo scheme (`dailyIndexForPool`) the other two games already use. `DailyProgress` and `DailyPuzzle` each gain a `'connections'` variant on their existing discriminated unions. A new pure `lib/connections-engine.ts` evaluates guesses against the day's 4 categories, and a new pure `lib/deterministic-shuffle.ts` derives the on-screen grid order from the puzzle's `id` so a mid-game refresh never reshuffles the board. Unlike the Sudoku plan, this plan needs **no cross-cutting refactor tasks**: `useDailyProgress`'s `updateDay(game, dateKey, build)` primitive, `filterStoreByGame(store, game)`, and `getDailyWordlePuzzle`/`getDailySudokuPuzzle`'s narrowed `Extract<DailyPuzzle, {game: ...}>` return types are already fully generic as of the Sudoku work — confirmed by reading all of them before writing this plan (see each task's Interfaces block for the exact current signatures).

**Tech Stack:** Next.js (App Router) + React + TypeScript + Tailwind + `lucide-react`, Vitest for unit tests. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-22-connections-design.md` (this plan argues from that spec — executors should read both).

## Global Constraints

- No backend, database, auth, or external API — everything client-side, persisted only to `localStorage` (spec 2026-09-21 §Stack, unchanged).
- Package manager: npm.
- Connections **does** have a losing state — `status` uses the full `GameStatus` (`'in-progress' | 'won' | 'lost'`), unlike Sudoku (spec §2, §3, §7).
- `ProgressStore` keys are the composite `` `${game}:${dateKey}` `` scheme fixed by the Sudoku plan — every Connections read/write goes through `updateDay('connections', dateKey, ...)` / `filterStoreByGame(store, 'connections')`, never a bare `dateKey` (spec §3).
- v3 scope excludes: a "shuffle" button, a timer, a mistakes distribution in stats, variable puzzle difficulty, Memory (spec §2).
- Connections puzzle pool: `data/connections/puzzles.ts`, hand-curated, **≥60 entries**, each with exactly 4 categories of exactly 4 items, 16 unique items per puzzle, all 4 `ConnectionsColor` values present exactly once per puzzle (spec §4, §12). This plan ships the full 60 directly in Task 7 — see that task's note on real-content verification.
- `LAUNCH_DATE` (`lib/daily-puzzle.ts`) must never change — every game's daily index depends on it (carried over from the Wordle/Sudoku specs, still binding).
- Every interactive control needs a real `aria-label`; selection/mistake-count affordances must not be color-only (spec §10).
- Grid order is derived deterministically from `puzzle.id` on every render (no client-side `Math.random()`), so a refresh mid-game never reshuffles the board (spec §6).

**One deliberate addition beyond the spec's exact component list, flagged here rather than silently:** spec §9 says `ConnectionsCategoryBanner` shows solved categories "or the 4, if `status === 'lost'`, in which case the unsolved ones are shown too but visually distinguished from the ones the player actually got right." The spec doesn't give `ConnectionsCategoryBanner` an explicit prop for this. This plan adds an optional `solved?: boolean` prop (default `true`) to the component (Task 10) precisely to satisfy that requirement without a color-only affordance (reduced opacity **plus** a real `"(no resuelta)"` text suffix) — documented here so Task 13's page usage doesn't look unmotivated.

---

## Task 1: `types/connections.ts`

**Files:**
- Create: `types/connections.ts`

**Interfaces:**
- Produces: `ConnectionsColor`, `ConnectionsCategory`, consumed starting at Task 2.

Pure type file — no test needed (nothing to execute).

- [ ] **Step 1: Create the type file**

```ts
// types/connections.ts
export type ConnectionsColor = 'yellow' | 'green' | 'blue' | 'purple';

export type ConnectionsCategory = {
  title: string; // the reason for the grouping, hidden until solved
  color: ConnectionsColor; // yellow = easiest -> purple = most obscure/wordplay
  items: string[]; // exactly 4
};
```

- [ ] **Step 2: Commit**

```bash
git add types/connections.ts
git commit -m "feat(connections): add ConnectionsColor/ConnectionsCategory types"
```

---

## Task 2: Extend `DailyPuzzle` with the Connections variant

**Files:**
- Modify: `types/daily-puzzle.ts`

**Interfaces:**
- Consumes: `ConnectionsCategory` (Task 1).
- Produces: `DailyPuzzle` is now a 3-member union; Task 6 and later that read `.categories` must first narrow on `game === 'connections'`.

Current content (read before editing):

```ts
export type DailyPuzzle =
  | { id: string; date: string; game: 'wordle'; solution: string }
  | { id: string; date: string; game: 'sudoku'; givens: string; solution: string };
```

No test needed (pure type change); Task 6's tests exercise it through real puzzle-selection behavior.

- [ ] **Step 1: Add the connections member to the union**

```ts
import type { ConnectionsCategory } from './connections';

export type DailyPuzzle =
  | { id: string; date: string; game: 'wordle'; solution: string }
  | { id: string; date: string; game: 'sudoku'; givens: string; solution: string }
  | { id: string; date: string; game: 'connections'; categories: ConnectionsCategory[] };
```

- [ ] **Step 2: Commit**

```bash
git add types/daily-puzzle.ts
git commit -m "feat(connections): add connections variant to DailyPuzzle union"
```

---

## Task 3: Extend `DailyProgress` with the Connections variant

**Files:**
- Modify: `types/daily-progress.ts`

**Interfaces:**
- Consumes: `ConnectionsColor`, `ConnectionsCategory` (Task 1), `GameStatus` (already defined in this file).
- Produces: `DailyProgress` is now a 3-member union, consumed everywhere from Task 8 on.

Current content (read before editing):

```ts
import type { WordleAttempt } from './wordle';
import type { SudokuBoard } from './sudoku';

export type GameStatus = 'in-progress' | 'won' | 'lost';

export type DailyProgress =
  | { game: 'wordle'; status: GameStatus; attempts: WordleAttempt[]; completedAt?: string }
  | { game: 'sudoku'; status: 'in-progress' | 'won'; board: SudokuBoard; completedAt?: string };

export type ProgressStore = Record<string, DailyProgress>;
```

This task must leave the build compiling and every pre-existing test passing with zero
assertion changes — it is a pure additive type change. No existing consumer reads a
`'connections'` entry today, so nothing needs narrowing yet (Tasks 8, 13, 15, 16 add the
narrowing as they're written).

- [ ] **Step 1: Add the connections member to the union**

```ts
import type { WordleAttempt } from './wordle';
import type { SudokuBoard } from './sudoku';
import type { ConnectionsColor, ConnectionsCategory } from './connections';

export type GameStatus = 'in-progress' | 'won' | 'lost';

export type DailyProgress =
  | { game: 'wordle'; status: GameStatus; attempts: WordleAttempt[]; completedAt?: string }
  | { game: 'sudoku'; status: 'in-progress' | 'won'; board: SudokuBoard; completedAt?: string }
  | {
      game: 'connections';
      status: GameStatus; // Connections DOES use 'lost' (spec §2/§7), unlike Sudoku
      solvedCategories: ConnectionsCategory[]; // in solve order
      mistakesMade: number; // 0-4
      guessHistory: ConnectionsColor[][]; // each submitted guess's 4 item colors, in guess order
      completedAt?: string;
    };

export type ProgressStore = Record<string, DailyProgress>;
```

- [ ] **Step 2: Verify zero regressions**

Run: `npm run build` — expected: compiles clean.
Run: `npm run test` — expected: full existing suite passes unchanged (nothing reads `.game === 'connections'` yet, so this is a type-only addition).

- [ ] **Step 3: Commit**

```bash
git add types/daily-progress.ts
git commit -m "feat(connections): add connections variant to DailyProgress union"
```

---

## Task 4: `lib/connections-engine.ts` — guess evaluation

**Files:**
- Create: `lib/connections-engine.ts`
- Test: `lib/connections-engine.test.ts`

**Interfaces:**
- Consumes: `ConnectionsCategory`, `ConnectionsColor` (Task 1).
- Produces: `MAX_MISTAKES: number`, `GuessResult` (a discriminated union), `evaluateGuess(selectedItems: readonly string[], categories: readonly ConnectionsCategory[]): GuessResult`, `colorForItem(item: string, categories: readonly ConnectionsCategory[]): ConnectionsColor | null` — all consumed by Task 13 (`app/jugar/connections/page.tsx`).

This is the runtime library the shipped game page imports directly (unlike Sudoku's
`lib/sudoku-generator.ts`, which is dev-tooling only).

- [ ] **Step 1: Write the failing tests**

```ts
// lib/connections-engine.test.ts
import { describe, it, expect } from 'vitest';
import { evaluateGuess, colorForItem, MAX_MISTAKES } from './connections-engine';
import type { ConnectionsCategory } from '../types/connections';

const CATEGORIES: ConnectionsCategory[] = [
  { title: 'Frutas', color: 'yellow', items: ['Manzana', 'Banana', 'Pera', 'Uva'] },
  { title: 'Verduras', color: 'green', items: ['Zanahoria', 'Lechuga', 'Cebolla', 'Tomate'] },
  { title: 'Instrumentos', color: 'blue', items: ['Guitarra', 'Violín', 'Arpa', 'Bajo'] },
  {
    title: 'Empiezan con PAN',
    color: 'purple',
    items: ['Pantalla', 'Pantera', 'Pantano', 'Panqueque'],
  },
];

describe('MAX_MISTAKES', () => {
  it('is 4', () => {
    expect(MAX_MISTAKES).toBe(4);
  });
});

describe('evaluateGuess', () => {
  it('returns "correct" with the matched category for a full 4/4 match', () => {
    const result = evaluateGuess(['Manzana', 'Banana', 'Pera', 'Uva'], CATEGORIES);
    expect(result).toEqual({ kind: 'correct', category: CATEGORIES[0] });
  });

  it('returns "one-away" for exactly 3 of 4 from the same category', () => {
    const result = evaluateGuess(['Manzana', 'Banana', 'Pera', 'Zanahoria'], CATEGORIES);
    expect(result).toEqual({ kind: 'one-away' });
  });

  it('returns "wrong" for a 2-2 split across two categories', () => {
    const result = evaluateGuess(['Manzana', 'Banana', 'Zanahoria', 'Lechuga'], CATEGORIES);
    expect(result).toEqual({ kind: 'wrong' });
  });

  it('returns "wrong" for a 2-1-1 split across three categories', () => {
    const result = evaluateGuess(['Manzana', 'Banana', 'Zanahoria', 'Guitarra'], CATEGORIES);
    expect(result).toEqual({ kind: 'wrong' });
  });
});

describe('colorForItem', () => {
  it('finds the color of a known item', () => {
    expect(colorForItem('Guitarra', CATEGORIES)).toBe('blue');
  });

  it('returns null for an item not in any category', () => {
    expect(colorForItem('Inexistente', CATEGORIES)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- lib/connections-engine.test.ts`
Expected: FAIL (module doesn't exist).

- [ ] **Step 3: Implement**

```ts
// lib/connections-engine.ts
import type { ConnectionsCategory, ConnectionsColor } from '../types/connections';

export const MAX_MISTAKES = 4;

export type GuessResult =
  | { kind: 'correct'; category: ConnectionsCategory }
  | { kind: 'one-away' }
  | { kind: 'wrong' };

export function evaluateGuess(
  selectedItems: readonly string[],
  categories: readonly ConnectionsCategory[],
): GuessResult {
  let bestMatchCount = 0;
  let bestMatchCategory: ConnectionsCategory | null = null;

  for (const category of categories) {
    const matchCount = selectedItems.filter((item) => category.items.includes(item)).length;
    if (matchCount > bestMatchCount) {
      bestMatchCount = matchCount;
      bestMatchCategory = category;
    }
  }

  if (bestMatchCount === 4 && bestMatchCategory) {
    return { kind: 'correct', category: bestMatchCategory };
  }
  if (bestMatchCount === 3) {
    return { kind: 'one-away' };
  }
  return { kind: 'wrong' };
}

export function colorForItem(
  item: string,
  categories: readonly ConnectionsCategory[],
): ConnectionsColor | null {
  const found = categories.find((category) => category.items.includes(item));
  return found ? found.color : null;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test -- lib/connections-engine.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/connections-engine.ts lib/connections-engine.test.ts
git commit -m "feat(connections): add guess evaluation engine"
```

---

## Task 5: `lib/deterministic-shuffle.ts` — deterministic grid ordering

**Files:**
- Create: `lib/deterministic-shuffle.ts`
- Test: `lib/deterministic-shuffle.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `hashStringToSeed(str: string): number`, `createSeededRng(seed: number): () => number`, `shuffleDeterministic<T>(items: readonly T[], seed: number): T[]` — consumed by Task 13 (`app/jugar/connections/page.tsx`), called as `shuffleDeterministic(allItems, hashStringToSeed(puzzle.id))`.

**Intentionally separate from `lib/sudoku-generator.ts`**: that file's own header comment
says it's dev-tooling never imported by a player-facing page (Sudoku never generates
boards at runtime). Connections' grid order, by contrast, **is** computed at runtime on
every render of the game page, so it needs its own small, genuinely runtime-safe RNG.
Duplicating the ~10-line mulberry32 algorithm here (rather than importing the dev-only
file) keeps that boundary honest.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/deterministic-shuffle.test.ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- lib/deterministic-shuffle.test.ts`
Expected: FAIL (module doesn't exist).

If, after implementing, the "different seeds produce a different order" test happens to
fail for seeds 1/2 specifically (extremely unlikely with the avalanche mixing below, but
not mathematically impossible for a given array), pick a different concrete pair (e.g. 1
and 3) — don't weaken the assertion to something order-insensitive.

- [ ] **Step 3: Implement**

```ts
// lib/deterministic-shuffle.ts
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test -- lib/deterministic-shuffle.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/deterministic-shuffle.ts lib/deterministic-shuffle.test.ts
git commit -m "feat(connections): add deterministic-shuffle for stable grid order"
```

---

## Task 6: Daily selection — add `getDailyConnectionsPuzzle`

**Files:**
- Modify: `lib/daily-puzzle.ts`
- Modify: `lib/daily-puzzle.test.ts`

**Interfaces:**
- Consumes: `DailyPuzzle` union (Task 2).
- Produces: `getDailyConnectionsPuzzle(date: Date, puzzles: readonly { categories: ConnectionsCategory[] }[]): Extract<DailyPuzzle, { game: 'connections' }>` — consumed by Task 13.

Current content of `lib/daily-puzzle.ts` (confirmed by reading it before writing this
plan — `getDailyWordlePuzzle`/`getDailySudokuPuzzle` **already** return the narrowed
`Extract<DailyPuzzle, {game:...}>` type, not the full union, following the fix that
landed on top of the Sudoku plan. `getDailyConnectionsPuzzle` gets the same treatment
from the start, so no later task has to work around an unnarrowed return type):

```ts
import type { DailyPuzzle } from '../types/daily-puzzle';
import { diffInDays, getTodayKey } from './date';

export const LAUNCH_DATE = new Date(2024, 0, 1);

function nonNegativeModulo(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function dailyIndexForPool(date: Date, poolLength: number): number {
  const daysSinceLaunch = diffInDays(date, LAUNCH_DATE);
  return nonNegativeModulo(daysSinceLaunch, poolLength);
}

export function getDailyWordlePuzzle(
  date: Date,
  solutions: readonly string[],
): Extract<DailyPuzzle, { game: 'wordle' }> {
  const index = dailyIndexForPool(date, solutions.length);
  return { id: `wordle-${index}`, date: getTodayKey(date), game: 'wordle', solution: solutions[index] };
}

export function getDailySudokuPuzzle(
  date: Date,
  puzzles: readonly { givens: string; solution: string }[],
): Extract<DailyPuzzle, { game: 'sudoku' }> {
  const index = dailyIndexForPool(date, puzzles.length);
  return {
    id: `sudoku-${index}`,
    date: getTodayKey(date),
    game: 'sudoku',
    givens: puzzles[index].givens,
    solution: puzzles[index].solution,
  };
}
```

- [ ] **Step 1: Add the failing tests first**

Append to `lib/daily-puzzle.test.ts` (existing `getDailyWordlePuzzle`/`getDailySudokuPuzzle`
describe blocks and their import line stay untouched — just widen the import and add a
new describe block):

```ts
// change the import line to also pull in getDailyConnectionsPuzzle:
import { getDailyWordlePuzzle, getDailySudokuPuzzle, getDailyConnectionsPuzzle, LAUNCH_DATE } from './daily-puzzle';
import type { ConnectionsCategory } from '../types/connections';

// ...existing getDailyWordlePuzzle and getDailySudokuPuzzle describe blocks unchanged...

function fakeCategories(label: string): ConnectionsCategory[] {
  return [
    { title: `${label}-Y`, color: 'yellow', items: ['a1', 'a2', 'a3', 'a4'] },
    { title: `${label}-G`, color: 'green', items: ['b1', 'b2', 'b3', 'b4'] },
    { title: `${label}-B`, color: 'blue', items: ['c1', 'c2', 'c3', 'c4'] },
    { title: `${label}-P`, color: 'purple', items: ['d1', 'd2', 'd3', 'd4'] },
  ];
}

const connectionsPuzzles = [
  { categories: fakeCategories('one') },
  { categories: fakeCategories('two') },
  { categories: fakeCategories('three') },
];

describe('getDailyConnectionsPuzzle', () => {
  it('is deterministic: same date always returns the same puzzle', () => {
    const date = new Date(2026, 5, 15);
    expect(getDailyConnectionsPuzzle(date, connectionsPuzzles)).toEqual(
      getDailyConnectionsPuzzle(date, connectionsPuzzles),
    );
  });

  it('returns a different index on the next day (for a pool > 1)', () => {
    const day1 = getDailyConnectionsPuzzle(new Date(2026, 5, 15), connectionsPuzzles);
    const day2 = getDailyConnectionsPuzzle(new Date(2026, 5, 16), connectionsPuzzles);
    expect(day1.categories).not.toEqual(day2.categories);
  });

  it('wraps around after puzzles.length days', () => {
    const day0 = getDailyConnectionsPuzzle(LAUNCH_DATE, connectionsPuzzles);
    const wrapped = getDailyConnectionsPuzzle(
      new Date(
        LAUNCH_DATE.getFullYear(),
        LAUNCH_DATE.getMonth(),
        LAUNCH_DATE.getDate() + connectionsPuzzles.length,
      ),
      connectionsPuzzles,
    );
    expect(wrapped.categories).toEqual(day0.categories);
  });

  it('includes the correct date key and game field', () => {
    const date = new Date(2026, 8, 21);
    const puzzle = getDailyConnectionsPuzzle(date, connectionsPuzzles);
    expect(puzzle.date).toBe('2026-09-21');
    expect(puzzle.game).toBe('connections');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- lib/daily-puzzle.test.ts`
Expected: FAIL (`getDailyConnectionsPuzzle` not exported yet), existing Wordle/Sudoku tests in the same file still pass.

- [ ] **Step 3: Implement**

Add to `lib/daily-puzzle.ts` (below `getDailySudokuPuzzle`, import `ConnectionsCategory` alongside the existing `DailyPuzzle` import):

```ts
import type { ConnectionsCategory } from '../types/connections';

// ...LAUNCH_DATE, nonNegativeModulo, dailyIndexForPool, getDailyWordlePuzzle,
// getDailySudokuPuzzle unchanged...

export function getDailyConnectionsPuzzle(
  date: Date,
  puzzles: readonly { categories: ConnectionsCategory[] }[],
): Extract<DailyPuzzle, { game: 'connections' }> {
  const index = dailyIndexForPool(date, puzzles.length);
  return {
    id: `connections-${index}`,
    date: getTodayKey(date),
    game: 'connections',
    categories: puzzles[index].categories,
  };
}
```

- [ ] **Step 4: Run to verify it passes, then the full suite**

Run: `npm run test -- lib/daily-puzzle.test.ts` — expected: PASS, all describe blocks (Wordle, Sudoku, Connections).
Run: `npm run test` — expected: full suite green, zero regressions.
Run: `npm run build` — expected: compiles clean.

- [ ] **Step 5: Commit**

```bash
git add lib/daily-puzzle.ts lib/daily-puzzle.test.ts
git commit -m "feat(connections): add getDailyConnectionsPuzzle"
```

---

## Task 7: Curated puzzle pool — `data/connections/puzzles.ts`

**Files:**
- Test: `data/connections/puzzles.test.ts` (written first — TDD for data, same pattern as `data/sudoku/puzzles.test.ts`)
- Create: `data/connections/puzzles.ts`

**Interfaces:**
- Consumes: `ConnectionsCategory`, `ConnectionsColor` (Task 1).
- Produces: `CONNECTIONS_PUZZLES: { categories: ConnectionsCategory[] }[]`, consumed by Task 6's `getDailyConnectionsPuzzle` call site (Task 13).

**Real-content note (read before skipping ahead):** this task ships **60 fully
hand-authored puzzles inline below** — the pool already meets the spec's `length >= 60`
bar as written in this plan; there is no "top up later" follow-up step needed for this
plan. Each puzzle: yellow = the most obvious grouping, purple = the most
obscure/wordplay-based one (spec §4), 16 unique items, no repeated item within a puzzle
(repeats *across* different puzzles in the pool are fine and not tested). Several
puzzles include a deliberate "genre trap" — an item that plausibly reads as belonging to
a different category in the same puzzle (spec §4's "trampa cruzada") — as the pool's
general norm, not a hard per-puzzle rule, matching spec §4 exactly.

- [ ] **Step 1: Write the data-integrity test**

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- data/connections/puzzles.test.ts`
Expected: FAIL (`./puzzles` module doesn't exist).

- [ ] **Step 3: Write the puzzle pool**

```ts
// data/connections/puzzles.ts
import type { ConnectionsCategory } from '../../types/connections';

export const CONNECTIONS_PUZZLES: { categories: ConnectionsCategory[] }[] = [
  {
    categories: [
      { title: 'Frutas', color: 'yellow', items: ['Manzana', 'Banana', 'Pera', 'Uva'] },
      { title: 'Verduras', color: 'green', items: ['Zanahoria', 'Lechuga', 'Cebolla', 'Tomate'] },
      { title: 'Instrumentos de cuerda', color: 'blue', items: ['Guitarra', 'Violín', 'Arpa', 'Bajo'] },
      { title: 'Empiezan con "PAN"', color: 'purple', items: ['Pantalla', 'Pantera', 'Pantano', 'Panqueque'] },
    ],
  },
  {
    categories: [
      { title: 'Planetas', color: 'yellow', items: ['Marte', 'Venus', 'Júpiter', 'Saturno'] },
      { title: 'Signos del zodíaco', color: 'green', items: ['Aries', 'Tauro', 'Géminis', 'Leo'] },
      { title: 'Dioses romanos', color: 'blue', items: ['Baco', 'Vulcano', 'Neptuno', 'Plutón'] },
      { title: 'Contienen "SOL"', color: 'purple', items: ['Soltar', 'Soldado', 'Consola', 'Absoluto'] },
    ],
  },
  {
    categories: [
      { title: 'Colores', color: 'yellow', items: ['Rojo', 'Azul', 'Verde', 'Amarillo'] },
      { title: 'Piezas de ajedrez', color: 'green', items: ['Torre', 'Caballo', 'Alfil', 'Peón'] },
      { title: 'Palos de la baraja española', color: 'blue', items: ['Oro', 'Copa', 'Espada', 'Basto'] },
      { title: 'Sinónimos de "astuto"', color: 'purple', items: ['Vivo', 'Zorro', 'Ladino', 'Pícaro'] },
    ],
  },
  {
    categories: [
      { title: 'Animales domésticos', color: 'yellow', items: ['Perro', 'Gato', 'Conejo', 'Hámster'] },
      { title: 'Aves', color: 'green', items: ['Águila', 'Cóndor', 'Loro', 'Búho'] },
      { title: 'Instrumentos de percusión', color: 'blue', items: ['Tambor', 'Platillos', 'Bongó', 'Xilófono'] },
      { title: 'Terminan en "-ERO"', color: 'purple', items: ['Sombrero', 'Cocinero', 'Sendero', 'Llavero'] },
    ],
  },
  {
    categories: [
      { title: 'Deportes con pelota', color: 'yellow', items: ['Fútbol', 'Básquet', 'Tenis', 'Vóley'] },
      { title: 'Partes de un auto', color: 'green', items: ['Motor', 'Volante', 'Freno', 'Neumático'] },
      { title: 'Bailes latinos', color: 'blue', items: ['Salsa', 'Tango', 'Merengue', 'Bachata'] },
      { title: 'Antónimos de "grande"', color: 'purple', items: ['Chico', 'Pequeño', 'Diminuto', 'Menudo'] },
    ],
  },
  {
    categories: [
      { title: 'Estaciones del año', color: 'yellow', items: ['Verano', 'Otoño', 'Invierno', 'Primavera'] },
      { title: 'Fases de la luna', color: 'green', items: ['Llena', 'Nueva', 'Creciente', 'Menguante'] },
      { title: 'Tipos de nubes', color: 'blue', items: ['Cúmulo', 'Estrato', 'Cirro', 'Nimbo'] },
      { title: 'Contienen "LUNA"', color: 'purple', items: ['Lunar', 'Lunático', 'Alunizar', 'Plenilunio'] },
    ],
  },
  {
    categories: [
      { title: 'Metales', color: 'yellow', items: ['Oro', 'Plata', 'Hierro', 'Cobre'] },
      { title: 'Piedras preciosas', color: 'green', items: ['Diamante', 'Esmeralda', 'Rubí', 'Zafiro'] },
      { title: 'Herramientas de carpintero', color: 'blue', items: ['Martillo', 'Sierra', 'Destornillador', 'Cincel'] },
      { title: 'Sinónimos de "brillante"', color: 'purple', items: ['Radiante', 'Reluciente', 'Resplandeciente', 'Luminoso'] },
    ],
  },
  {
    categories: [
      { title: 'Instrumentos de viento', color: 'yellow', items: ['Flauta', 'Trompeta', 'Saxofón', 'Clarinete'] },
      { title: 'Ríos de Sudamérica', color: 'green', items: ['Amazonas', 'Orinoco', 'Paraná', 'Magdalena'] },
      { title: 'Capitales de Sudamérica', color: 'blue', items: ['Lima', 'Quito', 'Bogotá', 'Asunción'] },
      { title: 'Terminan en "-ación"', color: 'purple', items: ['Nación', 'Estación', 'Vacación', 'Creación'] },
    ],
  },
  {
    categories: [
      { title: 'Muebles', color: 'yellow', items: ['Silla', 'Mesa', 'Sofá', 'Cama'] },
      { title: 'Electrodomésticos', color: 'green', items: ['Heladera', 'Lavarropas', 'Microondas', 'Tostadora'] },
      { title: 'Tipos de pan', color: 'blue', items: ['Baguette', 'Ciabatta', 'Pretzel', 'Focaccia'] },
      { title: 'Contienen "OSO"', color: 'purple', items: ['Curioso', 'Precioso', 'Gracioso', 'Chistoso'] },
    ],
  },
  {
    categories: [
      { title: 'Frutas tropicales', color: 'yellow', items: ['Mango', 'Piña', 'Papaya', 'Maracuyá'] },
      { title: 'Especias', color: 'green', items: ['Canela', 'Pimienta', 'Comino', 'Azafrán'] },
      { title: 'Quesos', color: 'blue', items: ['Mozzarella', 'Parmesano', 'Gouda', 'Roquefort'] },
      { title: 'Empiezan con "CASA"', color: 'purple', items: ['Casamiento', 'Casaca', 'Casabe', 'Casamata'] },
    ],
  },
  {
    categories: [
      { title: 'Figuras geométricas', color: 'yellow', items: ['Círculo', 'Cuadrado', 'Triángulo', 'Rectángulo'] },
      { title: 'Partes de una casa', color: 'green', items: ['Techo', 'Puerta', 'Ventana', 'Pared'] },
      { title: 'Sinónimos de "casa"', color: 'blue', items: ['Hogar', 'Vivienda', 'Morada', 'Domicilio'] },
      { title: 'Terminan en "-dad"', color: 'purple', items: ['Ciudad', 'Bondad', 'Verdad', 'Amistad'] },
    ],
  },
  {
    categories: [
      { title: 'Continentes', color: 'yellow', items: ['África', 'Europa', 'Asia', 'Oceanía'] },
      { title: 'Océanos', color: 'green', items: ['Pacífico', 'Atlántico', 'Índico', 'Ártico'] },
      { title: 'Puntos cardinales', color: 'blue', items: ['Norte', 'Sur', 'Este', 'Oeste'] },
      { title: 'Sinónimos de "amor"', color: 'purple', items: ['Cariño', 'Afecto', 'Ternura', 'Pasión'] },
    ],
  },
  {
    categories: [
      { title: 'Prendas de vestir', color: 'yellow', items: ['Camisa', 'Pantalón', 'Chaqueta', 'Falda'] },
      { title: 'Calzado', color: 'green', items: ['Zapatilla', 'Bota', 'Sandalia', 'Mocasín'] },
      { title: 'Accesorios', color: 'blue', items: ['Bufanda', 'Cinturón', 'Sombrero', 'Guante'] },
      { title: 'Terminan en "-ón" (aumentativo)', color: 'purple', items: ['Manchón', 'Portón', 'Caserón', 'Sillón'] },
    ],
  },
  {
    categories: [
      { title: 'Utensilios de cocina', color: 'yellow', items: ['Cuchara', 'Tenedor', 'Cuchillo', 'Sartén'] },
      { title: 'Bebidas calientes', color: 'green', items: ['Café', 'Té', 'Mate', 'Chocolate'] },
      { title: 'Postres', color: 'blue', items: ['Flan', 'Helado', 'Torta', 'Alfajor'] },
      { title: 'Empiezan con "TÉ"', color: 'purple', items: ['Técnico', 'Telón', 'Tétrico', 'Témpano'] },
    ],
  },
  {
    categories: [
      { title: 'Insectos', color: 'yellow', items: ['Hormiga', 'Abeja', 'Mariposa', 'Escarabajo'] },
      { title: 'Árboles', color: 'green', items: ['Roble', 'Pino', 'Sauce', 'Ceibo'] },
      { title: 'Flores', color: 'blue', items: ['Rosa', 'Tulipán', 'Margarita', 'Orquídea'] },
      { title: 'Contienen "FLOR"', color: 'purple', items: ['Florero', 'Floreciente', 'Aflorar', 'Florecilla'] },
    ],
  },
  {
    categories: [
      { title: 'Cuerpos celestes', color: 'yellow', items: ['Estrella', 'Cometa', 'Asteroide', 'Meteorito'] },
      { title: 'Constelaciones', color: 'green', items: ['Orión', 'Casiopea', 'Escorpio', 'Osa Mayor'] },
      { title: 'Planetas enanos', color: 'blue', items: ['Plutón', 'Ceres', 'Eris', 'Haumea'] },
      { title: 'Sinónimos de "brillar"', color: 'purple', items: ['Centellear', 'Relucir', 'Titilar', 'Refulgir'] },
    ],
  },
  {
    categories: [
      { title: 'Herramientas de jardín', color: 'yellow', items: ['Pala', 'Rastrillo', 'Regadera', 'Tijeras'] },
      { title: 'Verduras de raíz', color: 'green', items: ['Papa', 'Zanahoria', 'Remolacha', 'Rábano'] },
      { title: 'Cereales', color: 'blue', items: ['Trigo', 'Avena', 'Maíz', 'Cebada'] },
      { title: 'Sinónimos de "cultivar"', color: 'purple', items: ['Sembrar', 'Labrar', 'Cosechar', 'Plantar'] },
    ],
  },
  {
    categories: [
      { title: 'Instrumentos de medición', color: 'yellow', items: ['Regla', 'Termómetro', 'Balanza', 'Cronómetro'] },
      { title: 'Unidades de tiempo', color: 'green', items: ['Segundo', 'Minuto', 'Hora', 'Día'] },
      { title: 'Partes de un reloj', color: 'blue', items: ['Manecilla', 'Esfera', 'Péndulo', 'Engranaje'] },
      { title: 'Contienen "HORA"', color: 'purple', items: ['Ahora', 'Horario', 'Deshora', 'Enhorabuena'] },
    ],
  },
  {
    categories: [
      { title: 'Razas de perros', color: 'yellow', items: ['Labrador', 'Bulldog', 'Poodle', 'Beagle'] },
      { title: 'Razas de gatos', color: 'green', items: ['Persa', 'Siamés', 'Bengalí', 'Angora'] },
      { title: 'Animales marinos', color: 'blue', items: ['Delfín', 'Ballena', 'Pulpo', 'Tiburón'] },
      { title: 'Sonidos de animales', color: 'purple', items: ['Ladrido', 'Maullido', 'Rugido', 'Relincho'] },
    ],
  },
  {
    categories: [
      { title: 'Útiles escolares', color: 'yellow', items: ['Lápiz', 'Goma', 'Regla', 'Cuaderno'] },
      { title: 'Partes de un libro', color: 'green', items: ['Portada', 'Índice', 'Capítulo', 'Contratapa'] },
      { title: 'Géneros literarios', color: 'blue', items: ['Novela', 'Poesía', 'Ensayo', 'Teatro'] },
      { title: 'Sinónimos de "libro"', color: 'purple', items: ['Tomo', 'Volumen', 'Ejemplar', 'Obra'] },
    ],
  },
  {
    categories: [
      { title: 'Juegos de mesa', color: 'yellow', items: ['Ajedrez', 'Damas', 'Dominó', 'Backgammon'] },
      { title: 'Juegos de cartas', color: 'green', items: ['Póker', 'Truco', 'Canasta', 'Solitario'] },
      { title: 'Deportes olímpicos', color: 'blue', items: ['Natación', 'Atletismo', 'Esgrima', 'Remo'] },
      { title: 'Sinónimos de "ganar"', color: 'purple', items: ['Triunfar', 'Vencer', 'Conquistar', 'Prevalecer'] },
    ],
  },
  {
    categories: [
      { title: 'Tipos de pasta', color: 'yellow', items: ['Espagueti', 'Ravioli', 'Lasaña', 'Ñoquis'] },
      { title: 'Salsas', color: 'green', items: ['Bechamel', 'Pesto', 'Alioli', 'Mayonesa'] },
      { title: 'Ingredientes de pizza', color: 'blue', items: ['Muzzarella', 'Aceitunas', 'Orégano', 'Anchoas'] },
      { title: 'Palabras de origen italiano', color: 'purple', items: ['Piano', 'Pizza', 'Bravo', 'Diva'] },
    ],
  },
  {
    categories: [
      { title: 'Ciudades de España', color: 'yellow', items: ['Madrid', 'Barcelona', 'Sevilla', 'Valencia'] },
      { title: 'Comunidades autónomas', color: 'green', items: ['Cataluña', 'Andalucía', 'Galicia', 'Aragón'] },
      { title: 'Monumentos famosos', color: 'blue', items: ['Alhambra', 'Sagrada Familia', 'Escorial', 'Acueducto'] },
      { title: 'Gentilicios', color: 'purple', items: ['Bonaerense', 'Tinerfeño', 'Abulense', 'Ovetense'] },
    ],
  },
  {
    categories: [
      { title: 'Bailes de salón', color: 'yellow', items: ['Vals', 'Foxtrot', 'Chachachá', 'Bolero'] },
      { title: 'Ritmos musicales', color: 'green', items: ['Reggae', 'Jazz', 'Blues', 'Rock'] },
      { title: 'Instrumentos de teclado', color: 'blue', items: ['Piano', 'Órgano', 'Acordeón', 'Sintetizador'] },
      { title: 'Empiezan con "SON"', color: 'purple', items: ['Sonido', 'Sonrisa', 'Sonámbulo', 'Sonrojo'] },
    ],
  },
  {
    categories: [
      { title: 'Frutos secos', color: 'yellow', items: ['Almendra', 'Nuez', 'Avellana', 'Castaña'] },
      { title: 'Legumbres', color: 'green', items: ['Lenteja', 'Garbanzo', 'Poroto', 'Arveja'] },
      { title: 'Aceites', color: 'blue', items: ['Oliva', 'Girasol', 'Coco', 'Sésamo'] },
      { title: 'Sinónimos de "sano"', color: 'purple', items: ['Saludable', 'Robusto', 'Vigoroso', 'Lozano'] },
    ],
  },
  {
    categories: [
      { title: 'Emociones básicas', color: 'yellow', items: ['Alegría', 'Tristeza', 'Miedo', 'Sorpresa'] },
      { title: 'Estados de ánimo', color: 'green', items: ['Eufórico', 'Melancólico', 'Ansioso', 'Sereno'] },
      { title: 'Expresiones faciales', color: 'blue', items: ['Sonrisa', 'Ceño', 'Mueca', 'Guiño'] },
      { title: 'Antónimos de "triste"', color: 'purple', items: ['Alegre', 'Contento', 'Dichoso', 'Jubiloso'] },
    ],
  },
  {
    categories: [
      { title: 'Vehículos de dos ruedas', color: 'yellow', items: ['Bicicleta', 'Motocicleta', 'Triciclo', 'Monociclo'] },
      { title: 'Partes de una bicicleta', color: 'green', items: ['Manubrio', 'Pedal', 'Cadena', 'Cuadro'] },
      { title: 'Herramientas de mecánico', color: 'blue', items: ['Llave inglesa', 'Gato', 'Destornillador', 'Alicate'] },
      { title: 'Sinónimos de "veloz"', color: 'purple', items: ['Raudo', 'Rápido', 'Presuroso', 'Ligero'] },
    ],
  },
  {
    categories: [
      { title: 'Prendas de invierno', color: 'yellow', items: ['Bufanda', 'Gorro', 'Guantes', 'Campera'] },
      { title: 'Prendas de verano', color: 'green', items: ['Short', 'Malla', 'Sombrero', 'Sandalias'] },
      { title: 'Tipos de clima', color: 'blue', items: ['Tropical', 'Templado', 'Árido', 'Polar'] },
      { title: 'Contienen "NIEVE"', color: 'purple', items: ['Nevisca', 'Nevado', 'Aguanieve', 'Nevera'] },
    ],
  },
  {
    categories: [
      { title: 'Dispositivos electrónicos', color: 'yellow', items: ['Celular', 'Tablet', 'Laptop', 'Auricular'] },
      { title: 'Redes sociales', color: 'green', items: ['Instagram', 'Facebook', 'Twitter', 'TikTok'] },
      { title: 'Términos de internet', color: 'blue', items: ['Wifi', 'Enlace', 'Navegador', 'Servidor'] },
      { title: 'Verbos de anglicismos ("-ear")', color: 'purple', items: ['Chatear', 'Textear', 'Googlear', 'Tuitear'] },
    ],
  },
  {
    categories: [
      { title: 'Países de Europa', color: 'yellow', items: ['Francia', 'Italia', 'Alemania', 'Portugal'] },
      { title: 'Idiomas', color: 'green', items: ['Francés', 'Italiano', 'Alemán', 'Portugués'] },
      { title: 'Monedas', color: 'blue', items: ['Euro', 'Libra', 'Franco', 'Corona'] },
      { title: 'Empiezan con "EURO"', color: 'purple', items: ['Europa', 'Eurocopa', 'Eurodiputado', 'Eurozona'] },
    ],
  },
  {
    categories: [
      { title: 'Herramientas del pintor', color: 'yellow', items: ['Pincel', 'Paleta', 'Caballete', 'Lienzo'] },
      { title: 'Colores secundarios', color: 'green', items: ['Naranja', 'Violeta', 'Verde', 'Marrón'] },
      { title: 'Estilos artísticos', color: 'blue', items: ['Cubismo', 'Surrealismo', 'Impresionismo', 'Barroco'] },
      { title: 'Sinónimos de "obra de arte"', color: 'purple', items: ['Pieza', 'Creación', 'Composición', 'Cuadro'] },
    ],
  },
  {
    categories: [
      { title: 'Estados de la materia', color: 'yellow', items: ['Sólido', 'Líquido', 'Gaseoso', 'Plasma'] },
      { title: 'Instrumentos de laboratorio', color: 'green', items: ['Probeta', 'Microscopio', 'Matraz', 'Pipeta'] },
      { title: 'Elementos químicos', color: 'blue', items: ['Oxígeno', 'Hidrógeno', 'Carbono', 'Nitrógeno'] },
      { title: 'Contienen "GAS"', color: 'purple', items: ['Gaseosa', 'Gasolina', 'Gastar', 'Gasoducto'] },
    ],
  },
  {
    categories: [
      { title: 'Personajes de cuentos', color: 'yellow', items: ['Cenicienta', 'Caperucita', 'Pinocho', 'Blancanieves'] },
      { title: 'Criaturas fantásticas', color: 'green', items: ['Dragón', 'Unicornio', 'Duende', 'Hada'] },
      { title: 'Objetos mágicos', color: 'blue', items: ['Varita', 'Espejo', 'Anillo', 'Lámpara'] },
      { title: 'Sinónimos de "mago"', color: 'purple', items: ['Hechicero', 'Brujo', 'Encantador', 'Nigromante'] },
    ],
  },
  {
    categories: [
      { title: 'Compositores clásicos', color: 'yellow', items: ['Mozart', 'Beethoven', 'Bach', 'Chopin'] },
      { title: 'Formas musicales', color: 'green', items: ['Sinfonía', 'Sonata', 'Concierto', 'Ópera'] },
      { title: 'Términos de dinámica musical', color: 'blue', items: ['Forte', 'Piano', 'Crescendo', 'Andante'] },
      { title: 'Sinónimos de "melodía"', color: 'purple', items: ['Tonada', 'Canción', 'Aire', 'Cadencia'] },
    ],
  },
  {
    categories: [
      { title: 'Animales de granja', color: 'yellow', items: ['Vaca', 'Cerdo', 'Oveja', 'Gallina'] },
      { title: 'Productos lácteos', color: 'green', items: ['Leche', 'Queso', 'Yogur', 'Manteca'] },
      { title: 'Herramientas de granja', color: 'blue', items: ['Arado', 'Hoz', 'Guadaña', 'Carreta'] },
      { title: 'Sinónimos de "granja"', color: 'purple', items: ['Rancho', 'Hacienda', 'Estancia', 'Chacra'] },
    ],
  },
  {
    categories: [
      { title: 'Capitales de Europa', color: 'yellow', items: ['París', 'Roma', 'Berlín', 'Lisboa'] },
      { title: 'Ríos de Europa', color: 'green', items: ['Danubio', 'Rin', 'Sena', 'Támesis'] },
      { title: 'Cordilleras', color: 'blue', items: ['Alpes', 'Pirineos', 'Cárpatos', 'Apeninos'] },
      { title: 'Gentilicios europeos', color: 'purple', items: ['Vienés', 'Berlinés', 'Ginebrino', 'Florentino'] },
    ],
  },
  {
    categories: [
      { title: 'Signos de puntuación', color: 'yellow', items: ['Coma', 'Punto', 'Guion', 'Paréntesis'] },
      { title: 'Partes de la oración', color: 'green', items: ['Sujeto', 'Predicado', 'Verbo', 'Adjetivo'] },
      { title: 'Figuras retóricas', color: 'blue', items: ['Metáfora', 'Hipérbole', 'Ironía', 'Símil'] },
      { title: 'Contienen "COMA"', color: 'purple', items: ['Comarca', 'Comadreja', 'Comando', 'Comadre'] },
    ],
  },
  {
    categories: [
      { title: 'Peces de mar', color: 'yellow', items: ['Atún', 'Salmón', 'Merluza', 'Bacalao'] },
      { title: 'Peces de río', color: 'green', items: ['Trucha', 'Carpa', 'Dorado', 'Pejerrey'] },
      { title: 'Elementos de pesca', color: 'blue', items: ['Caña', 'Anzuelo', 'Red', 'Carrete'] },
      { title: 'Sinónimos de "atrapar"', color: 'purple', items: ['Capturar', 'Cazar', 'Apresar', 'Aprisionar'] },
    ],
  },
  {
    categories: [
      { title: 'Días festivos', color: 'yellow', items: ['Navidad', 'Pascua', 'Carnaval', 'Halloween'] },
      { title: 'Símbolos de Navidad', color: 'green', items: ['Árbol', 'Pesebre', 'Estrella', 'Guirnalda'] },
      { title: 'Postres navideños', color: 'blue', items: ['Turrón', 'Panetón', 'Rosca', 'Garrapiñada'] },
      { title: 'Sinónimos de "festejar"', color: 'purple', items: ['Celebrar', 'Conmemorar', 'Agasajar', 'Homenajear'] },
    ],
  },
  {
    categories: [
      { title: 'Herramientas de costura', color: 'yellow', items: ['Aguja', 'Dedal', 'Tijera', 'Alfiler'] },
      { title: 'Telas', color: 'green', items: ['Algodón', 'Seda', 'Lana', 'Lino'] },
      { title: 'Prendas tejidas', color: 'blue', items: ['Bufanda', 'Poncho', 'Gorro', 'Sweater'] },
      { title: 'Sinónimos de "coser"', color: 'purple', items: ['Zurcir', 'Remendar', 'Bordar', 'Hilvanar'] },
    ],
  },
  {
    categories: [
      { title: 'Bebidas alcohólicas', color: 'yellow', items: ['Vino', 'Cerveza', 'Whisky', 'Ron'] },
      { title: 'Tipos de vino', color: 'green', items: ['Tinto', 'Blanco', 'Rosado', 'Espumante'] },
      { title: 'Recipientes para beber', color: 'blue', items: ['Copa', 'Vaso', 'Jarra', 'Tazón'] },
      { title: 'Terminan en "-ín"', color: 'purple', items: ['Jardín', 'Violín', 'Camarín', 'Patín'] },
    ],
  },
  {
    categories: [
      { title: 'Roles teatrales', color: 'yellow', items: ['Actor', 'Actriz', 'Director', 'Guionista'] },
      { title: 'Partes de un teatro', color: 'green', items: ['Escenario', 'Telón', 'Palco', 'Butaca'] },
      { title: 'Géneros cinematográficos', color: 'blue', items: ['Comedia', 'Drama', 'Terror', 'Suspenso'] },
      { title: 'Sinónimos de "actuar"', color: 'purple', items: ['Interpretar', 'Representar', 'Encarnar', 'Personificar'] },
    ],
  },
  {
    categories: [
      { title: 'Materiales de escritura', color: 'yellow', items: ['Lapicera', 'Marcador', 'Tinta', 'Papel'] },
      { title: 'Materiales de dibujo', color: 'green', items: ['Carboncillo', 'Acuarela', 'Pastel', 'Crayón'] },
      { title: 'Tipos de letra (caligrafía)', color: 'blue', items: ['Cursiva', 'Imprenta', 'Gótica', 'Itálica'] },
      { title: 'Sinónimos de "escribir"', color: 'purple', items: ['Redactar', 'Plasmar', 'Anotar', 'Transcribir'] },
    ],
  },
  {
    categories: [
      { title: 'Partes de la cabeza', color: 'yellow', items: ['Frente', 'Mentón', 'Sien', 'Pómulo'] },
      { title: 'Partes de las extremidades', color: 'green', items: ['Codo', 'Rodilla', 'Muñeca', 'Tobillo'] },
      { title: 'Huesos del cuerpo', color: 'blue', items: ['Fémur', 'Cráneo', 'Costilla', 'Clavícula'] },
      { title: 'Sinónimos de "fuerte"', color: 'purple', items: ['Robusto', 'Vigoroso', 'Fornido', 'Recio'] },
    ],
  },
  {
    categories: [
      { title: 'Profesiones de la salud', color: 'yellow', items: ['Médico', 'Enfermero', 'Dentista', 'Farmacéutico'] },
      { title: 'Instrumentos médicos', color: 'green', items: ['Estetoscopio', 'Jeringa', 'Termómetro', 'Bisturí'] },
      { title: 'Especialidades médicas', color: 'blue', items: ['Cardiología', 'Pediatría', 'Dermatología', 'Neurología'] },
      { title: 'Sinónimos de "curar"', color: 'purple', items: ['Sanar', 'Aliviar', 'Restablecer', 'Recuperar'] },
    ],
  },
  {
    categories: [
      { title: 'Transporte público', color: 'yellow', items: ['Colectivo', 'Subte', 'Tren', 'Tranvía'] },
      { title: 'Vehículos aéreos', color: 'green', items: ['Avión', 'Helicóptero', 'Globo', 'Planeador'] },
      { title: 'Partes de un avión', color: 'blue', items: ['Ala', 'Cabina', 'Turbina', 'Fuselaje'] },
      { title: 'Sinónimos de "viajar"', color: 'purple', items: ['Desplazarse', 'Trasladarse', 'Circular', 'Transitar'] },
    ],
  },
  {
    categories: [
      { title: 'Materiales de construcción', color: 'yellow', items: ['Ladrillo', 'Cemento', 'Arena', 'Cal'] },
      { title: 'Herramientas de albañil', color: 'green', items: ['Llana', 'Nivel', 'Plomada', 'Carretilla'] },
      { title: 'Partes de un edificio', color: 'blue', items: ['Cimiento', 'Columna', 'Fachada', 'Balcón'] },
      { title: 'Sinónimos de "construir"', color: 'purple', items: ['Edificar', 'Erigir', 'Levantar', 'Fabricar'] },
    ],
  },
  {
    categories: [
      { title: 'Tipos de danza', color: 'yellow', items: ['Ballet', 'Flamenco', 'Tango', 'Jazz'] },
      { title: 'Elementos del ballet', color: 'green', items: ['Zapatillas', 'Tutú', 'Barra', 'Puntas'] },
      { title: 'Términos de danza clásica', color: 'blue', items: ['Plié', 'Arabesque', 'Pirueta', 'Jeté'] },
      { title: 'Sinónimos de "bailar"', color: 'purple', items: ['Danzar', 'Zapatear', 'Contonearse', 'Ondular'] },
    ],
  },
  {
    categories: [
      { title: 'Aparatos eléctricos', color: 'yellow', items: ['Lámpara', 'Ventilador', 'Enchufe', 'Interruptor'] },
      { title: 'Herramientas de electricista', color: 'green', items: ['Alicate', 'Destornillador', 'Multímetro', 'Cinta aisladora'] },
      { title: 'Fuentes de energía', color: 'blue', items: ['Solar', 'Eólica', 'Hidráulica', 'Nuclear'] },
      { title: 'Contienen "LUZ"', color: 'purple', items: ['Luciérnaga', 'Deslucir', 'Traslúcido', 'Reluciente'] },
    ],
  },
  {
    categories: [
      { title: 'Bebidas frías', color: 'yellow', items: ['Limonada', 'Granizado', 'Smoothie', 'Gaseosa'] },
      { title: 'Snacks salados', color: 'green', items: ['Papas fritas', 'Maní', 'Pretzels', 'Palomitas'] },
      { title: 'Dulces y golosinas', color: 'blue', items: ['Caramelo', 'Chicle', 'Chocolate', 'Turrón'] },
      { title: 'Sinónimos de "delicioso"', color: 'purple', items: ['Exquisito', 'Sabroso', 'Suculento', 'Apetitoso'] },
    ],
  },
  {
    categories: [
      { title: 'Partes de una flor', color: 'yellow', items: ['Pétalo', 'Tallo', 'Raíz', 'Polen'] },
      { title: 'Tipos de jardines', color: 'green', items: ['Botánico', 'Zen', 'Vertical', 'Colgante'] },
      { title: 'Herramientas de vivero', color: 'blue', items: ['Maceta', 'Regadera', 'Sustrato', 'Abono'] },
      { title: 'Sinónimos de "florecer"', color: 'purple', items: ['Brotar', 'Germinar', 'Retoñar', 'Reverdecer'] },
    ],
  },
  {
    categories: [
      { title: 'Ingredientes de repostería', color: 'yellow', items: ['Harina', 'Azúcar', 'Huevo', 'Manteca'] },
      { title: 'Utensilios de repostería', color: 'green', items: ['Batidora', 'Molde', 'Manga', 'Espátula'] },
      { title: 'Tipos de tortas', color: 'blue', items: ['Chocolate', 'Vainilla', 'Zanahoria', 'Red velvet'] },
      { title: 'Sinónimos de "dulce"', color: 'purple', items: ['Azucarado', 'Meloso', 'Empalagoso', 'Dulzón'] },
    ],
  },
  {
    categories: [
      { title: 'Cuerpos de agua', color: 'yellow', items: ['Río', 'Lago', 'Mar', 'Océano'] },
      { title: 'Fenómenos meteorológicos', color: 'green', items: ['Huracán', 'Tornado', 'Granizo', 'Ventisca'] },
      { title: 'Desastres naturales', color: 'blue', items: ['Terremoto', 'Tsunami', 'Erupción', 'Inundación'] },
      { title: 'Sinónimos de "tormenta"', color: 'purple', items: ['Tempestad', 'Borrasca', 'Vendaval', 'Temporal'] },
    ],
  },
  {
    categories: [
      { title: 'Cargos de una empresa', color: 'yellow', items: ['Gerente', 'Contador', 'Secretario', 'Recepcionista'] },
      { title: 'Objetos de oficina', color: 'green', items: ['Grapadora', 'Carpeta', 'Calculadora', 'Archivo'] },
      { title: 'Sinónimos de "trabajo"', color: 'blue', items: ['Empleo', 'Labor', 'Ocupación', 'Faena'] },
      { title: 'Sinónimos de "reunión"', color: 'purple', items: ['Asamblea', 'Junta', 'Convención', 'Congreso'] },
    ],
  },
  {
    categories: [
      { title: 'Bailes folclóricos argentinos', color: 'yellow', items: ['Chacarera', 'Zamba', 'Gato', 'Malambo'] },
      { title: 'Instrumentos folclóricos', color: 'green', items: ['Bombo', 'Charango', 'Guitarra criolla', 'Quena'] },
      { title: 'Prendas gauchas', color: 'blue', items: ['Poncho', 'Bombacha', 'Rastra', 'Boina'] },
      { title: 'Sinónimos de "fiesta"', color: 'purple', items: ['Festejo', 'Jolgorio', 'Parranda', 'Algarabía'] },
    ],
  },
  {
    categories: [
      { title: 'Deportes de raqueta', color: 'yellow', items: ['Tenis', 'Pádel', 'Bádminton', 'Squash'] },
      { title: 'Superficies de tenis', color: 'green', items: ['Arcilla', 'Césped', 'Cemento', 'Sintética'] },
      { title: 'Términos de tenis', color: 'blue', items: ['Saque', 'Volea', 'Revés', 'Drive'] },
      { title: 'Sinónimos de "competir"', color: 'purple', items: ['Rivalizar', 'Contender', 'Disputar', 'Enfrentar'] },
    ],
  },
  {
    categories: [
      { title: 'Términos de fotografía', color: 'yellow', items: ['Enfoque', 'Exposición', 'Obturador', 'Diafragma'] },
      { title: 'Partes de una cámara', color: 'green', items: ['Lente', 'Trípode', 'Flash', 'Visor'] },
      { title: 'Tipos de fotografía', color: 'blue', items: ['Retrato', 'Paisaje', 'Macro', 'Panorámica'] },
      { title: 'Sinónimos de "capturar"', color: 'purple', items: ['Retratar', 'Fotografiar', 'Inmortalizar', 'Registrar'] },
    ],
  },
  {
    categories: [
      { title: 'Ciencias exactas', color: 'yellow', items: ['Matemática', 'Física', 'Química', 'Astronomía'] },
      { title: 'Ramas de la biología', color: 'green', items: ['Botánica', 'Zoología', 'Genética', 'Ecología'] },
      { title: 'Ramas de la ingeniería', color: 'blue', items: ['Civil', 'Industrial', 'Electrónica', 'Mecánica'] },
      { title: 'Sinónimos de "estudiar"', color: 'purple', items: ['Investigar', 'Analizar', 'Examinar', 'Indagar'] },
    ],
  },
  {
    categories: [
      { title: 'Partes de un barco', color: 'yellow', items: ['Proa', 'Popa', 'Timón', 'Casco'] },
      { title: 'Términos náuticos', color: 'green', items: ['Estribor', 'Babor', 'Cubierta', 'Ancla'] },
      { title: 'Tipos de embarcaciones', color: 'blue', items: ['Velero', 'Catamarán', 'Canoa', 'Yate'] },
      { title: 'Sinónimos de "navegar"', color: 'purple', items: ['Surcar', 'Bogar', 'Zarpar', 'Flotar'] },
    ],
  },
  {
    categories: [
      { title: 'Deportes extremos', color: 'yellow', items: ['Escalada', 'Surf', 'Paracaidismo', 'Bungee'] },
      { title: 'Equipamiento de montaña', color: 'green', items: ['Piolet', 'Arnés', 'Casco', 'Cuerda'] },
      { title: 'Actividades al aire libre', color: 'blue', items: ['Trekking', 'Camping', 'Rafting', 'Ciclismo'] },
      { title: 'Sinónimos de "aventura"', color: 'purple', items: ['Hazaña', 'Odisea', 'Peripecia', 'Proeza'] },
    ],
  },
];
```

That's 60 entries. Before running the test, count the top-level `{ categories: [` blocks
to confirm — the pool must not silently be short by one from a copy/paste slip:

- [ ] **Step 4: Confirm the entry count before trusting the test**

Run: `grep -c "categories: \[" "data/connections/puzzles.ts"` (Bash) or
`(Select-String -Path data\connections\puzzles.ts -Pattern "categories: \[").Count`
(PowerShell) — expected: `60`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test -- data/connections/puzzles.test.ts`
Expected: PASS (6 tests). If any assertion fails, the failure message identifies which
puzzle/category is malformed (Vitest prints the failing array) — fix that specific
puzzle in the data file, don't weaken the test.

- [ ] **Step 6: Commit**

```bash
git add data/connections/puzzles.ts data/connections/puzzles.test.ts
git commit -m "feat(connections): add 60-puzzle curated Spanish pool"
```

---

## Task 8: Connections stats — `calculateConnectionsStats`

**Files:**
- Modify: `types/user-stats.ts`
- Modify: `lib/stats.ts`
- Modify: `lib/stats.test.ts` (additive only — existing `calculateStats`/`calculateSudokuStats` tests unchanged)

**Interfaces:**
- Consumes: `filterStoreByGame(store: ProgressStore, game: string): ProgressStore` (already generic — current signature confirmed by reading `lib/progress-filter.ts` before writing this plan; strips the `${game}:` key prefix and returns a plain date-keyed store), `calculateStreak` (pre-existing, unmodified).
- Produces: `ConnectionsStats` type; `calculateConnectionsStats(store: ProgressStore, todayKey: string): ConnectionsStats`, consumed by Task 13 and Task 16.

Current content of `types/user-stats.ts` (read before editing):

```ts
export type BaseGameStats = {
  played: number;
  won: number;
  winPercentage: number;
  currentStreak: number;
  bestStreak: number;
};

export type WordleStats = BaseGameStats & {
  attemptsDistribution: Record<1 | 2 | 3 | 4 | 5 | 6, number>;
};

export type SudokuStats = BaseGameStats;
```

- [ ] **Step 1: Add the type**

```ts
// append to types/user-stats.ts
export type ConnectionsStats = BaseGameStats;
```

- [ ] **Step 2: Write the failing tests**

Append to `lib/stats.test.ts` (its existing `calculateStats`/`calculateSudokuStats`
describe blocks and imports stay — just widen the import and add a new describe block):

```ts
// change the import line to also pull in calculateConnectionsStats:
import { calculateStats, calculateSudokuStats, calculateConnectionsStats } from './stats';

// ...existing calculateStats and calculateSudokuStats describe blocks unchanged...

describe('calculateConnectionsStats', () => {
  it('returns all zeros for an empty store', () => {
    expect(calculateConnectionsStats({}, '2026-09-21')).toEqual({
      played: 0,
      won: 0,
      winPercentage: 0,
      currentStreak: 0,
      bestStreak: 0,
    });
  });

  it('counts only connections entries, ignoring wordle/sudoku entries in the same store', () => {
    const store: ProgressStore = {
      'wordle:2026-09-19': { game: 'wordle', status: 'won', attempts: [] },
      'sudoku:2026-09-20': { game: 'sudoku', status: 'won', board: new Array(81).fill(1) },
      'connections:2026-09-21': {
        game: 'connections',
        status: 'won',
        solvedCategories: [],
        mistakesMade: 1,
        guessHistory: [],
        completedAt: 'x',
      },
    };
    const stats = calculateConnectionsStats(store, '2026-09-21');
    expect(stats.played).toBe(1);
    expect(stats.won).toBe(1);
    expect(stats.currentStreak).toBe(1);
  });

  it('a lost connections entry counts as played but not won', () => {
    const store: ProgressStore = {
      'connections:2026-09-21': {
        game: 'connections',
        status: 'lost',
        solvedCategories: [],
        mistakesMade: 4,
        guessHistory: [],
        completedAt: 'x',
      },
    };
    const stats = calculateConnectionsStats(store, '2026-09-21');
    expect(stats.played).toBe(1);
    expect(stats.won).toBe(0);
    expect(stats.currentStreak).toBe(0);
  });

  it('a wordle-only store filtered for connections yields all-zero stats', () => {
    const store: ProgressStore = {
      'wordle:2026-09-20': { game: 'wordle', status: 'won', attempts: [] },
    };
    expect(calculateConnectionsStats(store, '2026-09-20')).toEqual({
      played: 0,
      won: 0,
      winPercentage: 0,
      currentStreak: 0,
      bestStreak: 0,
    });
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test -- lib/stats.test.ts`
Expected: FAIL (`calculateConnectionsStats` not exported), existing `calculateStats`/`calculateSudokuStats` tests still pass.

- [ ] **Step 4: Implement**

In `lib/stats.ts`, widen the type import and add the new function (existing
`calculateStats`/`calculateSudokuStats` bodies are untouched):

```ts
import type { ProgressStore } from '../types/daily-progress';
import type { WordleStats, SudokuStats, ConnectionsStats } from '../types/user-stats';
import { calculateStreak } from './streak';
import { filterStoreByGame } from './progress-filter';

// ...calculateStats, calculateSudokuStats unchanged...

// Same self-contained shape as calculateSudokuStats: filters internally via
// filterStoreByGame, so callers don't have to pre-filter (unlike calculateStats).
export function calculateConnectionsStats(store: ProgressStore, todayKey: string): ConnectionsStats {
  const connectionsStore = filterStoreByGame(store, 'connections');
  const finishedEntries = Object.values(connectionsStore).filter((p) => p.status !== 'in-progress');
  const wonEntries = finishedEntries.filter((p) => p.status === 'won');

  const played = finishedEntries.length;
  const won = wonEntries.length;
  const winPercentage = played === 0 ? 0 : Math.round((won / played) * 100);

  const { current, best } = calculateStreak(connectionsStore, todayKey);

  return {
    played,
    won,
    winPercentage,
    currentStreak: current,
    bestStreak: best,
  };
}
```

- [ ] **Step 5: Run to verify it passes, then the full suite**

Run: `npm run test -- lib/stats.test.ts` — expected: PASS, including all pre-existing assertions unchanged.
Run: `npm run test` — expected: full suite green.
Run: `npm run build` — expected: compiles clean.

- [ ] **Step 6: Commit**

```bash
git add types/user-stats.ts lib/stats.ts lib/stats.test.ts
git commit -m "feat(connections): add ConnectionsStats and calculateConnectionsStats"
```

---

## Task 9: `ConnectionsMistakes` component

**Files:**
- Create: `components/ConnectionsMistakes.tsx`

**Interfaces:**
- Consumes: `MAX_MISTAKES` (Task 4).
- Produces: `<ConnectionsMistakes mistakesMade={number} />`, consumed by Task 13.

Presentational component — no test (matches the untested-by-design precedent of
`WordleBoard.tsx`/`SudokuBoard.tsx`/`SudokuNumpad.tsx`). Accessibility is **not**
optional here: the remaining-mistakes count must have a real text equivalent, not just
four colored dots (spec §10).

- [ ] **Step 1: Implement**

```tsx
// components/ConnectionsMistakes.tsx
import { MAX_MISTAKES } from '../lib/connections-engine';

export function ConnectionsMistakes({ mistakesMade }: { mistakesMade: number }) {
  const remaining = MAX_MISTAKES - mistakesMade;

  return (
    <div
      role="status"
      aria-label={`Te quedan ${remaining} ${remaining === 1 ? 'error' : 'errores'}`}
      className="flex items-center gap-2"
    >
      <span className="text-xs font-semibold tracking-wide text-[var(--color-text-muted)]">
        ERRORES:
      </span>
      <div className="flex gap-1.5">
        {Array.from({ length: MAX_MISTAKES }, (_, i) => {
          const used = i < mistakesMade;
          return (
            <span
              key={i}
              aria-hidden="true"
              className={`h-3 w-3 rounded-full border-2 border-[var(--color-text-muted)] ${
                used ? 'bg-transparent' : 'bg-[var(--color-text-muted)]'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ConnectionsMistakes.tsx
git commit -m "feat(connections): add ConnectionsMistakes component"
```

---

## Task 10: `ConnectionsCategoryBanner` component + new CSS color tokens

**Files:**
- Create: `components/ConnectionsCategoryBanner.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `ConnectionsCategory`, `ConnectionsColor` (Task 1).
- Produces: `<ConnectionsCategoryBanner category={ConnectionsCategory} solved?={boolean} />` (default `true`), consumed by Task 13.

No test (presentational, same precedent as Task 9).

The app's existing palette (`app/globals.css`, read in full before writing this plan)
has `--color-accent`/`--color-present`/`--color-absent`/`--color-entered` — none of them
give 4 hue-distinct tokens for yellow/green/blue/purple. This task adds exactly that,
reusing 3 already-proven hex values from the existing palette (so their contrast
behavior with white/dark text is already validated by `WordleBoard.tsx`'s "present"
tile, which uses `--color-present` as a background with `--color-accent-contrast` as
text) and one genuinely new hue (purple) picked at a saturation/lightness consistent
with the others.

- [ ] **Step 1: Add the color tokens**

Current relevant block in `app/globals.css` (read before editing):

```css
:root,
[data-theme='light'] {
  --color-bg: #fafaf9;
  --color-surface: #ffffff;
  --color-text: #18181b;
  --color-text-muted: #71717a;
  --color-border: #e4e4e7;
  --color-accent: #16a34a;
  --color-accent-contrast: #ffffff;
  --color-present: #ca8a04;
  --color-absent: #a1a1aa;
  --color-entered: #1d4ed8;
}

[data-theme='dark'] {
  --color-bg: #0a0a0b;
  --color-surface: #18181b;
  --color-text: #fafafa;
  --color-text-muted: #a1a1aa;
  --color-border: #27272a;
  --color-accent: #22c55e;
  --color-accent-contrast: #052e13;
  --color-present: #eab308;
  --color-absent: #3f3f46;
  --color-entered: #60a5fa;
}
```

Add 5 new lines to each block (4 hues + a shared contrast text token, since all 4 bands
use the same light-text-on-saturated-bg / dark-text-on-bright-bg pattern the rest of the
palette already uses):

```css
:root,
[data-theme='light'] {
  --color-bg: #fafaf9;
  --color-surface: #ffffff;
  --color-text: #18181b;
  --color-text-muted: #71717a;
  --color-border: #e4e4e7;
  --color-accent: #16a34a;
  --color-accent-contrast: #ffffff;
  --color-present: #ca8a04;
  --color-absent: #a1a1aa;
  --color-entered: #1d4ed8;
  --color-connections-yellow: #ca8a04;
  --color-connections-green: #15803d;
  --color-connections-blue: #1d4ed8;
  --color-connections-purple: #7e22ce;
  --color-connections-contrast: #ffffff;
}

[data-theme='dark'] {
  --color-bg: #0a0a0b;
  --color-surface: #18181b;
  --color-text: #fafafa;
  --color-text-muted: #a1a1aa;
  --color-border: #27272a;
  --color-accent: #22c55e;
  --color-accent-contrast: #052e13;
  --color-present: #eab308;
  --color-absent: #3f3f46;
  --color-entered: #60a5fa;
  --color-connections-yellow: #eab308;
  --color-connections-green: #22c55e;
  --color-connections-blue: #60a5fa;
  --color-connections-purple: #c084fc;
  --color-connections-contrast: #0a0a0b;
}
```

(`--color-connections-yellow`/`--color-connections-blue` reuse `--color-present`'s and
`--color-entered`'s exact values; `--color-connections-green` is deliberately a darker
green than `--color-accent` so a green category banner doesn't visually read as a
button; `--color-connections-purple` is the one new hue.)

- [ ] **Step 2: Implement the component**

```tsx
// components/ConnectionsCategoryBanner.tsx
import type { ConnectionsCategory, ConnectionsColor } from '../types/connections';

const COLOR_VAR: Record<ConnectionsColor, string> = {
  yellow: '--color-connections-yellow',
  green: '--color-connections-green',
  blue: '--color-connections-blue',
  purple: '--color-connections-purple',
};

export function ConnectionsCategoryBanner({
  category,
  solved = true,
}: {
  category: ConnectionsCategory;
  /** false when this category is being revealed on a loss without the player
   * having solved it themselves (spec §9) — gets a reduced-opacity treatment
   * PLUS a real text label, not just an opacity/color difference. */
  solved?: boolean;
}) {
  return (
    <div
      className={`w-full rounded-lg px-4 py-3 text-center ${solved ? '' : 'opacity-60'}`}
      style={{
        backgroundColor: `var(${COLOR_VAR[category.color]})`,
        color: 'var(--color-connections-contrast)',
      }}
    >
      <p className="text-sm font-bold uppercase tracking-wide">
        {category.title}
        {!solved && ' (no resuelta)'}
      </p>
      <p className="mt-1 text-xs font-medium">{category.items.join(', ')}</p>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/ConnectionsCategoryBanner.tsx app/globals.css
git commit -m "feat(connections): add ConnectionsCategoryBanner and category color tokens"
```

---

## Task 11: `ConnectionsGrid` component

**Files:**
- Create: `components/ConnectionsGrid.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks beyond plain `string[]`.
- Produces: `<ConnectionsGrid items={string[]} selected={string[]} onToggle={(item: string) => void} />`, consumed by Task 13.

**Prop contract decision (must match Task 13 exactly):** the grid receives only the
*remaining* (unsolved) items — the page computes `remainingItems` by filtering
`displayOrder` against everything already in `solvedCategories` **before** calling this
component, so `ConnectionsGrid` never needs a `colorForSolved` callback or any knowledge
of solved state. This mirrors spec §9 ("solo muestra los items no resueltos aún") and
keeps the component's own logic to pure toggle-selection, same spirit as
`SudokuNumpad.tsx` not knowing about the board.

No test (presentational). **Accessibility is not optional** — replicate
`components/SudokuBoard.tsx`'s exact pattern (read in full before writing this plan),
adapted from single-selection to a 4-max multi-select toggle grid: `aria-label` per cell
with its text and selected state, `aria-current` on selected cells, roving `tabIndex`
(one tab stop at a time) via a `ref` map, focus-follows-selection on the most recently
toggled item, and a non-color-only selected affordance (background change **plus** a
real outline/border, not a bare background swap).

- [ ] **Step 1: Implement**

```tsx
// components/ConnectionsGrid.tsx
'use client';

import { useEffect, useRef } from 'react';

export function ConnectionsGrid({
  items,
  selected,
  onToggle,
}: {
  items: string[];
  selected: string[];
  onToggle: (item: string) => void;
}) {
  const cellRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  // Roving tabindex: exactly one cell is a tab stop at a time — the most
  // recently selected item if any, otherwise the first grid item — so Tab
  // enters/exits the grid as a single control (same pattern as SudokuBoard).
  const tabStopItem = selected[selected.length - 1] ?? items[0];

  useEffect(() => {
    // Focus-follows-selection (same pattern as SudokuBoard.tsx): a toggle
    // must move real DOM focus, not just the visual highlight, so assistive
    // tech tracks the active cell.
    const lastSelected = selected[selected.length - 1];
    if (lastSelected !== undefined) {
      cellRefs.current[lastSelected]?.focus();
    }
  }, [selected]);

  return (
    <div className="grid w-full grid-cols-4 gap-2">
      {items.map((item) => {
        const isSelected = selected.includes(item);
        const isTabStop = item === tabStopItem;

        return (
          <button
            key={item}
            type="button"
            ref={(el) => {
              cellRefs.current[item] = el;
            }}
            aria-current={isSelected ? 'true' : undefined}
            aria-label={`${item}${isSelected ? ', seleccionada' : ''}`}
            tabIndex={isTabStop ? 0 : -1}
            onClick={() => onToggle(item)}
            className={`flex h-16 items-center justify-center rounded-lg border-2 p-2 text-center text-[11px] font-semibold uppercase leading-tight sm:h-20 sm:text-xs ${
              isSelected
                ? 'border-[var(--color-text)] bg-[var(--color-accent)] text-[var(--color-accent-contrast)] outline outline-2 outline-offset-2 outline-[var(--color-text)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
            }`}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ConnectionsGrid.tsx
git commit -m "feat(connections): add ConnectionsGrid component"
```

---

## Task 12: `ConnectionsShareButton` component

**Files:**
- Create: `components/ConnectionsShareButton.tsx`

**Interfaces:**
- Consumes: `ConnectionsColor` (Task 1).
- Produces: `<ConnectionsShareButton guessHistory={ConnectionsColor[][]} status={'won'|'lost'} streak={number} />`, consumed by Task 13.

`components/ShareButton.tsx` (read in full before writing this plan) is tightly coupled
to Wordle's `GameResult`/`attemptGrid: string[][]` shape (it maps `'correct'|'present'|
'absent'` letter states, not `ConnectionsColor`, and its score line is hardcoded to
`X/6`). Rather than force-fitting it, this task writes a **new, standalone** component
that keeps the same share-flow behavior (native share sheet with a clipboard fallback,
`AbortError` treated as a silent cancel rather than a failure, a separate try/catch
around the clipboard write with its own user-visible failure feedback) — this is the
exact fallback/error-handling logic `ShareButton.tsx` already has; this task replicates
it rather than regressing behind it.

No test (presentational + browser API interaction, same precedent as `ShareButton.tsx`
itself, which has no test file).

- [ ] **Step 1: Implement**

```tsx
// components/ConnectionsShareButton.tsx
'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import type { ConnectionsColor } from '../types/connections';

const EMOJI: Record<ConnectionsColor, string> = {
  yellow: '🟨',
  green: '🟩',
  blue: '🟦',
  purple: '🟪',
};

function buildShareText(
  guessHistory: ConnectionsColor[][],
  status: 'won' | 'lost',
  streak: number,
): string {
  // Colors only, never category titles — a lost game's grid is still fine
  // to share, same "no problem sharing a loss" convention as Wordle's X/6.
  const grid = guessHistory.map((row) => row.map((color) => EMOJI[color]).join('')).join('\n');
  const resultLine = status === 'won' ? 'Resuelto' : 'No resuelto';

  return [
    'DAILY PUZZLES — CONNECTIONS',
    grid,
    resultLine,
    `🔥 ${streak} ${streak === 1 ? 'día' : 'días'}`,
  ].join('\n');
}

export function ConnectionsShareButton({
  guessHistory,
  status,
  streak,
}: {
  guessHistory: ConnectionsColor[][];
  status: 'won' | 'lost';
  streak: number;
}) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const handleShare = async () => {
    const text = buildShareText(guessHistory, status, streak);

    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch (err) {
        // AbortError = user cancelled the native share sheet, the expected
        // path to fall through to clipboard. Any other rejection is a real
        // share failure — still fall back to clipboard, but log it instead
        // of silently treating it as a cancel.
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          console.error('navigator.share failed', err);
        }
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('clipboard write failed', err);
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 2000);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleShare}
        aria-label="Compartir resultado"
        className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-[var(--color-accent-contrast)]"
      >
        <Share2 size={16} />
        COMPARTIR
      </button>
      <p aria-live="polite" className="mt-1 h-4 text-xs text-[var(--color-text-muted)]">
        {copied ? '¡Copiado!' : copyFailed ? 'No se pudo copiar' : ''}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ConnectionsShareButton.tsx
git commit -m "feat(connections): add ConnectionsShareButton component"
```

---

## Task 13: `app/jugar/connections/page.tsx` — game page

**Files:**
- Create: `app/jugar/connections/page.tsx`

**Interfaces:**
- Consumes: `useTodayKey` (pre-existing), `useDailyProgress` → `{ store, hydrated, updateDay }` where `updateDay(game: string, dateKey: string, build: (existing?: DailyProgress) => DailyProgress): void` (already generic — current signature confirmed in `hooks/useDailyProgress.ts`), `filterStoreByGame` (Task 8's Interfaces note), `getDailyConnectionsPuzzle` (Task 6), `evaluateGuess`/`colorForItem`/`MAX_MISTAKES` (Task 4), `shuffleDeterministic`/`hashStringToSeed` (Task 5), `CONNECTIONS_PUZZLES` (Task 7), `ConnectionsGrid` (Task 11), `ConnectionsCategoryBanner` (Task 10), `ConnectionsMistakes` (Task 9), `ConnectionsShareButton` (Task 12), `StreakDisplay` (pre-existing).
- Produces: nothing consumed by later tasks — this is a leaf page.

No automated test (matches the manual-verification precedent of
`app/jugar/wordle/page.tsx` and `app/jugar/sudoku/page.tsx`, neither of which has a page
test) — Task 17 covers this with a manual checklist.

Read `app/jugar/sudoku/page.tsx` in full before writing this task (already done while
preparing this plan) — it's the closest existing reference for the hydration gate,
resume pattern, and `updateDay('sudoku', ...)` calling convention.

- [ ] **Step 1: Implement**

```tsx
// app/jugar/connections/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTodayKey } from '../../../hooks/useTodayKey';
import { useDailyProgress } from '../../../hooks/useDailyProgress';
import { getDailyConnectionsPuzzle } from '../../../lib/daily-puzzle';
import { calculateStreak } from '../../../lib/streak';
import { filterStoreByGame } from '../../../lib/progress-filter';
import { evaluateGuess, colorForItem, MAX_MISTAKES } from '../../../lib/connections-engine';
import { shuffleDeterministic, hashStringToSeed } from '../../../lib/deterministic-shuffle';
import { CONNECTIONS_PUZZLES } from '../../../data/connections/puzzles';
import { ConnectionsGrid } from '../../../components/ConnectionsGrid';
import { ConnectionsCategoryBanner } from '../../../components/ConnectionsCategoryBanner';
import { ConnectionsMistakes } from '../../../components/ConnectionsMistakes';
import { ConnectionsShareButton } from '../../../components/ConnectionsShareButton';
import { StreakDisplay } from '../../../components/StreakDisplay';
import type { ConnectionsCategory, ConnectionsColor } from '../../../types/connections';

export default function ConnectionsPage() {
  const { todayKey, today } = useTodayKey();
  const { store, hydrated, updateDay } = useDailyProgress();
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const puzzle = getDailyConnectionsPuzzle(today, CONNECTIONS_PUZZLES);
  const connectionsStore = filterStoreByGame(store, 'connections');
  const dayProgress = connectionsStore[todayKey];
  const status = dayProgress?.game === 'connections' ? dayProgress.status : 'in-progress';
  const solvedCategories: ConnectionsCategory[] =
    dayProgress?.game === 'connections' ? dayProgress.solvedCategories : [];
  const mistakesMade = dayProgress?.game === 'connections' ? dayProgress.mistakesMade : 0;
  const guessHistory: ConnectionsColor[][] =
    dayProgress?.game === 'connections' ? dayProgress.guessHistory : [];
  const { current: streak } = calculateStreak(connectionsStore, todayKey);

  // Deterministic grid order derived from the puzzle id (spec §6) — the same
  // puzzle.id always yields the same shuffled order, so a refresh mid-game
  // never reshuffles the board. puzzle.categories is included in the
  // dependency array for lint correctness; its reference is stable for a
  // given puzzle.id (it comes straight from the static CONNECTIONS_PUZZLES
  // pool, never cloned).
  const displayOrder = useMemo(() => {
    const allItems = puzzle.categories.flatMap((category) => category.items);
    return shuffleDeterministic(allItems, hashStringToSeed(puzzle.id));
  }, [puzzle.id, puzzle.categories]);

  const solvedItemSet = new Set(solvedCategories.flatMap((category) => category.items));
  const remainingItems = displayOrder.filter((item) => !solvedItemSet.has(item));

  useEffect(() => {
    // Reset local UI-only state when the day changes — solved categories,
    // mistakes, and guess history all live in `store`, not local state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected([]);
    setMessage(null);
  }, [todayKey]);

  const handleToggle = (item: string) => {
    if (status !== 'in-progress') return;
    setSelected((current) => {
      if (current.includes(item)) return current.filter((i) => i !== item);
      if (current.length >= 4) return current; // reject a 5th toggle-on
      return [...current, item];
    });
  };

  const handleSubmit = () => {
    if (selected.length !== 4 || status !== 'in-progress') return;

    const result = evaluateGuess(selected, puzzle.categories);
    // Every selected item is guaranteed to belong to some category of
    // today's puzzle (it came from displayOrder, which is built from
    // puzzle.categories itself), so colorForItem can't return null here.
    const guessedColors: ConnectionsColor[] = selected.map(
      (item) => colorForItem(item, puzzle.categories) as ConnectionsColor,
    );
    const nextGuessHistory = [...guessHistory, guessedColors];

    if (result.kind === 'correct') {
      const nextSolved = [...solvedCategories, result.category];
      const won = nextSolved.length === 4;
      updateDay('connections', todayKey, () => ({
        game: 'connections',
        status: won ? 'won' : 'in-progress',
        solvedCategories: nextSolved,
        mistakesMade,
        guessHistory: nextGuessHistory,
        ...(won ? { completedAt: new Date().toISOString() } : {}),
      }));
      setSelected([]);
      setMessage(null);
      return;
    }

    const nextMistakes = mistakesMade + 1;
    const lost = nextMistakes >= MAX_MISTAKES;

    updateDay('connections', todayKey, () => ({
      game: 'connections',
      status: lost ? 'lost' : 'in-progress',
      solvedCategories,
      mistakesMade: nextMistakes,
      guessHistory: nextGuessHistory,
      ...(lost ? { completedAt: new Date().toISOString() } : {}),
    }));
    setSelected([]);

    if (result.kind === 'one-away') {
      setMessage('¡Uno más!');
      setTimeout(() => setMessage(null), 2000);
    } else {
      setMessage(null);
    }
  };

  if (!hydrated) return null;

  const isFinished = status !== 'in-progress';

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-8">
      {isFinished && (
        <div className="text-center">
          <p className="font-heading text-2xl font-bold">
            {status === 'won' ? '¡Resuelto!' : 'No hubo suerte hoy'}
          </p>
          <div className="mt-2 flex justify-center">
            <StreakDisplay current={streak} />
          </div>
        </div>
      )}

      <ConnectionsMistakes mistakesMade={mistakesMade} />

      <div className="flex w-full flex-col gap-2">
        {solvedCategories.map((category) => (
          <ConnectionsCategoryBanner key={category.title} category={category} />
        ))}
        {status === 'lost' &&
          puzzle.categories
            .filter((category) => !solvedCategories.some((s) => s.title === category.title))
            .map((category) => (
              <ConnectionsCategoryBanner key={category.title} category={category} solved={false} />
            ))}
      </div>

      {status === 'in-progress' && (
        <>
          <ConnectionsGrid items={remainingItems} selected={selected} onToggle={handleToggle} />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selected.length !== 4}
            className="rounded-full bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-[var(--color-accent-contrast)] disabled:opacity-40"
          >
            ENVIAR
          </button>
          {message && (
            <p role="status" className="text-sm text-[var(--color-text-muted)]">
              {message}
            </p>
          )}
        </>
      )}

      {status !== 'in-progress' && (
        <ConnectionsShareButton guessHistory={guessHistory} status={status} streak={streak} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify manually (no automated test for this page)**

Run: `npm run dev`, open `/jugar/connections`, confirm:
- The grid renders 16 items, submit is disabled until exactly 4 are selected.
- A correct guess animates the category out of the grid and shows it as a banner above.
- A 3-of-4 guess shows "¡Uno más!" and clears after ~2 seconds.
- After 4 mistakes, `status` becomes `'lost'`, the remaining categories render revealed
  with `solved={false}` (dimmed, "(no resuelta)" suffix), and the grid/submit button
  disappear.
- Winning after solving all 4 shows the share button.

Run: `npm run build` — expected: compiles clean.

- [ ] **Step 3: Commit**

```bash
git add app/jugar/connections/page.tsx
git commit -m "feat(connections): add the connections game page"
```

---

## Task 14: `data/games.ts` — mark Connections available

**Files:**
- Modify: `data/games.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `GAMES` entry for `'connections'` now has `available: true, route: '/jugar/connections'`, consumed by Task 15 (`TodayView.tsx` already filters on `game.available && game.route`).

Current content (read before editing):

```ts
export const GAMES: GameMeta[] = [
  {
    id: 'wordle',
    name: 'Wordle',
    description: 'Descubrí la palabra en 6 intentos.',
    available: true,
    route: '/jugar/wordle',
  },
  {
    id: 'sudoku',
    name: 'Sudoku',
    description: 'Completá la grilla del 1 al 9.',
    available: true,
    route: '/jugar/sudoku',
  },
  { id: 'connections', name: 'Connections', description: 'Próximamente.', available: false },
  { id: 'memory', name: 'Memory', description: 'Próximamente.', available: false },
];
```

- [ ] **Step 1: Flip the Connections entry**

```ts
{
  id: 'connections',
  name: 'Connections',
  description: 'Agrupá las 16 palabras en 4 categorías.',
  available: true,
  route: '/jugar/connections',
},
```

(Memory's entry is untouched — it stays `available: false` with no `route`, per spec §2
scope.)

- [ ] **Step 2: Verify**

Run: `npm run build` — expected: compiles clean.

- [ ] **Step 3: Commit**

```bash
git add data/games.ts
git commit -m "feat(connections): mark connections available in the games list"
```

---

## Task 15: `TodayView.tsx` — generalize `alreadyPlayed`

**Files:**
- Modify: `components/TodayView.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed by later tasks — leaf-level UI fix.

Current content (read in full before writing this plan):

```tsx
// components/TodayView.tsx
'use client';

import { useTodayKey } from '../hooks/useTodayKey';
import { useDailyProgress } from '../hooks/useDailyProgress';
import { calculateStreak } from '../lib/streak';
import { filterStoreByGame } from '../lib/progress-filter';
import { GAMES } from '../data/games';
import { PuzzleOfDayCard } from './PuzzleOfDayCard';

export function TodayView() {
  const { todayKey } = useTodayKey();
  const { store } = useDailyProgress();

  const cards = GAMES.filter((game) => game.available && game.route).map((game) => {
    const gameStore = filterStoreByGame(store, game.id);
    const status = gameStore[todayKey]?.status;
    const alreadyPlayed = game.id === 'wordle' ? status === 'won' || status === 'lost' : status === 'won';
    const { current: streak } = calculateStreak(gameStore, todayKey);

    return (
      <PuzzleOfDayCard
        key={game.id}
        dateKey={todayKey}
        streak={streak}
        alreadyPlayed={alreadyPlayed}
        gameName={game.name.toUpperCase()}
        gameDescription={game.description}
        playRoute={game.route as string}
      />
    );
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-12 sm:flex-row sm:flex-wrap sm:justify-center">
      {cards}
    </div>
  );
}
```

The `game.id === 'wordle'` special case exists because today only Wordle has a `'lost'`
status. Connections **also** has a `'lost'` status (spec §2/§7) — and since a Sudoku
`DailyProgress` entry's `status` can only ever be `'in-progress' | 'won'` by its own type
(never `'lost'`), the correct generalization is a single game-agnostic check that behaves
identically for all three games: it evaluates to the exact same boolean for Sudoku either
way (a Sudoku entry's `status` is structurally incapable of being `'lost'`), while now
also correctly marking a lost Connections day as already-played instead of silently
falling through to `status === 'won'` and letting the user attempt to replay a lost game.

Read the rest of the file's current content (shown in full above) to confirm nothing else
in this component is game-specific — confirmed: the only other per-game logic is the
`GAMES` filter/map, which is already fully generic (it iterates every available game
uniformly). This is the only change `TodayView.tsx` needs for the third game.

- [ ] **Step 1: Simplify the `alreadyPlayed` line**

```tsx
// before:
const alreadyPlayed = game.id === 'wordle' ? status === 'won' || status === 'lost' : status === 'won';
// after:
const alreadyPlayed = status === 'won' || status === 'lost';
```

- [ ] **Step 2: Verify**

Run: `npm run build` — expected: compiles clean.
Run: `npm run test` — expected: full suite green (no test currently exercises `TodayView.tsx` directly — confirmed by the test file glob in Task 17 below).

Manually: open `/`, play Wordle to a loss on a `?debugDate=` day, confirm its card now
shows "VER RESULTADO" instead of "JUGAR" (this was already correct before, since the old
ternary handled Wordle specially — confirm it's still correct after simplifying). Then
play Connections to a loss (once Task 13 exists) and confirm its card also now correctly
shows "VER RESULTADO".

- [ ] **Step 3: Commit**

```bash
git add components/TodayView.tsx
git commit -m "fix(today-view): generalize alreadyPlayed to a single game-agnostic check"
```

---

## Task 16: `/estadisticas` — third section

**Files:**
- Modify: `app/estadisticas/page.tsx`

**Interfaces:**
- Consumes: `calculateConnectionsStats` (Task 8), `ConnectionsStats` type (Task 8).
- Produces: nothing consumed by later tasks — leaf-level UI addition.

Current content (read in full before writing this plan):

```tsx
'use client';

import { useEffect, useState } from 'react';
import { calculateStats, calculateSudokuStats } from '../../lib/stats';
import { loadProgressStore } from '../../lib/storage';
import { useTodayKey } from '../../hooks/useTodayKey';
import { filterStoreByGame } from '../../lib/progress-filter';
import { StatsPanel } from '../../components/StatsPanel';
import type { WordleStats, SudokuStats } from '../../types/user-stats';

const EMPTY_WORDLE_STATS: WordleStats = {
  played: 0,
  won: 0,
  winPercentage: 0,
  currentStreak: 0,
  bestStreak: 0,
  attemptsDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
};

const EMPTY_SUDOKU_STATS: SudokuStats = {
  played: 0,
  won: 0,
  winPercentage: 0,
  currentStreak: 0,
  bestStreak: 0,
};

export default function StatsPage() {
  const { todayKey } = useTodayKey();
  const [wordleStats, setWordleStats] = useState<WordleStats>(EMPTY_WORDLE_STATS);
  const [sudokuStats, setSudokuStats] = useState<SudokuStats>(EMPTY_SUDOKU_STATS);

  useEffect(() => {
    const store = loadProgressStore();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWordleStats(calculateStats(filterStoreByGame(store, 'wordle'), todayKey));
    setSudokuStats(calculateSudokuStats(store, todayKey));
  }, [todayKey]);

  return (
    <div>
      <h1 className="font-heading mx-auto max-w-md px-4 pt-8 text-2xl font-bold">Estadísticas</h1>
      <section>
        <h2 className="font-heading mx-auto max-w-md px-4 pt-6 text-lg font-semibold">Wordle</h2>
        <StatsPanel stats={wordleStats} />
      </section>
      <section>
        <h2 className="font-heading mx-auto max-w-md px-4 pt-2 text-lg font-semibold">Sudoku</h2>
        <StatsPanel stats={sudokuStats} />
      </section>
    </div>
  );
}
```

`calculateSudokuStats` (and, following the same shape, `calculateConnectionsStats`)
self-filters internally, so the call site does **not** need to pre-filter for it — that
pre-filtering is only needed for `calculateStats` (Wordle), which is kept as-is for
backward compatibility. This is called out in `lib/stats.ts`'s own comments (Task 8) and
matches the existing Sudoku call site exactly.

- [ ] **Step 1: Add the third stats section**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { calculateStats, calculateSudokuStats, calculateConnectionsStats } from '../../lib/stats';
import { loadProgressStore } from '../../lib/storage';
import { useTodayKey } from '../../hooks/useTodayKey';
import { filterStoreByGame } from '../../lib/progress-filter';
import { StatsPanel } from '../../components/StatsPanel';
import type { WordleStats, SudokuStats, ConnectionsStats } from '../../types/user-stats';

const EMPTY_WORDLE_STATS: WordleStats = {
  played: 0,
  won: 0,
  winPercentage: 0,
  currentStreak: 0,
  bestStreak: 0,
  attemptsDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
};

const EMPTY_SUDOKU_STATS: SudokuStats = {
  played: 0,
  won: 0,
  winPercentage: 0,
  currentStreak: 0,
  bestStreak: 0,
};

const EMPTY_CONNECTIONS_STATS: ConnectionsStats = {
  played: 0,
  won: 0,
  winPercentage: 0,
  currentStreak: 0,
  bestStreak: 0,
};

export default function StatsPage() {
  const { todayKey } = useTodayKey();
  const [wordleStats, setWordleStats] = useState<WordleStats>(EMPTY_WORDLE_STATS);
  const [sudokuStats, setSudokuStats] = useState<SudokuStats>(EMPTY_SUDOKU_STATS);
  const [connectionsStats, setConnectionsStats] = useState<ConnectionsStats>(EMPTY_CONNECTIONS_STATS);

  useEffect(() => {
    const store = loadProgressStore();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWordleStats(calculateStats(filterStoreByGame(store, 'wordle'), todayKey));
    setSudokuStats(calculateSudokuStats(store, todayKey));
    setConnectionsStats(calculateConnectionsStats(store, todayKey));
  }, [todayKey]);

  return (
    <div>
      <h1 className="font-heading mx-auto max-w-md px-4 pt-8 text-2xl font-bold">Estadísticas</h1>
      <section>
        <h2 className="font-heading mx-auto max-w-md px-4 pt-6 text-lg font-semibold">Wordle</h2>
        <StatsPanel stats={wordleStats} />
      </section>
      <section>
        <h2 className="font-heading mx-auto max-w-md px-4 pt-2 text-lg font-semibold">Sudoku</h2>
        <StatsPanel stats={sudokuStats} />
      </section>
      <section>
        <h2 className="font-heading mx-auto max-w-md px-4 pt-2 text-lg font-semibold">Connections</h2>
        <StatsPanel stats={connectionsStats} />
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run build` — expected: compiles clean.
Run: `npm run test` — expected: full suite green.

Manually: open `/estadisticas`, confirm three independent sections render, and that
playing a Connections puzzle updates only the Connections section on next visit.

- [ ] **Step 3: Commit**

```bash
git add app/estadisticas/page.tsx
git commit -m "feat(connections): add connections section to /estadisticas"
```

---

## Task 17: Final verification

**Files:** none (verification only).

**Interfaces:** none — this task doesn't produce anything for a later task; it's the
plan's closing gate.

- [ ] **Step 1: Full automated suite**

Run, in order:
1. `npm run build` — expected: compiles clean, zero TypeScript errors.
2. `npm run lint` — expected: zero errors/warnings.
3. `npm run test` — expected: every test file green, **zero regressions** in the full
   pre-existing suite plus this plan's additions. The complete list of test files that
   must all pass (confirmed by listing the repo's actual test files before writing this
   plan — 12 pre-existing, 5 added by this plan):

   Pre-existing (must show zero assertion changes from before this plan):
   - `data/words/words.test.ts`
   - `data/sudoku/puzzles.test.ts`
   - `lib/date.test.ts`
   - `lib/streak.test.ts`
   - `lib/wordle-engine.test.ts`
   - `lib/daily-puzzle.test.ts` (extended by Task 6 — its Wordle/Sudoku describe blocks unchanged)
   - `lib/sudoku-generator.test.ts`
   - `lib/sudoku-validate.test.ts`
   - `lib/progress-filter.test.ts`
   - `lib/stats.test.ts` (extended by Task 8 — its `calculateStats`/`calculateSudokuStats` describe blocks unchanged)
   - `lib/storage.test.ts`
   - `test/smoke.test.ts`

   Added by this plan:
   - `lib/connections-engine.test.ts` (Task 4)
   - `lib/deterministic-shuffle.test.ts` (Task 5)
   - `data/connections/puzzles.test.ts` (Task 7)

- [ ] **Step 2: Manual QA checklist**

Using `npm run dev` and, where noted, `?debugDate=YYYY-MM-DD` to pin the day:

- [ ] Solve a Connections puzzle end to end (win): 4 correct guesses in a row, each
      category animates out into a banner, final state is `status: 'won'`, share button
      appears.
- [ ] Lose on purpose: submit 4 wrong/one-away guesses. Confirm `status` becomes
      `'lost'`, **all 4** categories reveal (including the ones never solved), and the
      never-solved ones are visibly distinguished (dimmed + "(no resuelta)" text, not
      color alone) from any the player did solve before losing.
- [ ] Trigger a genuine "one away" (submit exactly 3 items from one category + 1 from
      another): confirm the "¡Uno más!" message appears and auto-clears, and that it
      still counted as one of the 4 mistakes.
- [ ] Reload mid-game (after solving 1-2 categories, before finishing): confirm solved
      categories, mistakes count, and remaining grid (same order as before reload)
      restore exactly.
- [ ] Reload after finishing (both a won day and, on a different `?debugDate`, a lost
      day): confirm the game is blocked from replay and shows the same end state as
      before reload.
- [ ] Share button: confirm the produced text's emoji grid matches `guessHistory`'s
      colors and never includes any category `title` text.
- [ ] **Play all three games on one simulated day** via a single `?debugDate=` value —
      Wordle, then Sudoku, then Connections — and confirm none of the three's progress,
      streak, or "already played" state leaks into or overwrites another's. This is the
      exact class of bug the Sudoku plan's cross-game interference fix (commit
      `495fec6`, "namespace progress store keys by game") targeted — don't skip this
      check just because the underlying storage layer is now shared and already fixed.
- [ ] `/estadisticas` shows three correct, independent sections; playing only
      Connections today doesn't change Wordle's or Sudoku's numbers.
- [ ] Home (`/`) shows three cards (Wordle, Sudoku, Connections), each with correct
      streak/already-played state.
- [ ] Keyboard/AT navigation on the Connections grid: Tab moves through exactly one grid
      cell (roving tabindex), Enter/Space toggles the focused cell, `aria-label`s read
      the item text plus selected state, no affordance is color-only.
- [ ] Responsive: check the grid, category banners, and mistakes indicator at a mobile
      viewport width (e.g. 375px) — no horizontal overflow, text stays legible.

- [ ] **Step 3: Commit (if Step 2 uncovered fixes)**

If manual QA found anything, fix it, re-run Step 1, and commit the fix with a message
describing what manual QA caught. If nothing needed fixing, this task has no commit of
its own — it's a verification gate over the prior 16 tasks' commits.

---
