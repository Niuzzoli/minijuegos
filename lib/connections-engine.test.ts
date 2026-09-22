import { describe, it, expect } from 'vitest';
import { evaluateGuess, colorForItem, MAX_MISTAKES } from './connections-engine';
import type { ConnectionsCategory } from '../types/connections';

const CATEGORIES: ConnectionsCategory[] = [
  { title: 'Frutas', color: 'yellow', items: ['Manzana', 'Banana', 'Pera', 'Uva'] },
  { title: 'Verduras', color: 'green', items: ['Zanahoria', 'Lechuga', 'Cebolla', 'Tomate'] },
  { title: 'Instrumentos', color: 'blue', items: ['Guitarra', 'Violín', 'Arpa', 'Bajo'] },
  {
    title: 'Empiezan con PAN',
    color: 'purple',
    items: ['Pantalla', 'Pantera', 'Pantano', 'Panqueque'],
  },
];

describe('MAX_MISTAKES', () => {
  it('is 4', () => {
    expect(MAX_MISTAKES).toBe(4);
  });
});

describe('evaluateGuess', () => {
  it('returns "correct" with the matched category for a full 4/4 match', () => {
    const result = evaluateGuess(['Manzana', 'Banana', 'Pera', 'Uva'], CATEGORIES);
    expect(result).toEqual({ kind: 'correct', category: CATEGORIES[0] });
  });

  it('returns "one-away" for exactly 3 of 4 from the same category', () => {
    const result = evaluateGuess(['Manzana', 'Banana', 'Pera', 'Zanahoria'], CATEGORIES);
    expect(result).toEqual({ kind: 'one-away' });
  });

  it('returns "wrong" for a 2-2 split across two categories', () => {
    const result = evaluateGuess(['Manzana', 'Banana', 'Zanahoria', 'Lechuga'], CATEGORIES);
    expect(result).toEqual({ kind: 'wrong' });
  });

  it('returns "wrong" for a 2-1-1 split across three categories', () => {
    const result = evaluateGuess(['Manzana', 'Banana', 'Zanahoria', 'Guitarra'], CATEGORIES);
    expect(result).toEqual({ kind: 'wrong' });
  });
});

describe('colorForItem', () => {
  it('finds the color of a known item', () => {
    expect(colorForItem('Guitarra', CATEGORIES)).toBe('blue');
  });

  it('returns null for an item not in any category', () => {
    expect(colorForItem('Inexistente', CATEGORIES)).toBeNull();
  });
});
