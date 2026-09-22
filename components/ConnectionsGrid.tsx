'use client';

import { useEffect, useRef } from 'react';

export function ConnectionsGrid({
  items,
  selected,
  onToggle,
}: {
  items: string[];
  selected: string[];
  onToggle: (item: string) => void;
}) {
  const cellRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  // Roving tabindex: exactly one cell is a tab stop at a time — the most
  // recently selected item if any, otherwise the first grid item — so Tab
  // enters/exits the grid as a single control (same pattern as SudokuBoard).
  const tabStopItem = selected[selected.length - 1] ?? items[0];

  useEffect(() => {
    // Focus-follows-selection (same pattern as SudokuBoard.tsx): a toggle
    // must move real DOM focus, not just the visual highlight, so assistive
    // tech tracks the active cell.
    const lastSelected = selected[selected.length - 1];
    if (lastSelected !== undefined) {
      cellRefs.current[lastSelected]?.focus();
    }
  }, [selected]);

  return (
    <div className="grid w-full grid-cols-4 gap-2">
      {items.map((item) => {
        const isSelected = selected.includes(item);
        const isTabStop = item === tabStopItem;

        return (
          <button
            key={item}
            type="button"
            ref={(el) => {
              cellRefs.current[item] = el;
            }}
            aria-current={isSelected ? 'true' : undefined}
            aria-label={`${item}${isSelected ? ', seleccionada' : ''}`}
            tabIndex={isTabStop ? 0 : -1}
            onClick={() => onToggle(item)}
            className={`flex h-16 items-center justify-center rounded-lg border-2 p-2 text-center text-[11px] font-semibold uppercase leading-tight sm:h-20 sm:text-xs ${
              isSelected
                ? 'border-[var(--color-text)] bg-[var(--color-accent)] text-[var(--color-accent-contrast)] outline outline-2 outline-offset-2 outline-[var(--color-text)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
            }`}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
