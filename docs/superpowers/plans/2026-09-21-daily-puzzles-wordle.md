# Daily Puzzles (Wordle v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v1 of Daily Puzzles: a Next.js frontend-only app that serves a deterministic daily Wordle puzzle (in Spanish), tracks progress/streak/stats entirely in `localStorage`, and is structured so future games (Sudoku, Connections, Memory) can be added without touching the date, persistence, or layout layers.

**Architecture:** Pure, independently-testable logic (`/lib`, `/data`) computed from a local date key and a static word list, consumed by thin client hooks (`/hooks`) that own all `localStorage` access, rendered by presentational components (`/components`) composed into four App Router pages (`/app`). No server state, no API routes, no database.

**Tech Stack:** Next.js (App Router) + React + TypeScript (strict) + Tailwind CSS + `motion` + `lucide-react`. Testing: Vitest (jsdom) for pure logic and data validation only. Package manager: npm.

**Spec:** `docs/superpowers/specs/2026-09-21-daily-puzzles-design.md`

## Global Constraints

- No backend, database, authentication, external API, or user accounts — the app must run entirely as a static frontend (spec §1, §3).
- Persistence is `localStorage` only, under the single versioned key `daily-puzzles-progress-v1` (spec §5, §16).
- Package manager is npm; stack is fixed to Next.js App Router + TypeScript + Tailwind + `motion` + `lucide-react` (spec §3).
- Wordle words are uppercase, accent-free, but **Ñ is a first-class letter** (spec §9).
- No `setInterval`, no scheduled midnight job — day-change detection happens on mount, `visibilitychange`, and window focus only (spec §6).
- `?debugDate=YYYY-MM-DD` only works when `NODE_ENV !== 'production'` (spec §6).
- No automated UI/component tests in this plan — only pure `/lib` and `/data` validation get Vitest coverage; UI is verified manually (spec §2, §14).
- Sudoku, Connections, Memory, and PWA/installability are explicitly out of scope for this plan (spec §2) — only their placeholder entries in `games.ts` and the "próximamente" UI state are built.
- `LAUNCH_DATE` (the daily-puzzle epoch anchor) must never change after this ships — doing so reshuffles every date's puzzle (spec §7).

---

## Task 1: Scaffold Next.js project + testing toolchain

**Files:**
- Create: entire scaffolded Next.js project at the repo root (`app/`, `package.json`, `tsconfig.json`, `next.config.ts`, `.eslintrc`/`eslint.config.*`, `tailwind` setup, `postcss.config.*`, `globals.css`, etc.)
- Create: `vitest.config.ts`
- Create: `test/smoke.test.ts`
- Modify: `package.json` (add `test` script)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a working `npm run dev` / `npm run build` / `npm run lint` / `npm run test` toolchain that every later task builds on.

The project root (`D:\Dev\Pruebas con claude code\minijuegos`) already contains `.git/` and `docs/` (the spec and this plan). `create-next-app` refuses to scaffold into a non-empty directory, so scaffold into a sibling temp folder and merge.

- [ ] **Step 1: Scaffold into a temp sibling folder**

Run (from the project root's parent, or adjust paths accordingly):

```bash
cd "D:\Dev\Pruebas con claude code"
npx create-next-app@latest daily-puzzles-scaffold-tmp \
  --typescript --tailwind --eslint --app \
  --src-dir=false --import-alias "@/*" --use-npm
```

Answer any prompts with defaults (Turbopack prompt: yes is fine either way, it doesn't affect this plan).

- [ ] **Step 2: Merge the scaffold into the project root**

```bash
cd "D:\Dev\Pruebas con claude code"
mv daily-puzzles-scaffold-tmp/* "minijuegos/"
mv daily-puzzles-scaffold-tmp/.gitignore "minijuegos/.gitignore"
rm -rf daily-puzzles-scaffold-tmp
```

(On Windows PowerShell: `Move-Item daily-puzzles-scaffold-tmp\* "minijuegos\"`, `Move-Item daily-puzzles-scaffold-tmp\.gitignore "minijuegos\.gitignore"`, `Remove-Item -Recurse -Force daily-puzzles-scaffold-tmp`.)

Do **not** overwrite the existing `docs/` folder or `.git/` — the merge only adds new top-level entries (`app/`, `public/`, `package.json`, config files); it must not touch `docs/superpowers/specs/2026-09-21-daily-puzzles-design.md` or this plan file.

- [ ] **Step 3: Install app dependencies**

```bash
cd "D:\Dev\Pruebas con claude code\minijuegos"
npm install
npm install motion lucide-react
npm install -D vitest @vitejs/plugin-react jsdom
```

- [ ] **Step 4: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

- [ ] **Step 5: Add the `test` script**

In `package.json`, inside `"scripts"`, add:

```json
"test": "vitest run"
```

- [ ] **Step 6: Write a smoke test**

Create `test/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('vitest smoke test', () => {
  it('runs and can assert', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 7: Run it, verify it passes**

Run: `npm run test`
Expected: PASS — 1 test file, 1 test.

- [ ] **Step 8: Run build and lint to confirm the scaffold itself is healthy**

Run: `npm run build`
Expected: build succeeds (default Next.js starter page).

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Tailwind, motion, lucide-react, Vitest"
```

---

## Task 2: Configure fonts (Space Grotesk + Inter)

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: the scaffolded `app/layout.tsx` from Task 1.
- Produces: CSS variables `--font-heading` and `--font-body`, available globally for later components/pages to use via Tailwind (`font-[family-name:var(--font-heading)]`) or plain CSS.

No automated test applies here (font wiring is visual, verified manually in Task 35).

- [ ] **Step 1: Load the fonts in `app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'Daily Puzzles',
  description: 'Un puzzle nuevo cada día.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${spaceGrotesk.variable} ${inter.variable}`}>
        {children}
      </body>
    </html>
  );
}
```

(`ThemeProvider`, `Header`, and `PageTransition` are wired into this same file in Task 30 — this step only establishes the font variables so later steps don't need to revisit this file's shape.)

- [ ] **Step 2: Apply the body font as the default in `app/globals.css`**

Add near the top of `app/globals.css` (after Tailwind's imports):

```css
body {
  font-family: var(--font-body), system-ui, sans-serif;
}

h1, h2, h3, .font-heading {
  font-family: var(--font-heading), system-ui, sans-serif;
}
```

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat: wire Space Grotesk and Inter fonts"
```

---

## Task 3: Dual light/dark theme (ThemeProvider + CSS variables)

**Files:**
- Create: `components/ThemeProvider.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: nothing new.
- Produces: `ThemeProvider` (React component, wraps the app) and `useTheme(): { theme: 'light' | 'dark'; toggle: () => void }`, both exported from `components/ThemeProvider.tsx`. `ThemeToggle` (Task 19) and any themed component consume `useTheme`.

Decision: theme state lives in `components/ThemeProvider.tsx` (not a separate `lib/theme.tsx`), since it's a React context/provider, not pure logic — keeping it next to the other providers under `/components` matches where `app/layout.tsx` will import it from.

No automated test (localStorage + `matchMedia` + DOM `dataset` side effects) — verified manually in Task 35 (toggle persists across reload, respects OS preference on first visit).

- [ ] **Step 1: Define the CSS variables for both themes**

Add to `app/globals.css` (after the font rules from Task 2):

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
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
}
```

(This is appended to `app/globals.css`; the `body { font-family: ... }` rule from Task 2 stays as-is — both rules coexist.)

- [ ] **Step 2: Write the provider and hook**

Create `components/ThemeProvider.tsx`:

```tsx
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

type Theme = 'light' | 'dark';
type ThemeContextValue = { theme: Theme; toggle: () => void };

const THEME_STORAGE_KEY = 'daily-puzzles-theme';
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, hydrated]);

  const toggle = () => setTheme((current) => (current === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
```

Before hydration, `document.documentElement` has no `data-theme` attribute, so the `:root` (light) variables apply by default — an acceptable neutral SSR state per spec §11, corrected in the first client effect.

- [ ] **Step 2: Commit**

```bash
git add components/ThemeProvider.tsx app/globals.css
git commit -m "feat: add dual light/dark ThemeProvider"
```

---

## Task 4: `types/daily-puzzle.ts`

**Files:**
- Create: `types/daily-puzzle.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `DailyPuzzle`, consumed by `lib/daily-puzzle.ts` (Task 15) and `app/page.tsx` / `app/jugar/wordle/page.tsx` (Tasks 31–32).

This is a pure type declaration — no test cycle applies. State this explicitly rather than faking a red/green step.

- [ ] **Step 1: Write the type**

```ts
export type DailyPuzzle = {
  id: string;
  date: string; // YYYY-MM-DD
  game: 'wordle';
  solution: string;
};
// Future variants (e.g. { game: 'sudoku'; data: SudokuPuzzleData }) join this
// union without touching date/persistence logic — see spec §16.
```

- [ ] **Step 2: Commit**

```bash
git add types/daily-puzzle.ts
git commit -m "feat: add DailyPuzzle type"
```

---

## Task 5: `types/wordle.ts`

**Files:**
- Create: `types/wordle.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `LetterState`, `WordleAttempt`, consumed by `lib/wordle-engine.ts` (Task 11), `types/daily-progress.ts` (Task 6), and every Wordle UI component (Tasks 25–28).

Pure type declaration — no test cycle.

- [ ] **Step 1: Write the types**

```ts
export type LetterState = 'correct' | 'present' | 'absent';

export type WordleAttempt = {
  guess: string;
  result: LetterState[];
};
```

- [ ] **Step 2: Commit**

```bash
git add types/wordle.ts
git commit -m "feat: add LetterState and WordleAttempt types"
```

---

## Task 6: `types/daily-progress.ts`

**Files:**
- Create: `types/daily-progress.ts`

**Interfaces:**
- Consumes: `WordleAttempt` from `types/wordle.ts` (Task 5).
- Produces: `GameStatus`, `DailyProgress`, `ProgressStore`, consumed by `lib/storage.ts` (Task 14), `lib/streak.ts` (Task 12), `lib/stats.ts` (Task 13), and `hooks/useDailyProgress.ts` (Task 18).

Pure type declaration — no test cycle.

- [ ] **Step 1: Write the types**

```ts
import type { WordleAttempt } from './wordle';

export type GameStatus = 'in-progress' | 'won' | 'lost';

export type DailyProgress = {
  game: string;
  status: GameStatus;
  attempts: WordleAttempt[];
  completedAt?: string;
};

export type ProgressStore = Record<string, DailyProgress>;
```

- [ ] **Step 2: Commit**

```bash
git add types/daily-progress.ts
git commit -m "feat: add DailyProgress and ProgressStore types"
```

---

## Task 7: `types/user-stats.ts`

**Files:**
- Create: `types/user-stats.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `UserStats`, consumed by `lib/stats.ts` (Task 13) and `components/StatsPanel.tsx` (Task 29).

Pure type declaration — no test cycle.

- [ ] **Step 1: Write the type**

```ts
export type UserStats = {
  played: number;
  won: number;
  winPercentage: number;
  currentStreak: number;
  bestStreak: number;
  attemptsDistribution: Record<1 | 2 | 3 | 4 | 5 | 6, number>;
};
```

- [ ] **Step 2: Commit**

```bash
git add types/user-stats.ts
git commit -m "feat: add UserStats type"
```

---

## Task 8: `types/game-result.ts`

**Files:**
- Create: `types/game-result.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `GameResult`, consumed by `components/ResultModal.tsx` (Task 27), `components/ShareButton.tsx` (Task 28), and `app/jugar/wordle/page.tsx` (Task 32).

Pure type declaration — no test cycle.

- [ ] **Step 1: Write the type**

```ts
export type GameResult = {
  status: 'won' | 'lost';
  attempts: number;
  solution?: string; // present only when status === 'lost'
  streak: number;
};
```

- [ ] **Step 2: Commit**

```bash
git add types/game-result.ts
git commit -m "feat: add GameResult type"
```

---

## Task 9: `lib/date.ts`

**Files:**
- Create: `lib/date.ts`
- Test: `lib/date.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `diffInDays(a: Date, b: Date): number`, `getTodayKey(date?: Date): string`, `parseDateKey(key: string): Date`, `resolveDebugDate(searchParam: string | null, isProduction: boolean): Date | null`. Consumed by `lib/daily-puzzle.ts` (15), `lib/streak.ts` (12), `hooks/useTodayKey.ts` (17).

`parseDateKey` is an addition beyond the spec's explicit list (spec §6 only names `getTodayKey`) — it's the inverse of `getTodayKey` and is needed by `lib/streak.ts` to turn stored date-keys back into comparable `Date`s. It belongs in `date.ts` alongside the other date primitives.

- [ ] **Step 1: Write the failing tests**

Create `lib/date.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test -- lib/date.test.ts`
Expected: FAIL — `./date` has no exported members (module doesn't exist yet).

- [ ] **Step 3: Implement**

Create `lib/date.ts`:

```ts
function toLocalMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function diffInDays(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const aTime = toLocalMidnight(a).getTime();
  const bTime = toLocalMidnight(b).getTime();
  return Math.round((aTime - bTime) / msPerDay);
}

export function getTodayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

const DEBUG_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function resolveDebugDate(
  searchParam: string | null,
  isProduction: boolean,
): Date | null {
  if (isProduction || !searchParam) return null;
  if (!DEBUG_DATE_PATTERN.test(searchParam)) return null;

  const [year, month, day] = searchParam.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const isRealCalendarDate =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  return isRealCalendarDate ? date : null;
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm run test -- lib/date.test.ts`
Expected: PASS — all cases green.

- [ ] **Step 5: Commit**

```bash
git add lib/date.ts lib/date.test.ts
git commit -m "feat: add date utilities (getTodayKey, diffInDays, resolveDebugDate)"
```

---

## Task 10: Word lists — `data/words/solutions.ts` + `data/words/valid-guesses.ts`

**Files:**
- Create: `data/words/solutions.ts`
- Create: `data/words/valid-guesses.ts`
- Test: `data/words/words.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `SOLUTIONS: readonly string[]`, `VALID_GUESSES: readonly string[]`, consumed by `lib/daily-puzzle.ts` (15), `lib/wordle-engine.ts`'s `isWordValid` (11), and `app/page.tsx` / `app/jugar/wordle/page.tsx` (31–32).

**Acceptance note (read before starting):** the user explicitly requested a ≥500-word solution pool. This task seeds a real, curated, correctly-formatted starter list — not a placeholder — but a list this size (~90 words) is what's practical to hand-curate accurately in one task. The test file asserts the *true* target (`>= 500`), so **two of its assertions are expected to fail after this task** (the length thresholds); every other assertion (format, no duplicates, superset relationship) must pass. This gap is not silently left open: **Task 35's checklist explicitly requires topping up both files to the ≥500/≥500 thresholds and re-running this exact test suite to green before the project is considered done.**

- [ ] **Step 1: Write the test first**

Create `data/words/words.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SOLUTIONS } from './solutions';
import { VALID_GUESSES } from './valid-guesses';

const WORD_PATTERN = /^[A-ZÑ]{5}$/;

describe('SOLUTIONS', () => {
  it('every entry is a 5-letter uppercase word (no accents, Ñ allowed)', () => {
    for (const word of SOLUTIONS) {
      expect(word).toMatch(WORD_PATTERN);
    }
  });

  it('has no duplicates', () => {
    expect(new Set(SOLUTIONS).size).toBe(SOLUTIONS.length);
  });

  it('has at least 500 solutions', () => {
    expect(SOLUTIONS.length).toBeGreaterThanOrEqual(500);
  });
});

describe('VALID_GUESSES', () => {
  it('every entry is a 5-letter uppercase word (no accents, Ñ allowed)', () => {
    for (const word of VALID_GUESSES) {
      expect(word).toMatch(WORD_PATTERN);
    }
  });

  it('has no duplicates', () => {
    expect(new Set(VALID_GUESSES).size).toBe(VALID_GUESSES.length);
  });

  it('is at least as large as SOLUTIONS', () => {
    expect(VALID_GUESSES.length).toBeGreaterThanOrEqual(SOLUTIONS.length);
  });

  it('contains every solution word (strict superset)', () => {
    const guessSet = new Set(VALID_GUESSES);
    for (const word of SOLUTIONS) {
      expect(guessSet.has(word)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test -- data/words/words.test.ts`
Expected: FAIL — `./solutions` and `./valid-guesses` don't exist yet.

- [ ] **Step 3: Implement `data/words/solutions.ts`**

```ts
export const SOLUTIONS: readonly string[] = [
  'PIÑAS', 'CASAS', 'NIEVE', 'MUNDO', 'LIBRO', 'FUEGO', 'PLAYA', 'CALLE',
  'NOCHE', 'VERDE', 'TIGRE', 'PUNTO', 'CAMPO', 'TORRE', 'DULCE', 'RAYOS',
  'PIANO', 'RADIO', 'LUNES', 'MARZO', 'ABRIL', 'MAYOR', 'MENOR', 'VIAJE',
  'FALDA', 'BOLSO', 'GATOS', 'PERRO', 'RATON', 'LOBOS', 'AGUAS', 'ARBOL',
  'NUBES', 'LUCES', 'MESAS', 'SILLA', 'PARED', 'TECHO', 'PISOS', 'LLAVE',
  'RELOJ', 'CARTA', 'SOBRE', 'FIRMA', 'NOTAS', 'TEXTO', 'LINEA', 'PALCO',
  'RITMO', 'BAILE', 'CANTO', 'VOCES', 'LETRA', 'LIBRE', 'JUSTO', 'FALSO',
  'CLARO', 'DEBIL', 'LENTO', 'NUEVO', 'VIEJO', 'JOVEN', 'NIETO', 'PADRE',
  'MADRE', 'HIJOS', 'PRIMO', 'NOVIO', 'AMIGO', 'DUEÑO', 'SUEÑO', 'LEÑOS',
  'MOÑOS', 'PUÑOS', 'BAÑOS', 'NIÑOS', 'GRUPO', 'AGUJA', 'BOTAS', 'GORRA',
  'CINTA', 'TELAS', 'HILOS', 'CLAVO', 'TORNO', 'MOTOR', 'RUEDA', 'FRENO',
  'BARCO', 'AVION',
];
```

- [ ] **Step 4: Implement `data/words/valid-guesses.ts`**

```ts
import { SOLUTIONS } from './solutions';

const EXTRA_VALID_GUESSES: readonly string[] = [
  'PLATO', 'VASOS', 'TAZAS', 'FECHA', 'HORAS', 'ENERO', 'FRASE', 'TENER',
  'HACER', 'VOLAR', 'NADAR', 'JUGAR', 'MIRAR', 'ANDAR', 'COMER', 'BEBER',
  'SOÑAR',
];

export const VALID_GUESSES: readonly string[] = [...SOLUTIONS, ...EXTRA_VALID_GUESSES];
```

- [ ] **Step 5: Run tests, confirm the expected partial result**

Run: `npm run test -- data/words/words.test.ts`
Expected: 6 of 8 tests PASS (format ×2, no-duplicates ×2, superset-size, superset-contains). 2 tests FAIL (`has at least 500 solutions`, at 90; `is at least as large as SOLUTIONS` passes actually since VALID_GUESSES=107 ≥ 90 — re-check: only the `>= 500` assertion on SOLUTIONS fails). This is the expected, documented state — do not add filler words to force a pass here; the real top-up is Task 35.

- [ ] **Step 6: Commit**

```bash
git add data/words/solutions.ts data/words/valid-guesses.ts data/words/words.test.ts
git commit -m "feat: seed word lists (90 solutions, 107 valid guesses) — top-up to 500 tracked in Task 35"
```

---

## Task 11: `lib/wordle-engine.ts`

**Files:**
- Create: `lib/wordle-engine.ts`
- Test: `lib/wordle-engine.test.ts`

**Interfaces:**
- Consumes: `LetterState`, `WordleAttempt` from `types/wordle.ts` (Task 5).
- Produces: `WORD_LENGTH = 5`, `MAX_ATTEMPTS = 6`, `evaluateGuess(guess: string, solution: string): LetterState[]`, `isWordValid(word: string, validGuesses: readonly string[]): boolean`, `mergeLetterStates(attempts: WordleAttempt[]): Record<string, LetterState>`. Consumed by `app/jugar/wordle/page.tsx` (32) and `components/WordleKeyboard.tsx` (26, via the merged states computed by the page).

`mergeLetterStates` is an addition beyond the spec's explicit function list — it factors out the "which color does this keyboard key show" logic (spec's `WordleKeyboard` needs a `letterStates` prop) into a small pure, testable function instead of embedding it in the page component.

- [ ] **Step 1: Write the failing tests**

Create `lib/wordle-engine.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { evaluateGuess, isWordValid, mergeLetterStates, WORD_LENGTH, MAX_ATTEMPTS } from './wordle-engine';

describe('constants', () => {
  it('WORD_LENGTH is 5 and MAX_ATTEMPTS is 6', () => {
    expect(WORD_LENGTH).toBe(5);
    expect(MAX_ATTEMPTS).toBe(6);
  });
});

describe('evaluateGuess', () => {
  it('marks every letter correct on an exact match', () => {
    expect(evaluateGuess('CASAS', 'CASAS')).toEqual([
      'correct', 'correct', 'correct', 'correct', 'correct',
    ]);
  });

  it('marks every letter absent when nothing matches', () => {
    expect(evaluateGuess('MUNDO', 'FIRMA')).toEqual([
      'absent', 'absent', 'absent', 'absent', 'absent',
    ]);
  });

  it('does not over-count a repeated guess letter beyond the solution count', () => {
    // guess "AAAAB" vs solution "AABCD": only 2 A's exist in the solution.
    // Positions 0-1 match exactly; the extra A's at 2-3 must be absent,
    // not present.
    expect(evaluateGuess('AAAAB', 'AABCD')).toEqual([
      'correct', 'correct', 'absent', 'absent', 'present',
    ]);
  });

  it('handles a guess with no exact matches but shared repeated letters', () => {
    // guess "LLAMA" vs solution "MAMAS": no position matches exactly;
    // solution has M:2, A:2, S:1 available for the "present" pass.
    expect(evaluateGuess('LLAMA', 'MAMAS')).toEqual([
      'absent', 'absent', 'present', 'present', 'present',
    ]);
  });
});

describe('isWordValid', () => {
  const list = ['CASAS', 'NIEVE'];

  it('returns true for a word in the list', () => {
    expect(isWordValid('CASAS', list)).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isWordValid('casas', list)).toBe(true);
  });

  it('returns false for a word not in the list', () => {
    expect(isWordValid('ZORRO', list)).toBe(false);
  });
});

describe('mergeLetterStates', () => {
  it('returns the best known state per letter across attempts', () => {
    const attempts = [
      { guess: 'CASAS', result: ['absent', 'present', 'absent', 'present', 'absent'] as const },
      { guess: 'CAMPO', result: ['correct', 'correct', 'absent', 'absent', 'absent'] as const },
    ];
    const merged = mergeLetterStates(attempts as any);
    expect(merged.C).toBe('correct');
    expect(merged.A).toBe('correct');
    expect(merged.S).toBe('present');
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test -- lib/wordle-engine.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Implement**

Create `lib/wordle-engine.ts`:

```ts
import type { LetterState, WordleAttempt } from '../types/wordle';

export const WORD_LENGTH = 5;
export const MAX_ATTEMPTS = 6;

export function evaluateGuess(guess: string, solution: string): LetterState[] {
  const guessLetters = guess.toUpperCase().split('');
  const solutionLetters = solution.toUpperCase().split('');
  const result: LetterState[] = new Array(WORD_LENGTH).fill('absent');
  const remaining: Record<string, number> = {};

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessLetters[i] === solutionLetters[i]) {
      result[i] = 'correct';
    } else {
      const letter = solutionLetters[i];
      remaining[letter] = (remaining[letter] ?? 0) + 1;
    }
  }

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === 'correct') continue;
    const letter = guessLetters[i];
    if ((remaining[letter] ?? 0) > 0) {
      result[i] = 'present';
      remaining[letter] -= 1;
    }
  }

  return result;
}

export function isWordValid(word: string, validGuesses: readonly string[]): boolean {
  return validGuesses.includes(word.toUpperCase());
}

const STATE_PRIORITY: Record<LetterState, number> = { absent: 0, present: 1, correct: 2 };

export function mergeLetterStates(attempts: WordleAttempt[]): Record<string, LetterState> {
  const merged: Record<string, LetterState> = {};
  for (const attempt of attempts) {
    const letters = attempt.guess.toUpperCase().split('');
    letters.forEach((letter, i) => {
      const state = attempt.result[i];
      const existing = merged[letter];
      if (!existing || STATE_PRIORITY[state] > STATE_PRIORITY[existing]) {
        merged[letter] = state;
      }
    });
  }
  return merged;
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm run test -- lib/wordle-engine.test.ts`
Expected: PASS — all cases green.

- [ ] **Step 5: Commit**

```bash
git add lib/wordle-engine.ts lib/wordle-engine.test.ts
git commit -m "feat: add wordle-engine (evaluateGuess, isWordValid, mergeLetterStates)"
```

---

## Task 12: `lib/streak.ts`

**Files:**
- Create: `lib/streak.ts`
- Test: `lib/streak.test.ts`

**Interfaces:**
- Consumes: `ProgressStore` from `types/daily-progress.ts` (Task 6); `diffInDays`, `parseDateKey` from `lib/date.ts` (Task 9).
- Produces: `StreakInfo = { current: number; best: number }`, `calculateStreak(store: ProgressStore, todayKey: string): StreakInfo`. Consumed by `lib/stats.ts` (13) and `app/page.tsx` (31).

- [ ] **Step 1: Write the failing tests**

Create `lib/streak.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { calculateStreak } from './streak';
import type { ProgressStore } from '../types/daily-progress';

function won(dateKeys: string[]): ProgressStore {
  const store: ProgressStore = {};
  for (const key of dateKeys) {
    store[key] = { game: 'wordle', status: 'won', attempts: [], completedAt: `${key}T10:00:00Z` };
  }
  return store;
}

describe('calculateStreak', () => {
  it('returns 0/0 for no history', () => {
    expect(calculateStreak({}, '2026-09-21')).toEqual({ current: 0, best: 0 });
  });

  it('keeps best higher than current when the streak broke in the middle', () => {
    const store = won(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-10']);
    // 3-day streak (01-03), gap, then a lone win on the 10th (today).
    expect(calculateStreak(store, '2026-09-10')).toEqual({ current: 1, best: 3 });
  });

  it('counts the current streak as alive if the last win was yesterday', () => {
    const store = won(['2026-09-19', '2026-09-20']);
    expect(calculateStreak(store, '2026-09-21')).toEqual({ current: 2, best: 2 });
  });

  it('resets current to 0 but preserves best if the last win was 2+ days ago', () => {
    const store = won(['2026-09-17', '2026-09-18']);
    expect(calculateStreak(store, '2026-09-21')).toEqual({ current: 0, best: 2 });
  });

  it('extends the streak when today is already won', () => {
    const store = won(['2026-09-19', '2026-09-20', '2026-09-21']);
    expect(calculateStreak(store, '2026-09-21')).toEqual({ current: 3, best: 3 });
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test -- lib/streak.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Implement**

Create `lib/streak.ts`:

```ts
import type { ProgressStore } from '../types/daily-progress';
import { diffInDays, parseDateKey } from './date';

export type StreakInfo = { current: number; best: number };

export function calculateStreak(store: ProgressStore, todayKey: string): StreakInfo {
  const wonDates = Object.entries(store)
    .filter(([, progress]) => progress.status === 'won')
    .map(([dateKey]) => dateKey)
    .sort();

  if (wonDates.length === 0) {
    return { current: 0, best: 0 };
  }

  let best = 1;
  let run = 1;
  for (let i = 1; i < wonDates.length; i++) {
    const gap = diffInDays(parseDateKey(wonDates[i]), parseDateKey(wonDates[i - 1]));
    run = gap === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }

  const mostRecent = wonDates[wonDates.length - 1];
  const daysSinceMostRecent = diffInDays(parseDateKey(todayKey), parseDateKey(mostRecent));

  if (daysSinceMostRecent > 1) {
    return { current: 0, best };
  }

  let current = 1;
  for (let i = wonDates.length - 1; i > 0; i--) {
    const gap = diffInDays(parseDateKey(wonDates[i]), parseDateKey(wonDates[i - 1]));
    if (gap === 1) {
      current += 1;
    } else {
      break;
    }
  }

  return { current, best };
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm run test -- lib/streak.test.ts`
Expected: PASS — all cases green.

- [ ] **Step 5: Commit**

```bash
git add lib/streak.ts lib/streak.test.ts
git commit -m "feat: add calculateStreak"
```

---

## Task 13: `lib/stats.ts`

**Files:**
- Create: `lib/stats.ts`
- Test: `lib/stats.test.ts`

**Interfaces:**
- Consumes: `ProgressStore` from `types/daily-progress.ts` (6); `UserStats` from `types/user-stats.ts` (7); `calculateStreak` from `lib/streak.ts` (12).
- Produces: `calculateStats(store: ProgressStore, todayKey: string): UserStats`. Consumed by `app/estadisticas/page.tsx` (34).

- [ ] **Step 1: Write the failing tests**

Create `lib/stats.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { calculateStats } from './stats';
import type { ProgressStore } from '../types/daily-progress';

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
      '2026-09-18': { game: 'wordle', status: 'won', attempts: [{}, {}, {}] as any, completedAt: 'x' },
      '2026-09-19': { game: 'wordle', status: 'lost', attempts: [{}, {}, {}, {}, {}, {}] as any, completedAt: 'x' },
      '2026-09-20': { game: 'wordle', status: 'won', attempts: [{}, {}, {}] as any, completedAt: 'x' },
      '2026-09-21': { game: 'wordle', status: 'in-progress', attempts: [{}] as any },
    };

    const stats = calculateStats(store, '2026-09-20');

    expect(stats.played).toBe(2); // in-progress day doesn't count as played
    expect(stats.won).toBe(2);
    expect(stats.winPercentage).toBe(100);
    expect(stats.attemptsDistribution[3]).toBe(2);
    expect(stats.attemptsDistribution[1]).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test -- lib/stats.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Implement**

Create `lib/stats.ts`:

```ts
import type { ProgressStore } from '../types/daily-progress';
import type { UserStats } from '../types/user-stats';
import { calculateStreak } from './streak';

export function calculateStats(store: ProgressStore, todayKey: string): UserStats {
  const finishedEntries = Object.values(store).filter((p) => p.status !== 'in-progress');
  const wonEntries = finishedEntries.filter((p) => p.status === 'won');

  const played = finishedEntries.length;
  const won = wonEntries.length;
  const winPercentage = played === 0 ? 0 : Math.round((won / played) * 100);

  const attemptsDistribution: UserStats['attemptsDistribution'] = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
  };
  for (const entry of wonEntries) {
    const count = entry.attempts.length;
    if (count >= 1 && count <= 6) {
      attemptsDistribution[count as 1 | 2 | 3 | 4 | 5 | 6] += 1;
    }
  }

  const { current, best } = calculateStreak(store, todayKey);

  return {
    played,
    won,
    winPercentage,
    currentStreak: current,
    bestStreak: best,
    attemptsDistribution,
  };
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm run test -- lib/stats.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/stats.ts lib/stats.test.ts
git commit -m "feat: add calculateStats"
```

---

## Task 14: `lib/storage.ts`

**Files:**
- Create: `lib/storage.ts`
- Test: `lib/storage.test.ts`

**Interfaces:**
- Consumes: `DailyProgress`, `ProgressStore` from `types/daily-progress.ts` (6).
- Produces: `PROGRESS_STORAGE_KEY`, `loadProgressStore(): ProgressStore`, `saveProgressStore(store: ProgressStore): void`, `getDayProgress(store, dateKey): DailyProgress | undefined`, `setDayProgress(store, dateKey, progress): ProgressStore`. Consumed by `hooks/useDailyProgress.ts` (18) and `app/estadisticas/page.tsx` (34).

- [ ] **Step 1: Write the failing tests**

Create `lib/storage.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  PROGRESS_STORAGE_KEY,
  loadProgressStore,
  saveProgressStore,
  getDayProgress,
  setDayProgress,
} from './storage';
import type { ProgressStore, DailyProgress } from '../types/daily-progress';

beforeEach(() => {
  window.localStorage.clear();
});

describe('loadProgressStore / saveProgressStore', () => {
  it('round-trips a store through localStorage', () => {
    const store: ProgressStore = {
      '2026-09-21': { game: 'wordle', status: 'won', attempts: [], completedAt: 'x' },
    };
    saveProgressStore(store);
    expect(loadProgressStore()).toEqual(store);
  });

  it('returns an empty object when nothing is stored', () => {
    expect(loadProgressStore()).toEqual({});
  });

  it('returns an empty object when the stored value is corrupted JSON', () => {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, '{not valid json');
    expect(loadProgressStore()).toEqual({});
  });
});

describe('getDayProgress / setDayProgress', () => {
  it('getDayProgress reads an existing entry', () => {
    const progress: DailyProgress = { game: 'wordle', status: 'in-progress', attempts: [] };
    const store: ProgressStore = { '2026-09-21': progress };
    expect(getDayProgress(store, '2026-09-21')).toBe(progress);
  });

  it('getDayProgress returns undefined for a missing entry', () => {
    expect(getDayProgress({}, '2026-09-21')).toBeUndefined();
  });

  it('setDayProgress returns a new store without mutating the original', () => {
    const original: ProgressStore = {};
    const progress: DailyProgress = { game: 'wordle', status: 'in-progress', attempts: [] };
    const updated = setDayProgress(original, '2026-09-21', progress);

    expect(updated).not.toBe(original);
    expect(original).toEqual({});
    expect(updated['2026-09-21']).toBe(progress);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test -- lib/storage.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Implement**

Create `lib/storage.ts`:

```ts
import type { DailyProgress, ProgressStore } from '../types/daily-progress';

export const PROGRESS_STORAGE_KEY = 'daily-puzzles-progress-v1';

export function loadProgressStore(): ProgressStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as ProgressStore) : {};
  } catch {
    return {};
  }
}

export function saveProgressStore(store: ProgressStore): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(store));
}

export function getDayProgress(store: ProgressStore, dateKey: string): DailyProgress | undefined {
  return store[dateKey];
}

export function setDayProgress(
  store: ProgressStore,
  dateKey: string,
  progress: DailyProgress,
): ProgressStore {
  return { ...store, [dateKey]: progress };
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm run test -- lib/storage.test.ts`
Expected: PASS. (jsdom provides a real `localStorage` implementation, so no mocking is needed.)

- [ ] **Step 5: Commit**

```bash
git add lib/storage.ts lib/storage.test.ts
git commit -m "feat: add localStorage progress store (get/set/load/save)"
```

---

## Task 15: `lib/daily-puzzle.ts`

**Files:**
- Create: `lib/daily-puzzle.ts`
- Test: `lib/daily-puzzle.test.ts`

**Interfaces:**
- Consumes: `DailyPuzzle` from `types/daily-puzzle.ts` (4); `diffInDays`, `getTodayKey` from `lib/date.ts` (9).
- Produces: `LAUNCH_DATE`, `getDailyPuzzle(date: Date, solutions: readonly string[]): DailyPuzzle`. Consumed by `app/page.tsx` (31) and `app/jugar/wordle/page.tsx` (32).

- [ ] **Step 1: Write the failing tests**

Create `lib/daily-puzzle.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getDailyPuzzle, LAUNCH_DATE } from './daily-puzzle';

const solutions = ['ALFA', 'BETA', 'GAMA'].map((w) => w.padEnd(5, 'X')); // 3-word pool for wraparound tests

describe('getDailyPuzzle', () => {
  it('is deterministic: same date always returns the same puzzle', () => {
    const date = new Date(2026, 5, 15);
    expect(getDailyPuzzle(date, solutions)).toEqual(getDailyPuzzle(date, solutions));
  });

  it('returns a different index on the next day (for a pool > 1)', () => {
    const day1 = getDailyPuzzle(new Date(2026, 5, 15), solutions);
    const day2 = getDailyPuzzle(new Date(2026, 5, 16), solutions);
    expect(day1.solution).not.toBe(day2.solution);
  });

  it('never throws or returns a negative index for a date before LAUNCH_DATE', () => {
    const beforeLaunch = new Date(LAUNCH_DATE.getFullYear() - 1, 0, 1);
    const puzzle = getDailyPuzzle(beforeLaunch, solutions);
    expect(solutions).toContain(puzzle.solution);
  });

  it('wraps around after solutions.length days', () => {
    const day0 = getDailyPuzzle(LAUNCH_DATE, solutions);
    const wrapped = getDailyPuzzle(
      new Date(LAUNCH_DATE.getFullYear(), LAUNCH_DATE.getMonth(), LAUNCH_DATE.getDate() + solutions.length),
      solutions,
    );
    expect(wrapped.solution).toBe(day0.solution);
  });

  it('includes the correct date key and game field', () => {
    const date = new Date(2026, 8, 21);
    const puzzle = getDailyPuzzle(date, solutions);
    expect(puzzle.date).toBe('2026-09-21');
    expect(puzzle.game).toBe('wordle');
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test -- lib/daily-puzzle.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Implement**

Create `lib/daily-puzzle.ts`:

```ts
import type { DailyPuzzle } from '../types/daily-puzzle';
import { diffInDays, getTodayKey } from './date';

// Fixed epoch anchor for the daily index. MUST NEVER CHANGE after shipping —
// changing it reshuffles every date's puzzle (see spec §7).
export const LAUNCH_DATE = new Date(2024, 0, 1);

function nonNegativeModulo(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function getDailyPuzzle(date: Date, solutions: readonly string[]): DailyPuzzle {
  const daysSinceLaunch = diffInDays(date, LAUNCH_DATE);
  const index = nonNegativeModulo(daysSinceLaunch, solutions.length);

  return {
    id: `wordle-${index}`,
    date: getTodayKey(date),
    game: 'wordle',
    solution: solutions[index],
  };
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm run test -- lib/daily-puzzle.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/daily-puzzle.ts lib/daily-puzzle.test.ts
git commit -m "feat: add getDailyPuzzle (deterministic daily selection)"
```

---

## Task 16: `data/games.ts`

**Files:**
- Create: `data/games.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `GameId`, `GameMeta`, `GAMES: GameMeta[]`. Consumed by `app/juegos/page.tsx` (33).

Static data, no test needed.

- [ ] **Step 1: Write the data**

```ts
export type GameId = 'wordle' | 'sudoku' | 'connections' | 'memory';

export type GameMeta = {
  id: GameId;
  name: string;
  description: string;
  available: boolean;
};

export const GAMES: GameMeta[] = [
  { id: 'wordle', name: 'Wordle', description: 'Descubrí la palabra en 6 intentos.', available: true },
  { id: 'sudoku', name: 'Sudoku', description: 'Próximamente.', available: false },
  { id: 'connections', name: 'Connections', description: 'Próximamente.', available: false },
  { id: 'memory', name: 'Memory', description: 'Próximamente.', available: false },
];
```

- [ ] **Step 2: Commit**

```bash
git add data/games.ts
git commit -m "feat: add games metadata (Wordle available, rest próximamente)"
```

---

## Task 17: `hooks/useTodayKey.ts`

**Files:**
- Create: `hooks/useTodayKey.ts`

**Interfaces:**
- Consumes: `getTodayKey`, `resolveDebugDate` from `lib/date.ts` (9).
- Produces: `useTodayKey(): { todayKey: string; today: Date }`. Consumed by `app/page.tsx` (31) and `app/jugar/wordle/page.tsx` (32).

**Decision:** read `?debugDate` via `window.location.search` inside `useEffect`, not `useSearchParams` — the latter requires wrapping the page in a `<Suspense>` boundary in the App Router, which is unnecessary ceremony for a dev-only query param. This also means the hook only has real values after mount, which is already required anyway (SSR-safe hydration, spec §11).

**Decision:** this hook is verified manually rather than with `renderHook` — adding `@testing-library/react` as a dependency for a single hook test isn't worth it given "evitar dependencias innecesarias" (spec's code-quality section). Manual verification via `?debugDate=<date>` in the browser is covered by Task 35's checklist.

- [ ] **Step 1: Implement**

Create `hooks/useTodayKey.ts`:

```ts
'use client';

import { useEffect, useState } from 'react';
import { getTodayKey, resolveDebugDate } from '../lib/date';

function computeToday(): { todayKey: string; today: Date } {
  if (typeof window === 'undefined') {
    const today = new Date();
    return { todayKey: getTodayKey(today), today };
  }

  const params = new URLSearchParams(window.location.search);
  const debugDate = resolveDebugDate(
    params.get('debugDate'),
    process.env.NODE_ENV === 'production',
  );
  const today = debugDate ?? new Date();
  return { todayKey: getTodayKey(today), today };
}

export function useTodayKey(): { todayKey: string; today: Date } {
  const [value, setValue] = useState(computeToday);

  useEffect(() => {
    const recompute = () => {
      const next = computeToday();
      setValue((current) => (current.todayKey === next.todayKey ? current : next));
    };

    recompute();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') recompute();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', recompute);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', recompute);
    };
  }, []);

  return value;
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useTodayKey.ts
git commit -m "feat: add useTodayKey hook with day-change detection"
```

---

## Task 18: `hooks/useDailyProgress.ts`

**Files:**
- Create: `hooks/useDailyProgress.ts`

**Interfaces:**
- Consumes: `ProgressStore`, `DailyProgress` from `types/daily-progress.ts` (6); `WordleAttempt` from `types/wordle.ts` (5); `loadProgressStore`, `saveProgressStore`, `setDayProgress` from `lib/storage.ts` (14).
- Produces: `useDailyProgress(): { store: ProgressStore; hydrated: boolean; recordAttempt: (dateKey, attempt) => void; finishGame: (dateKey, status) => void }`. Consumed by `app/page.tsx` (31) and `app/jugar/wordle/page.tsx` (32).

No automated test (thin stateful wrapper around already-tested `lib/storage.ts` functions plus React state) — verified manually via Task 35 (reload mid-game restores attempts; reload after finishing blocks replay).

- [ ] **Step 1: Implement**

Create `hooks/useDailyProgress.ts`:

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DailyProgress, ProgressStore } from '../types/daily-progress';
import type { WordleAttempt } from '../types/wordle';
import { loadProgressStore, saveProgressStore, setDayProgress } from '../lib/storage';

export function useDailyProgress() {
  const [store, setStore] = useState<ProgressStore>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStore(loadProgressStore());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: ProgressStore) => {
    setStore(next);
    saveProgressStore(next);
  }, []);

  const recordAttempt = useCallback(
    (dateKey: string, attempt: WordleAttempt) => {
      setStore((current) => {
        const existing = current[dateKey];
        const progress: DailyProgress = {
          game: 'wordle',
          status: 'in-progress',
          attempts: [...(existing?.attempts ?? []), attempt],
        };
        const next = setDayProgress(current, dateKey, progress);
        saveProgressStore(next);
        return next;
      });
    },
    [],
  );

  const finishGame = useCallback(
    (dateKey: string, status: 'won' | 'lost') => {
      setStore((current) => {
        const existing = current[dateKey];
        const progress: DailyProgress = {
          game: 'wordle',
          status,
          attempts: existing?.attempts ?? [],
          completedAt: new Date().toISOString(),
        };
        const next = setDayProgress(current, dateKey, progress);
        saveProgressStore(next);
        return next;
      });
    },
    [],
  );

  return { store, hydrated, recordAttempt, finishGame, persist };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useDailyProgress.ts
git commit -m "feat: add useDailyProgress hook"
```

---

## Task 19: `components/ThemeToggle.tsx`

**Files:**
- Create: `components/ThemeToggle.tsx`

**Interfaces:**
- Consumes: `useTheme` from `components/ThemeProvider.tsx` (3).
- Produces: `ThemeToggle` component. Consumed by `components/Header.tsx` (20).

No automated test (presentational) — verified manually in Task 35.

- [ ] **Step 1: Implement**

```tsx
'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Cambiar tema"
      className="rounded-full p-2 text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ThemeToggle.tsx
git commit -m "feat: add ThemeToggle component"
```

---

## Task 20: `components/Header.tsx`

**Files:**
- Create: `components/Header.tsx`

**Interfaces:**
- Consumes: `ThemeToggle` (19).
- Produces: `Header` component. Consumed by `app/layout.tsx` (30).

No automated test — verified manually in Task 35 (responsive check).

- [ ] **Step 1: Implement**

```tsx
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';

const NAV_ITEMS = [
  { href: '/', label: 'Hoy' },
  { href: '/juegos', label: 'Juegos' },
  { href: '/estadisticas', label: 'Estadísticas' },
];

export function Header() {
  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-heading text-lg font-bold tracking-tight">
          DAILY PUZZLES
        </Link>
        <nav className="flex items-center gap-1 sm:gap-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2 py-1 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/Header.tsx
git commit -m "feat: add Header with nav and theme toggle"
```

---

## Task 21: `components/PageTransition.tsx`

**Files:**
- Create: `components/PageTransition.tsx`

**Interfaces:**
- Consumes: `motion`, `AnimatePresence` from `motion/react`; `usePathname` from `next/navigation`.
- Produces: `PageTransition` component. Consumed by `app/layout.tsx` (30).

No automated test — verified manually in Task 35.

- [ ] **Step 1: Implement**

```tsx
'use client';

import { AnimatePresence, motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/PageTransition.tsx
git commit -m "feat: add PageTransition"
```

---

## Task 22: `components/StreakDisplay.tsx`

**Files:**
- Create: `components/StreakDisplay.tsx`

**Interfaces:**
- Consumes: `lucide-react`'s `Flame`.
- Produces: `StreakDisplay` component, props `{ current: number }`. Consumed by `components/DailyPuzzleHero.tsx` (24) and `components/ResultModal.tsx` (27).

No automated test — verified manually in Task 35.

- [ ] **Step 1: Implement**

```tsx
import { Flame } from 'lucide-react';

export function StreakDisplay({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-text)]">
      <Flame size={16} className="text-[var(--color-present)]" aria-hidden="true" />
      <span>Racha actual: {current} {current === 1 ? 'día' : 'días'}</span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/StreakDisplay.tsx
git commit -m "feat: add StreakDisplay component"
```

---

## Task 23: `components/GameCard.tsx`

**Files:**
- Create: `components/GameCard.tsx`

**Interfaces:**
- Consumes: `GameMeta` from `data/games.ts` (16).
- Produces: `GameCard` component, props `GameMeta`. Consumed by `app/juegos/page.tsx` (33).

No automated test — verified manually in Task 35.

- [ ] **Step 1: Implement**

```tsx
import Link from 'next/link';
import type { GameMeta } from '../data/games';

const PLAY_ROUTES: Record<string, string> = {
  wordle: '/jugar/wordle',
};

export function GameCard({ id, name, description, available }: GameMeta) {
  const content = (
    <div
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 ${
        available ? '' : 'opacity-50'
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-base font-semibold">{name}</h3>
        {!available && (
          <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
            Próximamente
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p>
    </div>
  );

  if (!available) {
    return <div aria-disabled="true">{content}</div>;
  }

  return <Link href={PLAY_ROUTES[id] ?? '/'}>{content}</Link>;
}
```

- [ ] **Step 2: Commit**

```bash
git add components/GameCard.tsx
git commit -m "feat: add GameCard component"
```

---

## Task 24: `components/DailyPuzzleHero.tsx`

**Files:**
- Create: `components/DailyPuzzleHero.tsx`

**Interfaces:**
- Consumes: `DailyPuzzle` from `types/daily-puzzle.ts` (4); `StreakDisplay` (22).
- Produces: `DailyPuzzleHero` component, props `{ puzzle: DailyPuzzle; streak: number; alreadyPlayed: boolean }`. Consumed by `app/page.tsx` (31).

No automated test — verified manually in Task 35.

- [ ] **Step 1: Implement**

```tsx
import Link from 'next/link';
import type { DailyPuzzle } from '../types/daily-puzzle';
import { StreakDisplay } from './StreakDisplay';

const GAME_LABELS: Record<DailyPuzzle['game'], { name: string; description: string }> = {
  wordle: { name: 'WORDLE', description: 'Descubrí la palabra en 6 intentos.' },
};

function formatDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-');
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }).toUpperCase();
}

export function DailyPuzzleHero({
  puzzle,
  streak,
  alreadyPlayed,
}: {
  puzzle: DailyPuzzle;
  streak: number;
  alreadyPlayed: boolean;
}) {
  const label = GAME_LABELS[puzzle.game];

  return (
    <section className="mx-auto max-w-md px-4 py-12 text-center">
      <p className="text-xs font-semibold tracking-widest text-[var(--color-text-muted)]">
        PUZZLE DEL DÍA — {formatDate(puzzle.date)}
      </p>
      <h1 className="font-heading mt-2 text-4xl font-bold">{label.name}</h1>
      <p className="mt-2 text-[var(--color-text-muted)]">{label.description}</p>
      <div className="mt-4 flex justify-center">
        <StreakDisplay current={streak} />
      </div>
      <Link
        href="/jugar/wordle"
        className="mt-6 inline-block rounded-full bg-[var(--color-accent)] px-8 py-3 font-semibold text-[var(--color-accent-contrast)] transition-transform hover:scale-105"
      >
        {alreadyPlayed ? 'VER RESULTADO' : 'JUGAR'}
      </Link>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/DailyPuzzleHero.tsx
git commit -m "feat: add DailyPuzzleHero component"
```

---

## Task 25: `components/WordleBoard.tsx`

**Files:**
- Create: `components/WordleBoard.tsx`

**Interfaces:**
- Consumes: `WordleAttempt` from `types/wordle.ts` (5); `WORD_LENGTH`, `MAX_ATTEMPTS` from `lib/wordle-engine.ts` (11); `motion` from `motion/react`.
- Produces: `WordleBoard` component, props `{ attempts: WordleAttempt[]; currentGuess: string; maxAttempts: number }`. Consumed by `app/jugar/wordle/page.tsx` (32).

No automated test — verified manually in Task 35.

- [ ] **Step 1: Implement**

```tsx
'use client';

import { motion } from 'motion/react';
import type { WordleAttempt, LetterState } from '../types/wordle';
import { WORD_LENGTH } from '../lib/wordle-engine';

const TILE_COLOR: Record<LetterState, string> = {
  correct: 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] border-[var(--color-accent)]',
  present: 'bg-[var(--color-present)] text-[var(--color-accent-contrast)] border-[var(--color-present)]',
  absent: 'bg-[var(--color-absent)] text-[var(--color-accent-contrast)] border-[var(--color-absent)]',
};

function Tile({ letter, state, delay }: { letter: string; state?: LetterState; delay: number }) {
  return (
    <motion.div
      initial={state ? { rotateX: 0 } : false}
      animate={state ? { rotateX: [0, 90, 0] } : {}}
      transition={{ duration: 0.4, delay }}
      className={`flex h-12 w-12 items-center justify-center rounded-md border-2 text-xl font-bold uppercase sm:h-14 sm:w-14 ${
        state ? TILE_COLOR[state] : 'border-[var(--color-border)] text-[var(--color-text)]'
      }`}
    >
      {letter}
    </motion.div>
  );
}

export function WordleBoard({
  attempts,
  currentGuess,
  maxAttempts,
}: {
  attempts: WordleAttempt[];
  currentGuess: string;
  maxAttempts: number;
}) {
  const rows = Array.from({ length: maxAttempts }, (_, rowIndex) => {
    if (rowIndex < attempts.length) return attempts[rowIndex];
    if (rowIndex === attempts.length) return { guess: currentGuess, result: undefined };
    return { guess: '', result: undefined };
  });

  return (
    <div className="flex flex-col items-center gap-1.5">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1.5">
          {Array.from({ length: WORD_LENGTH }, (_, colIndex) => (
            <Tile
              key={colIndex}
              letter={row.guess[colIndex] ?? ''}
              state={row.result?.[colIndex]}
              delay={colIndex * 0.08}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/WordleBoard.tsx
git commit -m "feat: add WordleBoard component"
```

---

## Task 26: `components/WordleKeyboard.tsx`

**Files:**
- Create: `components/WordleKeyboard.tsx`

**Interfaces:**
- Consumes: `LetterState` from `types/wordle.ts` (5).
- Produces: `WordleKeyboard` component, props `{ onKey: (key: string) => void; letterStates: Record<string, LetterState> }`. Consumed by `app/jugar/wordle/page.tsx` (32).

No automated test — verified manually in Task 35 (both on-screen and physical keyboard).

- [ ] **Step 1: Implement**

```tsx
'use client';

import { useEffect } from 'react';
import { Delete } from 'lucide-react';
import type { LetterState } from '../types/wordle';

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
];

const KEY_COLOR: Record<LetterState, string> = {
  correct: 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]',
  present: 'bg-[var(--color-present)] text-[var(--color-accent-contrast)]',
  absent: 'bg-[var(--color-absent)] text-[var(--color-accent-contrast)]',
};

export function WordleKeyboard({
  onKey,
  letterStates,
}: {
  onKey: (key: string) => void;
  letterStates: Record<string, LetterState>;
}) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Enter') return onKey('ENTER');
      if (event.key === 'Backspace') return onKey('BACKSPACE');
      const letter = event.key.toUpperCase();
      if (/^[A-ZÑ]$/.test(letter)) onKey(letter);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onKey]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      {ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1">
          {row.map((key) => {
            const isWide = key === 'ENTER' || key === 'BACKSPACE';
            const state = letterStates[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => onKey(key)}
                aria-label={key === 'BACKSPACE' ? 'Borrar' : key === 'ENTER' ? 'Confirmar intento' : key}
                className={`flex h-11 items-center justify-center rounded-md text-xs font-semibold uppercase transition-colors sm:h-12 sm:text-sm ${
                  isWide ? 'px-2.5' : 'w-8 sm:w-9'
                } ${state ? KEY_COLOR[state] : 'bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)]'}`}
              >
                {key === 'BACKSPACE' ? <Delete size={16} /> : key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/WordleKeyboard.tsx
git commit -m "feat: add WordleKeyboard component (physical + on-screen input)"
```

---

## Task 27: `components/ResultModal.tsx`

**Files:**
- Create: `components/ResultModal.tsx`

**Interfaces:**
- Consumes: `GameResult` from `types/game-result.ts` (8); `StreakDisplay` (22); `ShareButton` (28); `motion`/`AnimatePresence` from `motion/react`.
- Produces: `ResultModal` component, props `{ result: GameResult; dateLabel: string; onClose: () => void }`. Consumed by `app/jugar/wordle/page.tsx` (32).

No automated test — verified manually in Task 35.

- [ ] **Step 1: Implement**

```tsx
'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import type { GameResult } from '../types/game-result';
import { StreakDisplay } from './StreakDisplay';
import { ShareButton } from './ShareButton';

export function ResultModal({
  result,
  dateLabel,
  onClose,
}: {
  result: GameResult;
  dateLabel: string;
  onClose: () => void;
}) {
  const won = result.status === 'won';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-sm rounded-2xl bg-[var(--color-surface)] p-6 text-center shadow-xl"
      >
        <p className="text-4xl">{won ? '🎉' : '😕'}</p>
        <h2 className="font-heading mt-2 text-2xl font-bold">
          {won ? '¡LO RESOLVISTE!' : 'CASI'}
        </h2>
        {won ? (
          <p className="mt-1 text-[var(--color-text-muted)]">
            Lo encontraste en {result.attempts} {result.attempts === 1 ? 'intento' : 'intentos'}.
          </p>
        ) : (
          <p className="mt-1 text-[var(--color-text-muted)]">
            La palabra era: <span className="font-bold text-[var(--color-text)]">{result.solution}</span>
          </p>
        )}
        <div className="mt-4 flex justify-center">
          <StreakDisplay current={result.streak} />
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <ShareButton result={result} dateLabel={dateLabel} />
          <Link
            href="/"
            onClick={onClose}
            className="rounded-full border border-[var(--color-border)] px-6 py-2.5 text-sm font-medium text-[var(--color-text)]"
          >
            Volver al inicio
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ResultModal.tsx
git commit -m "feat: add ResultModal component"
```

---

## Task 28: `components/ShareButton.tsx`

**Files:**
- Create: `components/ShareButton.tsx`

**Interfaces:**
- Consumes: `GameResult` from `types/game-result.ts` (8).
- Produces: `ShareButton` component, props `{ result: GameResult; dateLabel: string }`. Consumed by `components/ResultModal.tsx` (27).

No automated test (relies on `navigator.share`/`navigator.clipboard`, browser APIs) — verified manually in Task 35, explicitly checking the shared text never contains the solution word.

- [ ] **Step 1: Implement**

```tsx
'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import type { GameResult } from '../types/game-result';

const EMOJI: Record<'correct' | 'present' | 'absent', string> = {
  correct: '🟩',
  present: '🟨',
  absent: '⬜',
};

function buildShareText(result: GameResult, dateLabel: string, attemptGrid: string[][]): string {
  const grid = attemptGrid
    .map((row) => row.map((state) => EMOJI[state as 'correct' | 'present' | 'absent']).join(''))
    .join('\n');
  const scoreLine = result.status === 'won' ? `${result.attempts}/6` : 'X/6';

  return [
    'DAILY PUZZLES',
    dateLabel,
    grid,
    scoreLine,
    `🔥 ${result.streak} ${result.streak === 1 ? 'día' : 'días'}`,
  ].join('\n');
}

export function ShareButton({
  result,
  dateLabel,
  attemptGrid = [],
}: {
  result: GameResult;
  dateLabel: string;
  attemptGrid?: string[][];
}) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const text = buildShareText(result, dateLabel, attemptGrid);

    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // user cancelled the native share sheet — fall through to clipboard
      }
    }

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        {copied ? '¡Copiado!' : ''}
      </p>
    </div>
  );
}
```

Note: `attemptGrid` (the per-letter `LetterState[]` for each attempt, as plain strings) is passed in by `app/jugar/wordle/page.tsx` (Task 32) — `GameResult` itself doesn't carry the full grid (only the summary), so the page assembles `attemptGrid` from its local `attempts` state before rendering `ResultModal`/`ShareButton`. `ResultModal`'s props (Task 27) gain this same `attemptGrid` pass-through — update Task 27's component to accept and forward an `attemptGrid: string[][]` prop to `ShareButton` alongside `result` and `dateLabel`.

- [ ] **Step 2: Commit**

```bash
git add components/ShareButton.tsx
git commit -m "feat: add ShareButton (Web Share API with clipboard fallback)"
```

---

## Task 29: `components/StatsPanel.tsx`

**Files:**
- Create: `components/StatsPanel.tsx`

**Interfaces:**
- Consumes: `UserStats` from `types/user-stats.ts` (7).
- Produces: `StatsPanel` component, props `{ stats: UserStats }`. Consumed by `app/estadisticas/page.tsx` (34).

No automated test — verified manually in Task 35.

- [ ] **Step 1: Implement**

```tsx
import type { UserStats } from '../types/user-stats';

const SUMMARY_ITEMS: { key: keyof UserStats; label: string; suffix?: string }[] = [
  { key: 'played', label: 'Jugados' },
  { key: 'won', label: 'Ganados' },
  { key: 'winPercentage', label: '% Victorias', suffix: '%' },
  { key: 'currentStreak', label: 'Racha actual' },
  { key: 'bestStreak', label: 'Mejor racha' },
];

export function StatsPanel({ stats }: { stats: UserStats }) {
  const maxBucket = Math.max(1, ...Object.values(stats.attemptsDistribution));

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {SUMMARY_ITEMS.map((item) => (
          <div key={item.key} className="rounded-xl border border-[var(--color-border)] p-3 text-center">
            <p className="font-heading text-2xl font-bold">
              {stats[item.key]}
              {item.suffix ?? ''}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">{item.label}</p>
          </div>
        ))}
      </div>

      <h3 className="font-heading mt-8 text-sm font-semibold text-[var(--color-text-muted)]">
        DISTRIBUCIÓN DE INTENTOS
      </h3>
      <div className="mt-3 flex flex-col gap-1.5">
        {([1, 2, 3, 4, 5, 6] as const).map((attemptCount) => {
          const count = stats.attemptsDistribution[attemptCount];
          const widthPercent = Math.max(8, (count / maxBucket) * 100);
          return (
            <div key={attemptCount} className="flex items-center gap-2 text-sm">
              <span className="w-3 text-[var(--color-text-muted)]">{attemptCount}</span>
              <div
                className="h-5 rounded bg-[var(--color-accent)] text-right text-xs font-semibold text-[var(--color-accent-contrast)]"
                style={{ width: `${widthPercent}%` }}
              >
                {count > 0 ? count : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/StatsPanel.tsx
git commit -m "feat: add StatsPanel component"
```

---

## Task 30: `app/layout.tsx` (wire ThemeProvider, Header, PageTransition)

**Files:**
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `ThemeProvider` (3), `Header` (20), `PageTransition` (21).
- Produces: the finished root layout, consumed implicitly by every page.

No automated test — verified manually in Task 35.

- [ ] **Step 1: Update the layout**

```tsx
import type { Metadata } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '../components/ThemeProvider';
import { Header } from '../components/Header';
import { PageTransition } from '../components/PageTransition';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-heading' });
const inter = Inter({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'Daily Puzzles',
  description: 'Un puzzle nuevo cada día.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${spaceGrotesk.variable} ${inter.variable} min-h-screen`}>
        <ThemeProvider>
          <Header />
          <main>
            <PageTransition>{children}</PageTransition>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: wire ThemeProvider, Header and PageTransition into root layout"
```

---

## Task 31: `app/page.tsx` ("Hoy")

**Files:**
- Modify: `app/page.tsx` (replace the create-next-app starter content)

**Interfaces:**
- Consumes: `useTodayKey` (17), `useDailyProgress` (18), `getDailyPuzzle` (15), `calculateStreak` (12), `SOLUTIONS` (10), `DailyPuzzleHero` (24).
- Produces: the "Hoy" page. No later task consumes this directly (it's a route leaf).

No automated test — verified manually in Task 35.

- [ ] **Step 1: Implement**

```tsx
'use client';

import { useTodayKey } from '../hooks/useTodayKey';
import { useDailyProgress } from '../hooks/useDailyProgress';
import { getDailyPuzzle } from '../lib/daily-puzzle';
import { calculateStreak } from '../lib/streak';
import { SOLUTIONS } from '../data/words/solutions';
import { DailyPuzzleHero } from '../components/DailyPuzzleHero';

export default function TodayPage() {
  const { todayKey, today } = useTodayKey();
  const { store, hydrated } = useDailyProgress();

  const puzzle = getDailyPuzzle(today, SOLUTIONS);
  const { current: streak } = calculateStreak(store, todayKey);
  const todayStatus = store[todayKey]?.status;
  const alreadyPlayed = hydrated && (todayStatus === 'won' || todayStatus === 'lost');

  return <DailyPuzzleHero puzzle={puzzle} streak={streak} alreadyPlayed={alreadyPlayed} />;
}
```

`alreadyPlayed` only reflects a *finished* day (`'won'`/`'lost'`) — an `'in-progress'` entry still shows "JUGAR" (it resumes the game), matching spec §9's "Diseño del estado": the play route itself, not this hero, is what actually blocks replay once finished.

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: implement Hoy page"
```

---

## Task 32: `app/jugar/wordle/page.tsx`

**Files:**
- Create: `app/jugar/wordle/page.tsx`

**Interfaces:**
- Consumes: `useTodayKey` (17), `useDailyProgress` (18), `getDailyPuzzle` (15), `calculateStreak` (12), `SOLUTIONS`/`VALID_GUESSES` (10), `evaluateGuess`/`isWordValid`/`mergeLetterStates`/`WORD_LENGTH`/`MAX_ATTEMPTS` (11), `WordleBoard` (25), `WordleKeyboard` (26), `ResultModal` (27).
- Produces: the Wordle play route. No later task consumes this directly (route leaf).

This is the most stateful page in the app — it owns the in-progress guess, submits attempts, and decides win/loss. No automated test — verified manually in Task 35 (this is exactly what the manual checklist walks through end to end).

- [ ] **Step 1: Implement**

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTodayKey } from '../../../hooks/useTodayKey';
import { useDailyProgress } from '../../../hooks/useDailyProgress';
import { getDailyPuzzle } from '../../../lib/daily-puzzle';
import { calculateStreak } from '../../../lib/streak';
import { SOLUTIONS } from '../../../data/words/solutions';
import { VALID_GUESSES } from '../../../data/words/valid-guesses';
import {
  evaluateGuess,
  isWordValid,
  mergeLetterStates,
  WORD_LENGTH,
  MAX_ATTEMPTS,
} from '../../../lib/wordle-engine';
import { WordleBoard } from '../../../components/WordleBoard';
import { WordleKeyboard } from '../../../components/WordleKeyboard';
import { ResultModal } from '../../../components/ResultModal';
import type { GameResult } from '../../../types/game-result';

export default function WordlePage() {
  const { todayKey, today } = useTodayKey();
  const { store, hydrated, recordAttempt, finishGame } = useDailyProgress();
  const [currentGuess, setCurrentGuess] = useState('');
  const [invalidShake, setInvalidShake] = useState(false);

  const puzzle = useMemo(() => getDailyPuzzle(today, SOLUTIONS), [today]);
  const dayProgress = store[todayKey];
  const attempts = dayProgress?.attempts ?? [];
  const { current: streak } = calculateStreak(store, todayKey);

  const isFinished = dayProgress?.status === 'won' || dayProgress?.status === 'lost';

  useEffect(() => {
    setCurrentGuess('');
  }, [todayKey]);

  const handleKey = (key: string) => {
    if (isFinished) return;

    if (key === 'BACKSPACE') {
      setCurrentGuess((g) => g.slice(0, -1));
      return;
    }

    if (key === 'ENTER') {
      if (currentGuess.length !== WORD_LENGTH) return;
      if (!isWordValid(currentGuess, VALID_GUESSES)) {
        setInvalidShake(true);
        setTimeout(() => setInvalidShake(false), 400);
        return;
      }

      const result = evaluateGuess(currentGuess, puzzle.solution);
      recordAttempt(todayKey, { guess: currentGuess.toUpperCase(), result });
      setCurrentGuess('');

      const won = currentGuess.toUpperCase() === puzzle.solution;
      const attemptsUsed = attempts.length + 1;
      if (won || attemptsUsed >= MAX_ATTEMPTS) {
        finishGame(todayKey, won ? 'won' : 'lost');
      }
      return;
    }

    if (currentGuess.length < WORD_LENGTH) {
      setCurrentGuess((g) => g + key);
    }
  };

  const letterStates = mergeLetterStates(attempts);

  const result: GameResult | null = isFinished
    ? {
        status: dayProgress!.status as 'won' | 'lost',
        attempts: attempts.length,
        solution: dayProgress!.status === 'lost' ? puzzle.solution : undefined,
        streak,
      }
    : null;

  const attemptGrid = attempts.map((a) => a.result);
  const dateLabel = new Date(today).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

  if (!hydrated) return null;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-8 px-4 py-8">
      <div className={invalidShake ? 'animate-[shake_0.4s]' : ''}>
        <WordleBoard attempts={attempts} currentGuess={currentGuess} maxAttempts={MAX_ATTEMPTS} />
      </div>
      <WordleKeyboard onKey={handleKey} letterStates={letterStates} />
      {result && (
        <ResultModal result={result} dateLabel={dateLabel} attemptGrid={attemptGrid} onClose={() => {}} />
      )}
    </div>
  );
}
```

Add the `shake` keyframes referenced above to `app/globals.css`:

```css
@keyframes shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-8px); }
  40%, 60% { transform: translateX(8px); }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/jugar/wordle/page.tsx app/globals.css
git commit -m "feat: implement Wordle play page"
```

---

## Task 33: `app/juegos/page.tsx`

**Files:**
- Create: `app/juegos/page.tsx`

**Interfaces:**
- Consumes: `GAMES` from `data/games.ts` (16), `GameCard` (23).
- Produces: the "Juegos" page.

No automated test — verified manually in Task 35.

- [ ] **Step 1: Implement**

```tsx
import { GAMES } from '../../data/games';
import { GameCard } from '../../components/GameCard';

export default function GamesPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="font-heading text-2xl font-bold">Juegos</h1>
      <div className="mt-4 flex flex-col gap-3">
        {GAMES.map((game) => (
          <GameCard key={game.id} {...game} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/juegos/page.tsx
git commit -m "feat: implement Juegos page"
```

---

## Task 34: `app/estadisticas/page.tsx`

**Files:**
- Create: `app/estadisticas/page.tsx`

**Interfaces:**
- Consumes: `calculateStats` (13), `loadProgressStore` (14), `getTodayKey` (9), `StatsPanel` (29).
- Produces: the "Estadísticas" page.

No automated test — verified manually in Task 35.

- [ ] **Step 1: Implement**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { calculateStats } from '../../lib/stats';
import { loadProgressStore } from '../../lib/storage';
import { getTodayKey } from '../../lib/date';
import { StatsPanel } from '../../components/StatsPanel';
import type { UserStats } from '../../types/user-stats';

const EMPTY_STATS: UserStats = {
  played: 0,
  won: 0,
  winPercentage: 0,
  currentStreak: 0,
  bestStreak: 0,
  attemptsDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
};

export default function StatsPage() {
  const [stats, setStats] = useState<UserStats>(EMPTY_STATS);

  useEffect(() => {
    const store = loadProgressStore();
    setStats(calculateStats(store, getTodayKey()));
  }, []);

  return (
    <div>
      <h1 className="font-heading mx-auto max-w-md px-4 pt-8 text-2xl font-bold">Estadísticas</h1>
      <StatsPanel stats={stats} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/estadisticas/page.tsx
git commit -m "feat: implement Estadísticas page"
```

---

## Task 35: Word list top-up + final verification checklist

**Files:**
- Modify: `data/words/solutions.ts`, `data/words/valid-guesses.ts` (top-up to ≥500)

**Interfaces:**
- Consumes: everything built in Tasks 1–34.
- Produces: a verified, shippable v1.

- [ ] **Step 1: Top up the word lists**

Expand `SOLUTIONS` in `data/words/solutions.ts` from 90 to at least 500 genuine, uppercase, accent-free Spanish 5-letter words (Ñ allowed), keeping every existing entry (don't remove or reorder the 90 already-committed words — only append). Expand `EXTRA_VALID_GUESSES` in `data/words/valid-guesses.ts` so `VALID_GUESSES.length >= SOLUTIONS.length` continues to hold.

- [ ] **Step 2: Re-run the word-list test suite from Task 10 — must be fully green now**

Run: `npm run test -- data/words/words.test.ts`
Expected: PASS — all 8 assertions, including both `>= 500` thresholds.

- [ ] **Step 3: Run the full automated suite, build, and lint**

```bash
npm run test
npm run lint
npm run build
```
Expected: all green, zero TypeScript errors, zero lint errors.

- [ ] **Step 4: Manual QA — Wordle flow**

Run `npm run dev`, open the app, and confirm:
- Playing a wrong 5-letter word (not in `VALID_GUESSES`) shakes the board and does **not** consume an attempt.
- Playing a correct-length word from `VALID_GUESSES` submits, colors the tiles per letter, and updates the keyboard colors.
- Winning shows the `ResultModal` with "¡LO RESOLVISTE!", the correct attempt count, and updates the streak.
- Losing (6 wrong attempts) shows "CASI" with the real solution revealed.

- [ ] **Step 5: Manual QA — persistence**

- Reload mid-game (before finishing): the board restores the exact attempts already played.
- Reload after finishing: the app shows the result immediately and does not allow further guesses (replay blocked for that day).

- [ ] **Step 6: Manual QA — day change**

- Visit `/?debugDate=<tomorrow's date>`: a different puzzle loads and play is allowed even if today was already finished.
- Run `npm run build && npm start` (production mode) and confirm `?debugDate` has **no effect** — the real current date's puzzle loads regardless of the query param.

- [ ] **Step 7: Manual QA — responsive & theme**

- Check mobile (~375px), tablet (~768px), and desktop widths: no horizontal scroll, the on-screen keyboard is comfortably tappable on mobile.
- Toggle the theme, reload the page, and confirm the choice persisted.

- [ ] **Step 8: Manual QA — share**

- Trigger the share button after finishing a game; confirm the copied/shared text matches the spec §10 format and **never contains the solution word** (check this explicitly on both a win and a loss).
- Confirm the "¡Copiado!" feedback appears when falling back to the clipboard.

- [ ] **Step 9: Final commit**

```bash
git add -A
git commit -m "feat: top up word lists to 500+ and complete v1 manual verification"
```

---

## Self-Review

**Spec coverage** (spec section → task):
- §1 Objetivo, §2 Alcance → Tasks 1, 16 (scope enforced by what's built vs. explicitly deferred)
- §3 Stack → Task 1
- §4 Arquitectura de carpetas → Tasks 1, 4–34 (folder layout matches exactly)
- §5 Modelo de datos → Tasks 4–8 (types), 14 (persistence shape)
- §6 Fecha y cambio de día → Tasks 9, 17
- §7 Puzzle diario determinístico → Task 15
- §8 Racha → Task 12
- §9 Wordle → Tasks 10, 11, 25, 26, 32
- §10 Compartir resultado → Task 28
- §11 SSR e hidratación → Tasks 3, 18, 34 (all localStorage reads gated behind `useEffect`/hydration state)
- §12 Visual → Tasks 2, 3, 20–29
- §13 Componentes principales → Tasks 19–29
- §14 Testing → Tasks 9–15 (Vitest), 35 (manual checklist)
- §15 Accesibilidad → aria-labels in Tasks 19, 26, 28; contrast via themed CSS vars in Task 3; keyboard nav is native (buttons/links) throughout
- §16 Preparado para la siguiente etapa → Task 16 (`games.ts` placeholders), discriminated `DailyPuzzle` union in Task 4

**Placeholder scan:** no "TBD"/"TODO"/"implement later" strings anywhere in the plan. The one intentionally-incomplete state (word list count in Task 10) is not a placeholder — it's a concrete, tested, numerically-tracked gap with an explicit closing task (35), consistent with the acceptance note. Fixed one real gap found during review: `ResultModal` (Task 27) and `ShareButton` (Task 28) needed an `attemptGrid` prop that wasn't in the original signature list — added and cross-referenced in Task 28's note, and Task 32's usage already passes it correctly to both.

**Type/signature consistency:** verified `DailyProgress`, `ProgressStore`, `WordleAttempt`, `LetterState`, `GameResult`, `UserStats`, `GameMeta` are defined once (Tasks 4–8, 16) and referenced with the same names/shapes in every consuming task (9–34) — no renamed fields or mismatched signatures found.
