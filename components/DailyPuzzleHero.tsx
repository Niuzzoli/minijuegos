import Link from 'next/link';
import type { DailyPuzzle } from '../types/daily-puzzle';
import { GAMES } from '../data/games';
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
  const route = GAMES.find((game) => game.id === puzzle.game)?.route ?? '/juegos';

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
        href={route}
        className="mt-6 inline-block rounded-full bg-[var(--color-accent)] px-8 py-3 font-semibold text-[var(--color-accent-contrast)] transition-transform hover:scale-105"
      >
        {alreadyPlayed ? 'VER RESULTADO' : 'JUGAR'}
      </Link>
    </section>
  );
}
