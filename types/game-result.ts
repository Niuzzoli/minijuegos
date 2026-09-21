export type GameResult = {
  status: 'won' | 'lost';
  attempts: number;
  solution?: string; // present only when status === 'lost'
  streak: number;
};
