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
  // Before hydration, `store` is `{}` (spec §11's neutral state), so every
  // card's streak/alreadyPlayed naturally default to 0/false — no separate
  // loading gate needed.
  const { store } = useDailyProgress();

  const cards = GAMES.filter((game) => game.available && game.route).map((game) => {
    const gameStore = filterStoreByGame(store, game.id);
    const status = gameStore[todayKey]?.status;
    const alreadyPlayed = status === 'won' || status === 'lost';
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
