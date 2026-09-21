import { SOLUTIONS } from './solutions';

const EXTRA_VALID_GUESSES: readonly string[] = [
  'PLATO', 'VASOS', 'TAZAS', 'FECHA', 'HORAS', 'ENERO', 'FRASE', 'TENER',
  'HACER', 'VOLAR', 'NADAR', 'JUGAR', 'MIRAR', 'ANDAR', 'COMER', 'BEBER',
  'SOÑAR',
];

export const VALID_GUESSES: readonly string[] = [...SOLUTIONS, ...EXTRA_VALID_GUESSES];
