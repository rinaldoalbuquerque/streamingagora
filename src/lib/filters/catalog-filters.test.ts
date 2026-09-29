import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTERS,
  catalogHref,
  parseCatalogFilters,
  parsePageParam,
  serializeCatalogFilters,
} from './catalog-filters';

const NOW = new Date('2026-09-29T12:00:00Z');

describe('parseCatalogFilters', () => {
  it('retorna os padrões para URL vazia', () => {
    expect(parseCatalogFilters({}, NOW)).toEqual(DEFAULT_FILTERS);
  });

  it('lê todos os filtros válidos', () => {
    expect(
      parseCatalogFilters(
        {
          providers: '119,8',
          genre: '28',
          year: '2024',
          minRating: '7',
          sort: 'vote_average.desc',
          hideWatched: '1',
          page: '3',
        },
        NOW,
      ),
    ).toEqual({
      providers: [8, 119],
      genre: 28,
      year: 2024,
      minRating: 7,
      sort: 'vote_average.desc',
      hideWatched: true,
      page: 3,
    });
  });

  it('entende providers=all', () => {
    expect(parseCatalogFilters({ providers: 'all' }, NOW).providers).toBe('all');
  });

  it('descarta ids de provedor inválidos e duplicados', () => {
    expect(parseCatalogFilters({ providers: '8,abc,8,-3,,119' }, NOW).providers).toEqual([8, 119]);
    expect(parseCatalogFilters({ providers: 'abc' }, NOW).providers).toBeNull();
  });

  it('descarta valores inválidos', () => {
    const f = parseCatalogFilters(
      { genre: 'x', year: '1800', minRating: '11', sort: 'hack', hideWatched: 'true' },
      NOW,
    );
    expect(f.genre).toBeNull();
    expect(f.year).toBeNull();
    expect(f.minRating).toBeNull();
    expect(f.sort).toBe('popularity.desc');
    expect(f.hideWatched).toBe(false);
  });

  it('aceita até o ano que vem e recusa depois', () => {
    expect(parseCatalogFilters({ year: '2027' }, NOW).year).toBe(2027);
    expect(parseCatalogFilters({ year: '2028' }, NOW).year).toBeNull();
  });

  it('usa o primeiro valor quando o parâmetro se repete', () => {
    expect(parseCatalogFilters({ genre: ['12', '28'] }, NOW).genre).toBe(12);
  });
});

describe('parsePageParam', () => {
  it('limita a página entre 1 e 500', () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam('0')).toBe(1);
    expect(parsePageParam('abc')).toBe(1);
    expect(parsePageParam('2.5')).toBe(1);
    expect(parsePageParam('42')).toBe(42);
    expect(parsePageParam('9999')).toBe(500);
  });
});

describe('serializeCatalogFilters', () => {
  it('omite valores padrão', () => {
    expect(serializeCatalogFilters(DEFAULT_FILTERS)).toBe('');
    expect(catalogHref(DEFAULT_FILTERS)).toBe('/');
  });

  it('serializa todos os campos e faz ida e volta', () => {
    const filters = {
      providers: [8, 119],
      genre: 28,
      year: 2024,
      minRating: 7,
      sort: 'primary_release_date.desc' as const,
      hideWatched: true,
      page: 2,
    };
    const qs = serializeCatalogFilters(filters);
    expect(qs).toBe(
      'providers=8%2C119&genre=28&year=2024&minRating=7&sort=primary_release_date.desc&hideWatched=1&page=2',
    );
    expect(parseCatalogFilters(Object.fromEntries(new URLSearchParams(qs)), NOW)).toEqual(filters);
  });

  it('serializa providers=all', () => {
    expect(catalogHref({ ...DEFAULT_FILTERS, providers: 'all' })).toBe('/?providers=all');
  });
});
