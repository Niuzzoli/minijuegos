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
