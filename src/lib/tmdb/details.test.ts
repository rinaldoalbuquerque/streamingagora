// @vitest-environment node
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { rawMatrixDetails, rawMatrixWatchProviders } from '@/test/fixtures/tmdb';
import { server } from '@/test/msw-server';
import { TmdbNotFoundError } from './client';
import { pickTrailerKey, toWatchProviders } from './mappers';
import { getMovieDetails, getMovieWatchProviders } from './movies';

const BASE = 'https://api.themoviedb.org/3';

describe('toWatchProviders', () => {
  it('usa só o Brasil e junta assinatura, grátis e anúncios sem duplicar', () => {
    const wp = toWatchProviders(rawMatrixWatchProviders);
    expect(wp.link).toBe('https://www.themoviedb.org/movie/603/watch?locale=BR');
    expect(wp.flatrate.map((p) => p.name)).toEqual(['Netflix', 'Plataforma Grátis']);
    expect(wp.rent.map((p) => p.name)).toEqual(['Apple TV']);
    expect(wp.buy.map((p) => p.name)).toEqual(['Apple TV']);
  });

  it('retorna listas vazias quando não há dados do Brasil', () => {
    expect(toWatchProviders({ results: { US: {} } })).toEqual({ link: null, flatrate: [], rent: [], buy: [] });
    expect(toWatchProviders(undefined)).toEqual({ link: null, flatrate: [], rent: [], buy: [] });
  });
});

describe('pickTrailerKey', () => {
  it('prefere trailer em português do YouTube', () => {
    expect(pickTrailerKey(rawMatrixDetails.videos.results)).toBe('pt-trailer');
  });
  it('cai para outro idioma e depois para null', () => {
    expect(pickTrailerKey([{ key: 'en', site: 'YouTube', type: 'Trailer', iso_639_1: 'en' }])).toBe('en');
    expect(pickTrailerKey([{ key: 'v', site: 'Vimeo', type: 'Trailer' }])).toBeNull();
  });
});

describe('getMovieDetails', () => {
  it('pede tudo em uma chamada e converte', async () => {
    let url: URL | undefined;
    server.use(
      http.get(`${BASE}/movie/603`, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json(rawMatrixDetails);
      }),
    );

    const movie = await getMovieDetails(603);

    expect(url!.searchParams.get('append_to_response')).toBe('credits,videos,watch/providers');
    expect(url!.searchParams.get('include_video_language')).toBe('pt,en');
    expect(movie).toMatchObject({
      id: 603,
      title: 'Matrix',
      runtime: 136,
      tagline: 'Bem-vindo ao mundo real.',
      trailerKey: 'pt-trailer',
      genres: [{ id: 28, name: 'Ação' }, { id: 878, name: 'Ficção científica' }],
    });
    expect(movie.cast).toHaveLength(12);
    expect(movie.cast[0]).toEqual({ id: 1, name: 'Ator 1', character: 'Personagem 1', profilePath: null });
    expect(movie.watchProviders.flatrate[0].name).toBe('Netflix');
  });

  it('lança TmdbNotFoundError para filme inexistente', async () => {
    server.use(http.get(`${BASE}/movie/999999`, () => new HttpResponse(null, { status: 404 })));
    await expect(getMovieDetails(999999)).rejects.toBeInstanceOf(TmdbNotFoundError);
  });
});

describe('getMovieWatchProviders', () => {
  it('retorna a disponibilidade no Brasil', async () => {
    server.use(http.get(`${BASE}/movie/603/watch/providers`, () => HttpResponse.json(rawMatrixWatchProviders)));
    const wp = await getMovieWatchProviders(603);
    expect(wp.flatrate.map((p) => p.id)).toEqual([8, 999]);
  });
});
