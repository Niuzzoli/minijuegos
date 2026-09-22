import type { ConnectionsCategory, ConnectionsColor } from '../types/connections';

export const MAX_MISTAKES = 4;

export type GuessResult =
  | { kind: 'correct'; category: ConnectionsCategory }
  | { kind: 'one-away' }
  | { kind: 'wrong' };

export function evaluateGuess(
  selectedItems: readonly string[],
  categories: readonly ConnectionsCategory[],
): GuessResult {
  let bestMatchCount = 0;
  let bestMatchCategory: ConnectionsCategory | null = null;

  for (const category of categories) {
    const matchCount = selectedItems.filter((item) => category.items.includes(item)).length;
    if (matchCount > bestMatchCount) {
      bestMatchCount = matchCount;
      bestMatchCategory = category;
    }
  }

  if (bestMatchCount === 4 && bestMatchCategory) {
    return { kind: 'correct', category: bestMatchCategory };
  }
  if (bestMatchCount === 3) {
    return { kind: 'one-away' };
  }
  return { kind: 'wrong' };
}

export function colorForItem(
  item: string,
  categories: readonly ConnectionsCategory[],
): ConnectionsColor | null {
  const found = categories.find((category) => category.items.includes(item));
  return found ? found.color : null;
}
