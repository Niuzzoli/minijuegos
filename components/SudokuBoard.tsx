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
    <div className="grid grid-cols-9 border-2 border-[var(--color-text)]">
      {board.map((value, index) => {
        const row = Math.floor(index / 9);
        const col = index % 9;
        const isGiven = givens[index] !== '0';
        const isSelected = selected === index;
        // Same-number highlight only (spec §2/§9) — no row/column/box highlight.
        const isSameValue = selectedValue !== 0 && value === selectedValue && !isSelected;

        const borderClasses = [
          col % 3 === 0 ? 'border-l-2' : 'border-l',
          col === 8 ? 'border-r-2' : '',
          row % 3 === 0 ? 'border-t-2' : 'border-t',
          row === 8 ? 'border-b-2' : '',
        ].join(' ');

        const stateClasses = isSelected
          ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] outline outline-2 outline-offset-[-2px] outline-[var(--color-accent)]'
          : isSameValue
            ? 'bg-[var(--color-present)]/30 text-[var(--color-text)]'
            : 'bg-[var(--color-surface)] text-[var(--color-text)]';

        return (
          <button
            key={index}
            type="button"
            disabled={isGiven}
            onClick={() => onSelect(index)}
            aria-label={`Fila ${row + 1}, columna ${col + 1}, ${value === 0 ? 'vacía' : `valor ${value}`}`}
            className={`flex h-8 w-8 items-center justify-center text-sm border-[var(--color-border)] sm:h-10 sm:w-10 sm:text-base ${borderClasses} ${stateClasses} ${
              isGiven ? 'font-bold' : 'font-normal'
            }`}
          >
            {value !== 0 ? value : ''}
          </button>
        );
      })}
    </div>
  );
}
