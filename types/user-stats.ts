export type BaseGameStats = {
  played: number;
  won: number;
  winPercentage: number;
  currentStreak: number;
  bestStreak: number;
};

export type WordleStats = BaseGameStats & {
  attemptsDistribution: Record<1 | 2 | 3 | 4 | 5 | 6, number>;
};

export type SudokuStats = BaseGameStats;

export type ConnectionsStats = BaseGameStats;
