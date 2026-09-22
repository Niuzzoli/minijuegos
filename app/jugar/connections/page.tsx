// app/jugar/connections/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTodayKey } from '../../../hooks/useTodayKey';
import { useDailyProgress } from '../../../hooks/useDailyProgress';
import { getDailyConnectionsPuzzle } from '../../../lib/daily-puzzle';
import { calculateStreak } from '../../../lib/streak';
import { filterStoreByGame } from '../../../lib/progress-filter';
import { evaluateGuess, colorForItem, MAX_MISTAKES } from '../../../lib/connections-engine';
import { shuffleDeterministic, hashStringToSeed } from '../../../lib/deterministic-shuffle';
import { CONNECTIONS_PUZZLES } from '../../../data/connections/puzzles';
import { ConnectionsGrid, type ConnectionsGridHandle } from '../../../components/ConnectionsGrid';
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
  const gridRef = useRef<ConnectionsGridHandle>(null);

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
      if (!won) {
        // The 4 just-solved cells unmount, so there's no "last toggled" cell
        // left for the grid's own focus-follow effect to target — move
        // focus to the first remaining item instead of letting it drop to
        // <body>. (If this guess won the game, the whole grid unmounts and
        // the finished-state heading takes over, so nothing to focus here.)
        const nextSolvedItemSet = new Set(nextSolved.flatMap((c) => c.items));
        const nextRemaining = displayOrder.filter((item) => !nextSolvedItemSet.has(item));
        gridRef.current?.focusItem(nextRemaining[0]);
      }
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
      setMessage('No es una categoría.');
      setTimeout(() => setMessage(null), 2000);
    }

    // No explicit focus call needed here: none of the 4 selected cells
    // unmount on a wrong/one-away guess, so ConnectionsGrid's own
    // focus-follows-toggle effect re-focuses the last-toggled cell once
    // `selected` clears (see ConnectionsGrid.tsx).
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
          <ConnectionsGrid
            ref={gridRef}
            items={remainingItems}
            selected={selected}
            onToggle={handleToggle}
          />
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
