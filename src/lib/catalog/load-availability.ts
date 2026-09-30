import type { Provider, WatchProviders } from '@/lib/tmdb/types';

export type Availability = { status: 'ok'; providers: Provider[] } | { status: 'error' };

/** Busca a disponibilidade de vários filmes em paralelo; falhas viram { status: 'error' }. */
export async function loadAvailability(
  ids: number[],
  fetcher: (id: number) => Promise<WatchProviders>,
): Promise<Map<number, Availability>> {
  const results = await Promise.allSettled(ids.map((id) => fetcher(id)));
  return new Map(
    ids.map((id, i): [number, Availability] => {
      const result = results[i];
      return [id, result.status === 'fulfilled' ? { status: 'ok', providers: result.value.flatrate } : { status: 'error' }];
    }),
  );
}
