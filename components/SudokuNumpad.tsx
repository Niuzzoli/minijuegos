'use client';

import { useEffect } from 'react';
import { Delete } from 'lucide-react';

export function SudokuNumpad({
  onInput,
  onErase,
}: {
  onInput: (n: number) => void;
  onErase: () => void;
}) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Ignore OS/browser shortcuts (Ctrl+F, Cmd+…, etc.) — see WordleKeyboard.tsx
      // for the bug this guard prevents.
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === 'Backspace' || event.key === 'Delete') {
        onErase();
        return;
      }
      if (/^[1-9]$/.test(event.key)) {
        onInput(Number(event.key));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onInput, onErase]);

  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onInput(n)}
          aria-label={`Ingresar ${n}`}
          className="flex h-11 w-9 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-semibold text-[var(--color-text)] sm:h-12 sm:w-10 sm:text-base"
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        onClick={onErase}
        aria-label="Borrar"
        className="flex h-11 w-9 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] sm:h-12 sm:w-10"
      >
        <Delete size={16} />
      </button>
    </div>
  );
}
