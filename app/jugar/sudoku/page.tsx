'use client';

import { useEffect, useState } from 'react';
import { useTodayKey } from '../../../hooks/useTodayKey';
import { useDailyProgress } from '../../../hooks/useDailyProgress';
import { getDailySudokuPuzzle } from '../../../lib/daily-puzzle';
import { calculateStreak } from '../../../lib/streak';
import { filterStoreByGame } from '../../../lib/progress-filter';
import { isBoardComplete, boardMatchesSolution } from '../../../lib/sudoku-validate';
import { SUDOKU_PUZZLES } from '../../../data/sudoku/puzzles';
import { SudokuBoard } from '../../../components/SudokuBoard';
import { SudokuNumpad } from '../../../components/SudokuNumpad';
import { StreakDisplay } from '../../../components/StreakDisplay';
import type { SudokuBoard as SudokuBoardType } from '../../../types/sudoku';

// index = row * 9 + col (spec §1/§9 — same row-major layout as SudokuBoard).
const ARROW_DELTAS: Record<string, number> = {
  ArrowUp: -9,
  ArrowDown: 9,
  ArrowLeft: -1,
  ArrowRight: 1,
};

export default function SudokuPage() {
  const { todayKey, today } = useTodayKey();
  const { store, hydrated, updateDay } = useDailyProgress();
  const [selected, setSelected] = useState<number | null>(null);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);

  const puzzle = getDailySudokuPuzzle(today, SUDOKU_PUZZLES);
  if (puzzle.game !== 'sudoku') {
    // getDailySudokuPuzzle's declared return type is the DailyPuzzle union
    // (shared with getDailyWordlePuzzle), but it always builds a `game:
    // 'sudoku'` object — this check narrows `puzzle` so `.givens` below
    // type-checks; it can never actually throw.
    throw new Error('getDailySudokuPuzzle must return a sudoku puzzle');
  }
  const sudokuStore = filterStoreByGame(store, 'sudoku');
  const dayProgress = sudokuStore[todayKey];
  const isFinished = dayProgress?.status === 'won';
  const { current: streak } = calculateStreak(sudokuStore, todayKey);

  const board: SudokuBoardType =
    dayProgress?.game === 'sudoku' ? dayProgress.board : puzzle.givens.split('').map(Number);

  useEffect(() => {
    // Reset local UI-only state when the day changes (mount/visibilitychange/
    // focus per useTodayKey) — the board itself lives in `store`, not local
    // state, so there's nothing else to reset here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(null);
    setCheckMessage(null);
  }, [todayKey]);

  // Arrow-key cell navigation (spec §9: "flechas para mover la celda
  // seleccionada"). Neither SudokuBoard nor SudokuNumpad owns `selected`, so
  // this page is where the listener has to live. Landing on a given cell is
  // allowed here — only digit entry (writeCell, below) refuses to edit one.
  useEffect(() => {
    if (isFinished) return;

    const handler = (event: KeyboardEvent) => {
      // Same OS/browser-shortcut guard used by WordleKeyboard.tsx and
      // SudokuNumpad.tsx — don't hijack Ctrl/Cmd/Alt+Arrow combos.
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const delta = ARROW_DELTAS[event.key];
      if (delta === undefined) return;

      // Prevent the page from scrolling under the board while navigating it.
      event.preventDefault();

      setSelected((current) => {
        if (current === null) return 0; // no selection yet — start top-left
        const row = Math.floor(current / 9);
        const col = current % 9;
        if (event.key === 'ArrowUp') return row > 0 ? current - 9 : current;
        if (event.key === 'ArrowDown') return row < 8 ? current + 9 : current;
        if (event.key === 'ArrowLeft') return col > 0 ? current - 1 : current;
        if (event.key === 'ArrowRight') return col < 8 ? current + 1 : current;
        return current;
      });
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFinished]);

  const handleSelect = (index: number) => {
    if (isFinished) return;
    if (puzzle.givens[index] !== '0') return; // given cells aren't editable
    setSelected(index);
  };

  const writeCell = (value: number) => {
    if (isFinished || selected === null) return;
    if (puzzle.givens[selected] !== '0') return;

    const nextBoard = [...board];
    nextBoard[selected] = value;
    setCheckMessage(null);
    updateDay(todayKey, () => ({ game: 'sudoku', status: 'in-progress', board: nextBoard }));
  };

  const handleErase = () => writeCell(0);

  const handleCheck = () => {
    if (!isBoardComplete(board)) return;
    if (boardMatchesSolution(board, puzzle.solution)) {
      updateDay(todayKey, () => ({
        game: 'sudoku',
        status: 'won',
        board,
        completedAt: new Date().toISOString(),
      }));
      setCheckMessage(null);
    } else {
      // No per-cell error marking (spec §6/§2) — a generic message only.
      setCheckMessage('Todavía hay errores en el tablero.');
    }
  };

  if (!hydrated) return null;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-8">
      {isFinished && (
        <div className="text-center">
          <p className="font-heading text-2xl font-bold">¡Resuelto!</p>
          <div className="mt-2 flex justify-center">
            <StreakDisplay current={streak} />
          </div>
        </div>
      )}
      <SudokuBoard givens={puzzle.givens} board={board} selected={selected} onSelect={handleSelect} />
      {!isFinished && (
        <>
          <SudokuNumpad onInput={writeCell} onErase={handleErase} />
          <button
            type="button"
            onClick={handleCheck}
            disabled={!isBoardComplete(board)}
            className="rounded-full bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-[var(--color-accent-contrast)] disabled:opacity-40"
          >
            VERIFICAR
          </button>
          {checkMessage && (
            <p role="status" className="text-sm text-[var(--color-text-muted)]">
              {checkMessage}
            </p>
          )}
        </>
      )}
    </div>
  );
}
