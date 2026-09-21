export type UserStats = {
  played: number;
  won: number;
  winPercentage: number;
  currentStreak: number;
  bestStreak: number;
  attemptsDistribution: Record<1 | 2 | 3 | 4 | 5 | 6, number>;
};
