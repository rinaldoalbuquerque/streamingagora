// @vitest-environment node
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { rawProvidersList } from '@/test/fixtures/tmdb';
import { server } from '@/test/msw-server';
import { getBrProviders, getDefaultProviders, getGenres } from './catalog-meta';

const BASE = 'https://api.themoviedb.org/3';

describe('getGenres', () => {
  it('retorna a lista de gêneros', async () => {
    server.use(
      http.get(`${BASE}/genre/movie/list`, () =>
        HttpResponse.json({ genres: [{ id: 28, name: 'Ação' }] }),
      ),
    );
    await expect(getGenres()).resolves.toEqual([{ id: 28, name: 'Ação' }]);
  });
});

describe('provedores', () => {
  it('pede os provedores do BR e ordena pela prioridade do Brasil', async () => {
    let url: URL | undefined;
    server.use(
      http.get(`${BASE}/watch/providers/movie`, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json(rawProvidersList);
      }),
    );
    const providers = await getBrProviders();
    expect(url!.searchParams.get('watch_region')).toBe('BR');
    expect(providers.map((p) => p.name)).toEqual(['Netflix', 'Amazon Prime Video', 'Disney Plus']);
  });

  it('getDefaultProviders devolve no máximo 15', async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      provider_id: i + 1,
      provider_name: `P${i + 1}`,
      logo_path: null,
      display_priority: i,
    }));
    server.use(http.get(`${BASE}/watch/providers/movie`, () => HttpResponse.json({ results: many })));
    const providers = await getDefaultProviders();
    expect(providers).toHaveLength(15);
    expect(providers[0].id).toBe(1);
  });
});
