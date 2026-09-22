'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { X } from 'lucide-react';
import type { GameResult } from '../types/game-result';
import { StreakDisplay } from './StreakDisplay';
import { ShareButton } from './ShareButton';

export function ResultModal({
  result,
  dateLabel,
  attemptGrid,
  onClose,
}: {
  result: GameResult;
  dateLabel: string;
  attemptGrid: string[][];
  onClose: () => void;
}) {
  const won = result.status === 'won';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-sm rounded-2xl bg-[var(--color-surface)] p-6 text-center shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar y ver el tablero"
          className="absolute right-3 top-3 rounded-full p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-border)] hover:text-[var(--color-text)]"
        >
          <X size={18} />
        </button>
        <p className="text-4xl">{won ? '🎉' : '😕'}</p>
        <h2 className="font-heading mt-2 text-2xl font-bold">
          {won ? '¡LO RESOLVISTE!' : 'CASI'}
        </h2>
        {won ? (
          <p className="mt-1 text-[var(--color-text-muted)]">
            Lo encontraste en {result.attempts} {result.attempts === 1 ? 'intento' : 'intentos'}.
          </p>
        ) : (
          <p className="mt-1 text-[var(--color-text-muted)]">
            La palabra era: <span className="font-bold text-[var(--color-text)]">{result.solution}</span>
          </p>
        )}
        <div className="mt-4 flex justify-center">
          <StreakDisplay current={result.streak} />
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <ShareButton result={result} dateLabel={dateLabel} attemptGrid={attemptGrid} />
          <Link
            href="/"
            onClick={onClose}
            className="rounded-full border border-[var(--color-border)] px-6 py-2.5 text-sm font-medium text-[var(--color-text)]"
          >
            Volver al inicio
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
