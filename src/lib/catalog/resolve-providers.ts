import type { ProviderSelection } from '@/lib/filters/catalog-filters';
import type { Movie } from '@/lib/tmdb/types';

export type ProviderSource = 'url' | 'user' | 'default';

export function resolveProviderIds(
  selection: ProviderSelection,
  userProviderIds: number[] | null,
  defaultProviderIds: number[],
): { ids: number[]; source: ProviderSource } {
  if (Array.isArray(selection)) return { ids: selection, source: 'url' };
  if (selection === null && userProviderIds && userProviderIds.length > 0) {
    return { ids: userProviderIds, source: 'user' };
  }
  return { ids: defaultProviderIds, source: 'default' };
}

export function removeWatched(movies: Movie[], watchedIds: ReadonlySet<number>): Movie[] {
  return movies.filter((movie) => !watchedIds.has(movie.id));
}
