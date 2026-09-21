import { Flame } from 'lucide-react';

export function StreakDisplay({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-text)]">
      <Flame size={16} className="text-[var(--color-present)]" aria-hidden="true" />
      <span>Racha actual: {current} {current === 1 ? 'día' : 'días'}</span>
    </div>
  );
}
