import { afterEach, describe, expect, it, vi } from 'vitest';
import { rawMatrix, rawNoPoster, rawPage } from '@/test/fixtures/tmdb';
import { parseItems, toMovie, toPaginated, toProvider } from './mappers';
import { rawMovieSchema } from './schemas';

describe('toMovie', () => {
  it('converte o formato do TMDB', () => {
    expect(toMovie(rawMatrix)).toEqual({
      id: 603,
      title: 'Matrix',
      posterPath: '/matrix.jpg',
      backdropPath: null,
      releaseYear: 1999,
      voteAverage: 8.2,
      overview: 'Um hacker descobre a verdade.',
    });
  });

  it('usa null para pôster e ano ausentes', () => {
    const movie = toMovie(rawNoPoster);
    expect(movie.posterPath).toBeNull();
    expect(movie.releaseYear).toBeNull();
  });
});

describe('toProvider', () => {
  it('prefere a prioridade do Brasil', () => {
    expect(
      toProvider({ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg', display_priority: 5, display_priorities: { BR: 1 } }),
    ).toEqual({ id: 8, name: 'Netflix', logoPath: '/n.jpg', displayPriority: 1 });
  });
});

describe('parseItems', () => {
  afterEach(() => vi.restoreAllMocks());

  it('descarta itens fora do schema e registra no log', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const movies = parseItems([rawMatrix, { id: 'x' }], rawMovieSchema, toMovie, 'teste');
    expect(movies.map((m) => m.id)).toEqual([603]);
    expect(log).toHaveBeenCalledOnce();
  });
});

describe('toPaginated', () => {
  it('limita totalPages a 500', () => {
    const page = toPaginated(rawPage([rawMatrix], { total_pages: 900 }), rawMovieSchema, toMovie, 'teste');
    expect(page.totalPages).toBe(500);
    expect(page.results).toHaveLength(1);
  });

  it('lança TmdbError se a página não tiver o formato esperado', () => {
    expect(() => toPaginated({ foo: 1 }, rawMovieSchema, toMovie, 'teste')).toThrow(
      'Resposta inesperada do TMDB em teste',
    );
  });
});
