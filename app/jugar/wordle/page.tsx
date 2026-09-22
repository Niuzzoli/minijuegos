'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTodayKey } from '../../../hooks/useTodayKey';
import { useDailyProgress } from '../../../hooks/useDailyProgress';
import { getDailyWordlePuzzle } from '../../../lib/daily-puzzle';
import { calculateStreak } from '../../../lib/streak';
import { SOLUTIONS } from '../../../data/words/solutions';
import { evaluateGuess, mergeLetterStates, WORD_LENGTH, MAX_ATTEMPTS } from '../../../lib/wordle-engine';
import { WordleBoard } from '../../../components/WordleBoard';
import { WordleKeyboard } from '../../../components/WordleKeyboard';
import { ResultModal } from '../../../components/ResultModal';
import type { GameResult } from '../../../types/game-result';
import type { WordleAttempt } from '../../../types/wordle';

export default function WordlePage() {
  const { todayKey, today } = useTodayKey();
  const { store, hydrated, updateDay } = useDailyProgress();
  const recordAttempt = useCallback(
    (dateKey: string, attempt: WordleAttempt) => {
      updateDay(dateKey, (existing) => ({
        game: 'wordle',
        status: 'in-progress',
        attempts: [...(existing?.game === 'wordle' ? existing.attempts : []), attempt],
      }));
    },
    [updateDay],
  );

  const finishGame = useCallback(
    (dateKey: string, status: 'won' | 'lost') => {
      updateDay(dateKey, (existing) => ({
        game: 'wordle',
        status,
        attempts: existing?.game === 'wordle' ? existing.attempts : [],
        completedAt: new Date().toISOString(),
      }));
    },
    [updateDay],
  );
  const [currentGuess, setCurrentGuess] = useState('');
  const [invalidShake, setInvalidShake] = useState(false);
  const [modalDismissed, setModalDismissed] = useState(false);

  const puzzle = useMemo(() => getDailyWordlePuzzle(today, SOLUTIONS), [today]);
  const dayProgress = store[todayKey];
  const attempts = dayProgress?.game === 'wordle' ? dayProgress.attempts : [];
  const { current: streak } = calculateStreak(store, todayKey);

  const isFinished = dayProgress?.status === 'won' || dayProgress?.status === 'lost';

  useEffect(() => {
    // Reset the in-progress guess and the dismissed-modal flag when the day
    // changes (detected by useTodayKey via mount/visibilitychange/focus,
    // spec §6) — clearing local UI state in response to an external signal,
    // not a cascading re-render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentGuess('');
    setModalDismissed(false);
  }, [todayKey]);

  const handleKey = useCallback(
    (key: string) => {
      if (isFinished) return;

      if (key === 'BACKSPACE') {
        setCurrentGuess((g) => g.slice(0, -1));
        return;
      }

      if (key === 'ENTER') {
        if (currentGuess.length !== WORD_LENGTH) {
          // Not enough letters yet — shake instead of silently ignoring.
          setInvalidShake(true);
          setTimeout(() => setInvalidShake(false), 400);
          return;
        }

        // Any 5-letter combination is accepted as a guess and colored
        // against the solution — no dictionary lookup required.
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
      {result && !modalDismissed && (
        <ResultModal
          result={result}
          dateLabel={dateLabel}
          attemptGrid={attemptGrid}
          onClose={() => setModalDismissed(true)}
        />
      )}
    </div>
  );
}
