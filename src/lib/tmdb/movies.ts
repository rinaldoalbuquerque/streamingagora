import 'server-only';
import type { SortOption } from '@/lib/filters/catalog-filters';
import { REVALIDATE, tmdbFetch } from './client';
import { parseOrThrow, toMovie, toMovieDetails, toPaginated, toWatchProviders } from './mappers';
import { rawMovieDetailsSchema, rawMovieSchema, rawWatchProvidersSchema } from './schemas';
import type { Movie, MovieDetails, Paginated, WatchProviders } from './types';

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

export async function getMovieDetails(id: number): Promise<MovieDetails> {
  const raw = await tmdbFetch(`/movie/${id}`, {
    revalidate: REVALIDATE.details,
    params: {
      append_to_response: 'credits,videos,watch/providers',
      include_video_language: 'pt,en',
    },
  });
  return toMovieDetails(parseOrThrow(rawMovieDetailsSchema, raw, `movie/${id}`));
}

export async function getMovieWatchProviders(id: number): Promise<WatchProviders> {
  const raw = await tmdbFetch(`/movie/${id}/watch/providers`, { revalidate: REVALIDATE.details });
  return toWatchProviders(parseOrThrow(rawWatchProvidersSchema, raw, `movie/${id}/watch/providers`));
}
