'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import type { ConnectionsColor } from '../types/connections';

const EMOJI: Record<ConnectionsColor, string> = {
  yellow: '🟨',
  green: '🟩',
  blue: '🟦',
  purple: '🟪',
};

function buildShareText(
  guessHistory: ConnectionsColor[][],
  status: 'won' | 'lost',
  streak: number,
): string {
  // Colors only, never category titles — a lost game's grid is still fine
  // to share, same "no problem sharing a loss" convention as Wordle's X/6.
  const grid = guessHistory.map((row) => row.map((color) => EMOJI[color]).join('')).join('\n');
  const resultLine = status === 'won' ? 'Resuelto' : 'No resuelto';

  return [
    'DAILY PUZZLES — CONNECTIONS',
    grid,
    resultLine,
    `🔥 ${streak} ${streak === 1 ? 'día' : 'días'}`,
  ].join('\n');
}

export function ConnectionsShareButton({
  guessHistory,
  status,
  streak,
}: {
  guessHistory: ConnectionsColor[][];
  status: 'won' | 'lost';
  streak: number;
}) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const handleShare = async () => {
    const text = buildShareText(guessHistory, status, streak);

    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch (err) {
        // AbortError = user cancelled the native share sheet, the expected
        // path to fall through to clipboard. Any other rejection is a real
        // share failure — still fall back to clipboard, but log it instead
        // of silently treating it as a cancel.
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          console.error('navigator.share failed', err);
        }
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('clipboard write failed', err);
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 2000);
    }
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
        {copied ? '¡Copiado!' : copyFailed ? 'No se pudo copiar' : ''}
      </p>
    </div>
  );
}
