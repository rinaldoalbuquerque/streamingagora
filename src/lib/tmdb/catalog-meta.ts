import 'server-only';
import { REVALIDATE, tmdbFetch } from './client';
import { parseItems, parseOrThrow, sortByPriority, toProvider } from './mappers';
import { rawGenresSchema, rawProviderSchema, rawProvidersListSchema } from './schemas';
import type { Genre, Provider } from './types';

export const DEFAULT_PROVIDER_COUNT = 15;

export async function getGenres(): Promise<Genre[]> {
  const raw = await tmdbFetch('/genre/movie/list', { revalidate: REVALIDATE.meta });
  return parseOrThrow(rawGenresSchema, raw, 'genre/movie/list').genres;
}

export async function getBrProviders(): Promise<Provider[]> {
  const raw = await tmdbFetch('/watch/providers/movie', {
    revalidate: REVALIDATE.meta,
    params: { watch_region: 'BR' },
  });
  const list = parseOrThrow(rawProvidersListSchema, raw, 'watch/providers/movie');
  return sortByPriority(parseItems(list.results, rawProviderSchema, toProvider, 'watch/providers/movie'));
}

export async function getDefaultProviders(): Promise<Provider[]> {
  return (await getBrProviders()).slice(0, DEFAULT_PROVIDER_COUNT);
}
