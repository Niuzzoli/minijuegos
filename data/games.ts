export type GameId = 'wordle' | 'sudoku' | 'connections' | 'memory';

export type GameMeta = {
  id: GameId;
  name: string;
  description: string;
  available: boolean;
};

export const GAMES: GameMeta[] = [
  { id: 'wordle', name: 'Wordle', description: 'Descubrí la palabra en 6 intentos.', available: true },
  { id: 'sudoku', name: 'Sudoku', description: 'Próximamente.', available: false },
  { id: 'connections', name: 'Connections', description: 'Próximamente.', available: false },
  { id: 'memory', name: 'Memory', description: 'Próximamente.', available: false },
];
