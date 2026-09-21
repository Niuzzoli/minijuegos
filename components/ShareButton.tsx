'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import type { GameResult } from '../types/game-result';

const EMOJI: Record<'correct' | 'present' | 'absent', string> = {
  correct: '🟩',
  present: '🟨',
  absent: '⬜',
};

function buildShareText(result: GameResult, dateLabel: string, attemptGrid: string[][]): string {
  const grid = attemptGrid
    .map((row) => row.map((state) => EMOJI[state as 'correct' | 'present' | 'absent']).join(''))
    .join('\n');
  const scoreLine = result.status === 'won' ? `${result.attempts}/6` : 'X/6';

  return [
    'DAILY PUZZLES',
    dateLabel,
    grid,
    scoreLine,
    `🔥 ${result.streak} ${result.streak === 1 ? 'día' : 'días'}`,
  ].join('\n');
}

export function ShareButton({
  result,
  dateLabel,
  attemptGrid = [],
}: {
  result: GameResult;
  dateLabel: string;
  attemptGrid?: string[][];
}) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const text = buildShareText(result, dateLabel, attemptGrid);

    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // user cancelled the native share sheet — fall through to clipboard
      }
    }

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleShare}
        aria-label="Compartir resultado"
        className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-[var(--color-accent-contrast)]"
      >
        <Share2 size={16} />
        COMPARTIR
      </button>
      <p aria-live="polite" className="mt-1 h-4 text-xs text-[var(--color-text-muted)]">
        {copied ? '¡Copiado!' : ''}
      </p>
    </div>
  );
}
