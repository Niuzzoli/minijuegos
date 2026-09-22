export type GameId = 'wordle' | 'sudoku' | 'connections' | 'memory';

export type GameMeta = {
  id: GameId;
  name: string;
  description: string;
  available: boolean;
  /** Play route — only set for available games; the single source of truth
   * for "where does this game live", instead of each consumer hardcoding it. */
  route?: string;
};

export const GAMES: GameMeta[] = [
  {
    id: 'wordle',
    name: 'Wordle',
    description: 'Descubrí la palabra en 6 intentos.',
    available: true,
    route: '/jugar/wordle',
  },
  {
    id: 'sudoku',
    name: 'Sudoku',
    description: 'Completá la grilla del 1 al 9.',
    available: true,
    route: '/jugar/sudoku',
  },
  {
    id: 'connections',
    name: 'Connections',
    description: 'Agrupá las 16 palabras en 4 categorías.',
    available: true,
    route: '/jugar/connections',
  },
  { id: 'memory', name: 'Memory', description: 'Próximamente.', available: false },
];
