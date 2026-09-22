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

// Kept only so nothing importing the old name breaks between this task and
// Task 18, which migrates the last two consumers (StatsPanel, the stats
// page) to WordleStats/BaseGameStats directly and removes this alias.
export type UserStats = WordleStats;

export type SudokuStats = BaseGameStats;
