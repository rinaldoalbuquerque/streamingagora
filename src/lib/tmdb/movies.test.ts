// @vitest-environment node
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { rawMatrix, rawPage } from '@/test/fixtures/tmdb';
import { server } from '@/test/msw-server';
import { discoverMovies, searchMovies } from './movies';

const BASE = 'https://api.themoviedb.org/3';

describe('discoverMovies', () => {
  it('monta os parâmetros do discover e converte o resultado', async () => {
    let url: URL | undefined;
    server.use(
      http.get(`${BASE}/discover/movie`, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json(rawPage([rawMatrix], { total_pages: 900 }));
      }),
    );

    const result = await discoverMovies({
      providerIds: [8, 119],
      genre: 28,
      year: null,
      minRating: 7,
      sort: 'vote_average.desc',
      page: 2,
    });

    const p = url!.searchParams;
    expect(p.get('watch_region')).toBe('BR');
    expect(p.get('with_watch_providers')).toBe('8|119');
    expect(p.get('with_watch_monetization_types')).toBe('flatrate|free|ads');
    expect(p.get('with_genres')).toBe('28');
    expect(p.has('primary_release_year')).toBe(false);
    expect(p.get('vote_average.gte')).toBe('7');
    expect(p.get('vote_count.gte')).toBe('50');
    expect(p.get('sort_by')).toBe('vote_average.desc');
    expect(p.get('page')).toBe('2');
    expect(p.get('language')).toBe('pt-BR');
    expect(result.totalPages).toBe(500);
    expect(result.results[0]).toMatchObject({ id: 603, title: 'Matrix', releaseYear: 1999 });
  });
});

describe('searchMovies', () => {
  it('envia o texto com acentos e & intactos', async () => {
    let url: URL | undefined;
    server.use(
      http.get(`${BASE}/search/movie`, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json(rawPage([rawMatrix]));
      }),
    );

    const result = await searchMovies('Amor & Morte à Tarde', 3);

    expect(url!.searchParams.get('query')).toBe('Amor & Morte à Tarde');
    expect(url!.searchParams.get('page')).toBe('3');
    expect(url!.searchParams.get('region')).toBe('BR');
    expect(result.results).toHaveLength(1);
  });
});
