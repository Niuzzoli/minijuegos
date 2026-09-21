'use client';

import { motion } from 'motion/react';
import { Check, ArrowLeftRight, X } from 'lucide-react';
import type { WordleAttempt, LetterState } from '../types/wordle';
import { WORD_LENGTH } from '../lib/wordle-engine';

const TILE_COLOR: Record<LetterState, string> = {
  correct: 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] border-[var(--color-accent)]',
  present: 'bg-[var(--color-present)] text-[var(--color-accent-contrast)] border-[var(--color-present)]',
  absent: 'bg-[var(--color-absent)] text-[var(--color-accent-contrast)] border-[var(--color-absent)]',
};

// Spec §15: letter states must not rely on color alone (colorblind users) —
// each state also gets a distinct icon shape.
const STATE_ICON: Record<LetterState, typeof Check> = {
  correct: Check,
  present: ArrowLeftRight,
  absent: X,
};

const STATE_LABEL: Record<LetterState, string> = {
  correct: 'correcta',
  present: 'presente en otra posición',
  absent: 'no está en la palabra',
};

function Tile({ letter, state, delay }: { letter: string; state?: LetterState; delay: number }) {
  const StateIcon = state ? STATE_ICON[state] : null;
  return (
    <motion.div
      initial={state ? { rotateX: 0 } : false}
      animate={state ? { rotateX: [0, 90, 0] } : {}}
      transition={{ duration: 0.4, delay }}
      aria-label={letter && state ? `${letter}: ${STATE_LABEL[state]}` : undefined}
      className={`relative flex h-12 w-12 items-center justify-center rounded-md border-2 text-xl font-bold uppercase sm:h-14 sm:w-14 ${
        state ? TILE_COLOR[state] : 'border-[var(--color-border)] text-[var(--color-text)]'
      }`}
    >
      {letter}
      {StateIcon && (
        <StateIcon
          aria-hidden="true"
          size={12}
          strokeWidth={3}
          className="absolute -right-1 -top-1 rounded-full bg-[var(--color-surface)] p-0.5 text-[var(--color-text)]"
        />
      )}
    </motion.div>
  );
}

export function WordleBoard({
  attempts,
  currentGuess,
  maxAttempts,
}: {
  attempts: WordleAttempt[];
  currentGuess: string;
  maxAttempts: number;
}) {
  const rows = Array.from({ length: maxAttempts }, (_, rowIndex) => {
    if (rowIndex < attempts.length) return attempts[rowIndex];
    if (rowIndex === attempts.length) return { guess: currentGuess, result: undefined };
    return { guess: '', result: undefined };
  });

  return (
    <div className="flex flex-col items-center gap-1.5">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1.5">
          {Array.from({ length: WORD_LENGTH }, (_, colIndex) => (
            <Tile
              key={colIndex}
              letter={row.guess[colIndex] ?? ''}
              state={row.result?.[colIndex]}
              delay={colIndex * 0.08}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
