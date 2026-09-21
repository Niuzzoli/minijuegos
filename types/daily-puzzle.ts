export type DailyPuzzle = {
  id: string;
  date: string; // YYYY-MM-DD
  game: 'wordle';
  solution: string;
};
// Future variants (e.g. { game: 'sudoku'; data: SudokuPuzzleData }) join this
// union without touching date/persistence logic — see spec §16.
