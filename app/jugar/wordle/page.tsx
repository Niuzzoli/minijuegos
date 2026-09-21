'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTodayKey } from '../../../hooks/useTodayKey';
import { useDailyProgress } from '../../../hooks/useDailyProgress';
import { getDailyPuzzle } from '../../../lib/daily-puzzle';
import { calculateStreak } from '../../../lib/streak';
import { SOLUTIONS } from '../../../data/words/solutions';
import { VALID_GUESSES } from '../../../data/words/valid-guesses';
import {
  evaluateGuess,
  isWordValid,
  mergeLetterStates,
  WORD_LENGTH,
  MAX_ATTEMPTS,
} from '../../../lib/wordle-engine';
import { WordleBoard } from '../../../components/WordleBoard';
import { WordleKeyboard } from '../../../components/WordleKeyboard';
import { ResultModal } from '../../../components/ResultModal';
import type { GameResult } from '../../../types/game-result';

export default function WordlePage() {
  const { todayKey, today } = useTodayKey();
  const { store, hydrated, recordAttempt, finishGame } = useDailyProgress();
  const [currentGuess, setCurrentGuess] = useState('');
  const [invalidShake, setInvalidShake] = useState(false);

  const puzzle = useMemo(() => getDailyPuzzle(today, SOLUTIONS), [today]);
  const dayProgress = store[todayKey];
  const attempts = dayProgress?.attempts ?? [];
  const { current: streak } = calculateStreak(store, todayKey);

  const isFinished = dayProgress?.status === 'won' || dayProgress?.status === 'lost';

  useEffect(() => {
    // Reset the in-progress guess when the day changes (detected by
    // useTodayKey via mount/visibilitychange/focus, spec §6) — clearing
    // local UI state in response to an external signal, not a cascading
    // re-render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentGuess('');
  }, [todayKey]);

  const handleKey = useCallback(
    (key: string) => {
      if (isFinished) return;

      if (key === 'BACKSPACE') {
        setCurrentGuess((g) => g.slice(0, -1));
        return;
      }

      if (key === 'ENTER') {
        if (currentGuess.length !== WORD_LENGTH) return;
        if (!isWordValid(currentGuess, VALID_GUESSES)) {
          setInvalidShake(true);
          setTimeout(() => setInvalidShake(false), 400);
          return;
        }

        const result = evaluateGuess(currentGuess, puzzle.solution);
        recordAttempt(todayKey, { guess: currentGuess.toUpperCase(), result });
        setCurrentGuess('');

        const won = currentGuess.toUpperCase() === puzzle.solution;
        const attemptsUsed = attempts.length + 1;
        if (won || attemptsUsed >= MAX_ATTEMPTS) {
          finishGame(todayKey, won ? 'won' : 'lost');
        }
        return;
      }

      if (currentGuess.length < WORD_LENGTH) {
        setCurrentGuess((g) => g + key);
      }
    },
    [isFinished, currentGuess, puzzle.solution, attempts.length, recordAttempt, finishGame, todayKey],
  );

  const letterStates = mergeLetterStates(attempts);

  const result: GameResult | null = isFinished
    ? {
        status: dayProgress!.status as 'won' | 'lost',
        attempts: attempts.length,
        solution: dayProgress!.status === 'lost' ? puzzle.solution : undefined,
        streak,
      }
    : null;

  const attemptGrid = attempts.map((a) => a.result);
  const dateLabel = new Date(today).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

  if (!hydrated) return null;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-8 px-4 py-8">
      <div className={invalidShake ? 'animate-[shake_0.4s]' : ''}>
        <WordleBoard attempts={attempts} currentGuess={currentGuess} maxAttempts={MAX_ATTEMPTS} />
      </div>
      <WordleKeyboard onKey={handleKey} letterStates={letterStates} />
      {result && (
        <ResultModal result={result} dateLabel={dateLabel} attemptGrid={attemptGrid} onClose={() => {}} />
      )}
    </div>
  );
}
