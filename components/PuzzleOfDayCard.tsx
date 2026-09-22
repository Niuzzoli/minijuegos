import Link from 'next/link';
import type { DailyPuzzle } from '../types/daily-puzzle';
import { StreakDisplay } from './StreakDisplay';

function formatDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-');
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }).toUpperCase();
}

export function PuzzleOfDayCard({
  puzzle,
  streak,
  alreadyPlayed,
  gameName,
  gameDescription,
  playRoute,
}: {
  puzzle: DailyPuzzle;
  streak: number;
  alreadyPlayed: boolean;
  gameName: string;
  gameDescription: string;
  playRoute: string;
}) {
  return (
    <div className="w-full max-w-xs rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
      <p className="text-xs font-semibold tracking-widest text-[var(--color-text-muted)]">
        PUZZLE DEL DÍA — {formatDate(puzzle.date)}
      </p>
      <h2 className="font-heading mt-1 text-2xl font-bold">{gameName}</h2>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">{gameDescription}</p>
      <div className="mt-3 flex justify-center">
        <StreakDisplay current={streak} />
      </div>
      <Link
        href={playRoute}
        className="mt-4 inline-block rounded-full bg-[var(--color-accent)] px-6 py-2 text-sm font-semibold text-[var(--color-accent-contrast)] transition-transform hover:scale-105"
      >
        {alreadyPlayed ? 'VER RESULTADO' : 'JUGAR'}
      </Link>
    </div>
  );
}
