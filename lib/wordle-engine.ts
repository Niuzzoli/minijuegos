import type { LetterState, WordleAttempt } from '../types/wordle';

export const WORD_LENGTH = 5;
export const MAX_ATTEMPTS = 6;

export function evaluateGuess(guess: string, solution: string): LetterState[] {
  const guessLetters = guess.toUpperCase().split('');
  const solutionLetters = solution.toUpperCase().split('');
  const result: LetterState[] = new Array(WORD_LENGTH).fill('absent');
  const remaining: Record<string, number> = {};

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessLetters[i] === solutionLetters[i]) {
      result[i] = 'correct';
    } else {
      const letter = solutionLetters[i];
      remaining[letter] = (remaining[letter] ?? 0) + 1;
    }
  }

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === 'correct') continue;
    const letter = guessLetters[i];
    if ((remaining[letter] ?? 0) > 0) {
      result[i] = 'present';
      remaining[letter] -= 1;
    }
  }

  return result;
}

export function isWordValid(word: string, validGuesses: readonly string[]): boolean {
  return validGuesses.includes(word.toUpperCase());
}

const STATE_PRIORITY: Record<LetterState, number> = { absent: 0, present: 1, correct: 2 };

export function mergeLetterStates(attempts: WordleAttempt[]): Record<string, LetterState> {
  const merged: Record<string, LetterState> = {};
  for (const attempt of attempts) {
    const letters = attempt.guess.toUpperCase().split('');
    letters.forEach((letter, i) => {
      const state = attempt.result[i];
      const existing = merged[letter];
      if (!existing || STATE_PRIORITY[state] > STATE_PRIORITY[existing]) {
        merged[letter] = state;
      }
    });
  }
  return merged;
}
