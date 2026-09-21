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
              {stats[item.key] as number}
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
