import Link from 'next/link';
import type { GameMeta } from '../data/games';

export function GameCard({ name, description, available, route }: GameMeta) {
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
    // A real disabled, focusable-by-default control — unlike a plain
    // `<div aria-disabled>`, `disabled` on a native <button> is reliably
    // announced by assistive tech across browsers.
    return (
      <button type="button" disabled className="w-full cursor-not-allowed text-left">
        {content}
      </button>
    );
  }

  return <Link href={route ?? '/'}>{content}</Link>;
}
