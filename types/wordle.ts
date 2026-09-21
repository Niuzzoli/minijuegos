export type LetterState = 'correct' | 'present' | 'absent';

export type WordleAttempt = {
  guess: string;
  result: LetterState[];
};
