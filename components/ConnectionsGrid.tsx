'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export type ConnectionsGridHandle = {
  /** Move DOM focus to the cell for `item`, if it's currently rendered. */
  focusItem: (item: string) => void;
};

export const ConnectionsGrid = forwardRef<
  ConnectionsGridHandle,
  {
    items: string[];
    selected: string[];
    onToggle: (item: string) => void;
  }
>(function ConnectionsGrid({ items, selected, onToggle }, forwardedRef) {
  const cellRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  // Track the item most recently toggled (on OR off) by the user, so the
  // focus-follows-selection effect below can target it precisely. Unlike
  // SudokuBoard's single-selection grid, this is a 4-max multi-select toggle
  // grid with no "active cell" concept, so we don't use roving tabindex here
  // — every cell is a normal, independent tab stop (a <button> is a tab stop
  // by default), giving keyboard users 16 natural stops instead of 1.
  const lastToggledRef = useRef<string | null>(null);

  const handleToggle = (item: string) => {
    lastToggledRef.current = item;
    onToggle(item);
  };

  // Lets the parent move focus to a specific cell after a submit — e.g. to
  // the first remaining item once a correct guess removes the 4 selected
  // cells from the grid entirely, when there's no longer a "last toggled"
  // cell left to refocus.
  useImperativeHandle(forwardedRef, () => ({
    focusItem: (item: string) => {
      cellRefs.current[item]?.focus();
    },
  }));

  useEffect(() => {
    // Focus-follows-toggle (adapted from SudokuBoard.tsx's focus-follows-
    // selection): a toggle must move real DOM focus, not just the visual
    // highlight, so assistive tech tracks the item the user just acted on —
    // including on a deselect, where the last-toggled item is not
    // necessarily the array's last element.
    const lastToggled = lastToggledRef.current;
    if (lastToggled !== null) {
      cellRefs.current[lastToggled]?.focus();
    }
  }, [selected]);

  return (
    <div className="grid w-full grid-cols-4 gap-2">
      {items.map((item) => {
        const isSelected = selected.includes(item);

        return (
          <button
            key={item}
            type="button"
            ref={(el) => {
              cellRefs.current[item] = el;
            }}
            aria-pressed={isSelected}
            aria-label={item}
            onClick={() => handleToggle(item)}
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
});
