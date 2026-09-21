'use client';

import { useEffect } from 'react';
import { Delete, Check, ArrowLeftRight, X } from 'lucide-react';
import type { LetterState } from '../types/wordle';

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
];

const KEY_COLOR: Record<LetterState, string> = {
  correct: 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]',
  present: 'bg-[var(--color-present)] text-[var(--color-accent-contrast)]',
  absent: 'bg-[var(--color-absent)] text-[var(--color-accent-contrast)]',
};

// Spec §15: letter states must not rely on color alone — same icon set as
// WordleBoard's tiles.
const STATE_ICON: Record<LetterState, typeof Check> = {
  correct: Check,
  present: ArrowLeftRight,
  absent: X,
};

export function WordleKeyboard({
  onKey,
  letterStates,
}: {
  onKey: (key: string) => void;
  letterStates: Record<string, LetterState>;
}) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Ignore OS/browser shortcuts (Ctrl+F, Cmd+…, etc.) so they don't
      // leak a letter into the current guess.
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === 'Enter') return onKey('ENTER');
      if (event.key === 'Backspace') return onKey('BACKSPACE');
      const letter = event.key.toUpperCase();
      if (/^[A-ZÑ]$/.test(letter)) onKey(letter);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onKey]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      {ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1">
          {row.map((key) => {
            const isWide = key === 'ENTER' || key === 'BACKSPACE';
            const state = letterStates[key];
            const StateIcon = state ? STATE_ICON[state] : null;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onKey(key)}
                aria-label={key === 'BACKSPACE' ? 'Borrar' : key === 'ENTER' ? 'Confirmar intento' : key}
                className={`relative flex h-11 items-center justify-center rounded-md text-xs font-semibold uppercase transition-colors sm:h-12 sm:text-sm ${
                  isWide ? 'px-2.5' : 'w-8 sm:w-9'
                } ${state ? KEY_COLOR[state] : 'bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)]'}`}
              >
                {key === 'BACKSPACE' ? <Delete size={16} /> : key}
                {StateIcon && (
                  <StateIcon
                    aria-hidden="true"
                    size={9}
                    strokeWidth={3}
                    className="absolute -right-0.5 -top-0.5 rounded-full bg-[var(--color-surface)] p-0.5 text-[var(--color-text)]"
                  />
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
