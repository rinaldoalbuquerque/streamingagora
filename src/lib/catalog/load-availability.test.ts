import { describe, expect, it } from 'vitest';
import { loadAvailability } from './load-availability';

const netflix = { id: 8, name: 'Netflix', logoPath: null, displayPriority: 1 };

describe('loadAvailability', () => {
  it('uma falha não derruba os outros filmes', async () => {
    const fetcher = async (id: number) => {
      if (id === 2) throw new Error('TMDB fora do ar');
      return { link: null, flatrate: id === 1 ? [netflix] : [], rent: [], buy: [] };
    };
    const result = await loadAvailability([1, 2, 3], fetcher);
    expect(result.get(1)).toEqual({ status: 'ok', providers: [netflix] });
    expect(result.get(2)).toEqual({ status: 'error' });
    expect(result.get(3)).toEqual({ status: 'ok', providers: [] });
  });

  it('lista vazia não chama o fetcher', async () => {
    const result = await loadAvailability([], async () => {
      throw new Error('não deveria chamar');
    });
    expect(result.size).toBe(0);
  });
});
