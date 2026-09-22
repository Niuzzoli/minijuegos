import { MAX_MISTAKES } from '../lib/connections-engine';

export function ConnectionsMistakes({ mistakesMade }: { mistakesMade: number }) {
  const remaining = MAX_MISTAKES - mistakesMade;

  return (
    <div role="status" className="flex items-center gap-2">
      <span className="text-xs font-semibold tracking-wide text-[var(--color-text-muted)]">
        ERRORES:
      </span>
      <span className="sr-only">
        Te quedan {remaining} {remaining === 1 ? 'error' : 'errores'}
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
