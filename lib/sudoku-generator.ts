// lib/sudoku-generator.ts
// Dev-tooling: used by scripts/generate-sudoku-puzzles.ts to build the
// committed pool, and by data/sudoku/puzzles.test.ts to re-verify it. Not
// imported by any player-facing page — Sudoku never generates boards at
// runtime (spec §4).

export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledDigits(rng: () => number): number[] {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits;
}

function canPlace(board: readonly number[], index: number, value: number): boolean {
  const row = Math.floor(index / 9);
  const col = index % 9;
  for (let i = 0; i < 9; i++) {
    if (board[row * 9 + i] === value) return false;
    if (board[i * 9 + col] === value) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[(boxRow + r) * 9 + (boxCol + c)] === value) return false;
    }
  }
  return true;
}

export function isValidSolvedBoard(board: readonly number[]): boolean {
  if (board.length !== 81) return false;

  const isPermutationOf1to9 = (cells: number[]): boolean =>
    cells.length === 9 && new Set(cells).size === 9 && cells.every((n) => n >= 1 && n <= 9);

  for (let r = 0; r < 9; r++) {
    if (!isPermutationOf1to9(Array.from({ length: 9 }, (_, c) => board[r * 9 + c]))) return false;
  }
  for (let c = 0; c < 9; c++) {
    if (!isPermutationOf1to9(Array.from({ length: 9 }, (_, r) => board[r * 9 + c]))) return false;
  }
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const box: number[] = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          box.push(board[(br * 3 + r) * 9 + (bc * 3 + c)]);
        }
      }
      if (!isPermutationOf1to9(box)) return false;
    }
  }
  return true;
}

export function generateSolvedBoard(rng: () => number): number[] {
  const board = new Array(81).fill(0);

  function fill(index: number): boolean {
    if (index === 81) return true;
    for (const digit of shuffledDigits(rng)) {
      if (canPlace(board, index, digit)) {
        board[index] = digit;
        if (fill(index + 1)) return true;
        board[index] = 0;
      }
    }
    return false;
  }

  fill(0);
  return board;
}

export function countSolutions(board: readonly number[], limit: number): number {
  const working = [...board];
  let found = 0;

  function solve(index: number): void {
    if (found >= limit) return;
    if (index === 81) {
      found += 1;
      return;
    }
    if (working[index] !== 0) {
      solve(index + 1);
      return;
    }
    for (let digit = 1; digit <= 9 && found < limit; digit++) {
      if (canPlace(working, index, digit)) {
        working[index] = digit;
        solve(index + 1);
        working[index] = 0;
      }
    }
  }

  solve(0);
  return found;
}

export function removeCellsForUniqueSolution(
  solved: readonly number[],
  targetGivens: number,
  rng: () => number,
): number[] {
  const board = [...solved];
  const order = Array.from({ length: 81 }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  let remainingGivens = 81;
  for (const index of order) {
    if (remainingGivens <= targetGivens) break;
    if (board[index] === 0) continue;

    const removed = board[index];
    board[index] = 0;
    if (countSolutions(board, 2) === 1) {
      remainingGivens -= 1;
    } else {
      // Removing this cell created a second solution — put it back and try
      // the next candidate. Not every solved board can be pruned all the
      // way down to `targetGivens` while staying unique; if no more cells
      // can be safely removed, the loop just ends with more givens than
      // requested.
      board[index] = removed;
    }
  }

  return board;
}
