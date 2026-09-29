import { describe, expect, it } from 'vitest';
import { removeWatched, resolveProviderIds } from './resolve-providers';

const DEFAULTS = [8, 119, 337];

describe('resolveProviderIds', () => {
  it('usa os ids da URL quando existem', () => {
    expect(resolveProviderIds([8], [119], DEFAULTS)).toEqual({ ids: [8], source: 'url' });
  });
  it('usa os streamings do usuário quando a URL não diz nada', () => {
    expect(resolveProviderIds(null, [119], DEFAULTS)).toEqual({ ids: [119], source: 'user' });
  });
  it('usa o padrão quando o usuário não tem streamings salvos', () => {
    expect(resolveProviderIds(null, [], DEFAULTS)).toEqual({ ids: DEFAULTS, source: 'default' });
    expect(resolveProviderIds(null, null, DEFAULTS)).toEqual({ ids: DEFAULTS, source: 'default' });
  });
  it('providers=all ignora as preferências do usuário', () => {
    expect(resolveProviderIds('all', [119], DEFAULTS)).toEqual({ ids: DEFAULTS, source: 'default' });
  });
});

describe('removeWatched', () => {
  it('remove os filmes assistidos', () => {
    const movies = [1, 2, 3].map((id) => ({ id, title: `F${id}`, posterPath: null, releaseYear: null, voteAverage: 0, overview: '' }));
    expect(removeWatched(movies, new Set([2])).map((m) => m.id)).toEqual([1, 3]);
  });
});
