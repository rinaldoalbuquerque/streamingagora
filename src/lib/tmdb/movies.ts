import 'server-only';
import type { SortOption } from '@/lib/filters/catalog-filters';
import { REVALIDATE, tmdbFetch } from './client';
import { toMovie, toPaginated } from './mappers';
import { rawMovieSchema } from './schemas';
import type { Movie, Paginated } from './types';

export const MONETIZATION_TYPES = 'flatrate|free|ads';
export const MIN_VOTE_COUNT = 50;

export interface DiscoverInput {
  providerIds: number[];
  genre: number | null;
  year: number | null;
  minRating: number | null;
  sort: SortOption;
  page: number;
}

export async function discoverMovies(input: DiscoverInput): Promise<Paginated<Movie>> {
  const raw = await tmdbFetch('/discover/movie', {
    revalidate: REVALIDATE.list,
    params: {
      watch_region: 'BR',
      with_watch_providers: input.providerIds.join('|'),
      with_watch_monetization_types: MONETIZATION_TYPES,
      with_genres: input.genre,
      primary_release_year: input.year,
      'vote_average.gte': input.minRating,
      'vote_count.gte': MIN_VOTE_COUNT,
      sort_by: input.sort,
      include_adult: 'false',
      page: input.page,
    },
  });
  return toPaginated(raw, rawMovieSchema, toMovie, 'discover/movie');
}

export async function searchMovies(query: string, page: number): Promise<Paginated<Movie>> {
  const raw = await tmdbFetch('/search/movie', {
    revalidate: REVALIDATE.search,
    params: { query, region: 'BR', include_adult: 'false', page },
  });
  return toPaginated(raw, rawMovieSchema, toMovie, 'search/movie');
}
