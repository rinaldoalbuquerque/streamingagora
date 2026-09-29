// @vitest-environment node
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/msw-server';
import { TmdbError, TmdbNotFoundError, tmdbFetch } from './client';

const GENRES_URL = 'https://api.themoviedb.org/3/genre/movie/list';

describe('tmdbFetch', () => {
  it('envia o token, o idioma pt-BR e os parâmetros definidos', async () => {
    let captured: Request | undefined;
    server.use(
      http.get(GENRES_URL, ({ request }) => {
        captured = request;
        return HttpResponse.json({ ok: true });
      }),
    );

    await expect(
      tmdbFetch('/genre/movie/list', {
        revalidate: 60,
        params: { page: 2, genre: null, year: undefined, empty: '' },
      }),
    ).resolves.toEqual({ ok: true });

    const url = new URL(captured!.url);
    expect(captured!.headers.get('authorization')).toBe('Bearer test-token');
    expect(url.searchParams.get('language')).toBe('pt-BR');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.has('genre')).toBe(false);
    expect(url.searchParams.has('year')).toBe(false);
    expect(url.searchParams.has('empty')).toBe(false);
  });

  it('lança TmdbNotFoundError em 404', async () => {
    server.use(http.get(GENRES_URL, () => new HttpResponse(null, { status: 404 })));
    await expect(tmdbFetch('/genre/movie/list', { revalidate: 60 })).rejects.toBeInstanceOf(
      TmdbNotFoundError,
    );
  });

  it('lança TmdbError com o status em erros HTTP', async () => {
    server.use(http.get(GENRES_URL, () => new HttpResponse(null, { status: 500 })));
    await expect(tmdbFetch('/genre/movie/list', { revalidate: 60 })).rejects.toMatchObject({
      name: 'TmdbError',
      status: 500,
    });
  });

  it('tenta de novo uma vez após 429', async () => {
    let calls = 0;
    server.use(
      http.get(GENRES_URL, () => {
        calls += 1;
        return calls === 1
          ? new HttpResponse(null, { status: 429, headers: { 'Retry-After': '0' } })
          : HttpResponse.json({ ok: true });
      }),
    );
    await expect(tmdbFetch('/genre/movie/list', { revalidate: 60 })).resolves.toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it('desiste após o segundo 429', async () => {
    let calls = 0;
    server.use(
      http.get(GENRES_URL, () => {
        calls += 1;
        return new HttpResponse(null, { status: 429, headers: { 'Retry-After': '0' } });
      }),
    );
    await expect(tmdbFetch('/genre/movie/list', { revalidate: 60 })).rejects.toMatchObject({
      status: 429,
    });
    expect(calls).toBe(2);
  });

  it('converte falha de rede em TmdbError', async () => {
    server.use(http.get(GENRES_URL, () => HttpResponse.error()));
    await expect(tmdbFetch('/genre/movie/list', { revalidate: 60 })).rejects.toBeInstanceOf(
      TmdbError,
    );
  });
});
