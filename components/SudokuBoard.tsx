import type { SudokuBoard as SudokuBoardType } from '../types/sudoku';

export function SudokuBoard({
  givens,
  board,
  selected,
  onSelect,
}: {
  givens: string;
  board: SudokuBoardType;
  selected: number | null;
  onSelect: (index: number) => void;
}) {
  const selectedValue = selected !== null ? board[selected] : 0;

  return (
    <div className="grid grid-cols-9 border-[3px] border-[var(--color-text)]">
      {board.map((value, index) => {
        const row = Math.floor(index / 9);
        const col = index % 9;
        const isGiven = givens[index] !== '0';
        const isSelected = selected === index;
        // Same-number highlight only (spec §2/§9) — no row/column/box highlight.
        const isSameValue = selectedValue !== 0 && value === selectedValue && !isSelected;

        // 3x3 box boundaries get a thicker, higher-contrast border than the
        // plain cell separators, so the boxes actually read as blocks.
        const borderClasses = [
          col % 3 === 0 ? 'border-l-[3px] border-l-[var(--color-text)]' : 'border-l border-l-[var(--color-border)]',
          col === 8 ? 'border-r-[3px] border-r-[var(--color-text)]' : '',
          row % 3 === 0 ? 'border-t-[3px] border-t-[var(--color-text)]' : 'border-t border-t-[var(--color-border)]',
          row === 8 ? 'border-b-[3px] border-b-[var(--color-text)]' : '',
        ].join(' ');

        const backgroundClasses = isSelected
          ? 'bg-[var(--color-accent)] outline outline-2 outline-offset-[-2px] outline-[var(--color-accent)]'
          : isSameValue
            ? 'bg-[var(--color-present)]/30'
            : 'bg-[var(--color-surface)]';

        // Givens vs. user-entered digits get both a color and a weight
        // difference (not just weight) so they're distinguishable at a
        // glance, not only on close inspection.
        const valueClasses = isSelected
          ? 'text-[var(--color-accent-contrast)] font-bold'
          : isGiven
            ? 'text-[var(--color-text)] font-bold'
            : 'text-[var(--color-accent)] font-semibold';

        return (
          <button
            key={index}
            type="button"
            disabled={isGiven}
            onClick={() => onSelect(index)}
            aria-label={`Fila ${row + 1}, columna ${col + 1}, ${value === 0 ? 'vacía' : `valor ${value}`}`}
            className={`flex h-8 w-8 items-center justify-center text-sm sm:h-10 sm:w-10 sm:text-base ${borderClasses} ${backgroundClasses} ${valueClasses}`}
          >
            {value !== 0 ? value : ''}
          </button>
        );
      })}
    </div>
  );
}
