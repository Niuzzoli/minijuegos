// Row-major, length 81 (index = row * 9 + col). 0 = empty cell, 1-9 = a
// filled digit (either an original given or a user entry).
export type SudokuBoard = number[];
