// components/TodayView.tsx
'use client';

import { useTodayKey } from '../hooks/useTodayKey';
import { useDailyProgress } from '../hooks/useDailyProgress';
import { getDailyWordlePuzzle, getDailySudokuPuzzle } from '../lib/daily-puzzle';
import { calculateStreak } from '../lib/streak';
import { filterStoreByGame } from '../lib/progress-filter';
import { SOLUTIONS } from '../data/words/solutions';
import { SUDOKU_PUZZLES } from '../data/sudoku/puzzles';
import { GAMES, type GameId } from '../data/games';
import type { DailyPuzzle } from '../types/daily-puzzle';
import { PuzzleOfDayCard } from './PuzzleOfDayCard';

function getPuzzleForGame(gameId: GameId, today: Date): DailyPuzzle | null {
  if (gameId === 'wordle') return getDailyWordlePuzzle(today, SOLUTIONS);
  if (gameId === 'sudoku') return getDailySudokuPuzzle(today, SUDOKU_PUZZLES);
  return null; // connections/memory: no puzzle source yet, and never `available` today
}

export function TodayView() {
  const { todayKey, today } = useTodayKey();
  // Before hydration, `store` is `{}` (spec §11's neutral state), so every
  // card's streak/alreadyPlayed naturally default to 0/false — no separate
  // loading gate needed.
  const { store } = useDailyProgress();

  const cards = GAMES.filter((game) => game.available)
    .map((game) => {
      const puzzle = getPuzzleForGame(game.id, today);
      if (!puzzle || !game.route) return null;

      const gameStore = filterStoreByGame(store, game.id);
      const status = gameStore[todayKey]?.status;
      const alreadyPlayed = game.id === 'wordle' ? status === 'won' || status === 'lost' : status === 'won';
      const { current: streak } = calculateStreak(gameStore, todayKey);

      return (
        <PuzzleOfDayCard
          key={game.id}
          puzzle={puzzle}
          streak={streak}
          alreadyPlayed={alreadyPlayed}
          gameName={game.name.toUpperCase()}
          gameDescription={game.description}
          playRoute={game.route}
        />
      );
    })
    .filter((card) => card !== null);

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-12 sm:flex-row sm:flex-wrap sm:justify-center">
      {cards}
    </div>
  );
}
