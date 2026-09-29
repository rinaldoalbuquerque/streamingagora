export const SORT_OPTIONS = [
  'popularity.desc',
  'vote_average.desc',
  'primary_release_date.desc',
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const MAX_PAGE = 500;
export const MIN_YEAR = 1900;

/** null = não especificado; 'all' = todos explicitamente; number[] = ids escolhidos. */
export type ProviderSelection = number[] | 'all' | null;

export interface CatalogFilters {
  providers: ProviderSelection;
  genre: number | null;
  year: number | null;
  minRating: number | null;
  sort: SortOption;
  hideWatched: boolean;
  page: number;
}

export const DEFAULT_FILTERS: CatalogFilters = {
  providers: null,
  genre: null,
  year: null,
  minRating: null,
  sort: 'popularity.desc',
  hideWatched: false,
  page: 1,
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function parseProviders(value: string | undefined): ProviderSelection {
  if (value === undefined) return null;
  if (value === 'all') return 'all';
  const ids = new Set<number>();
  for (const part of value.split(',')) {
    const id = parsePositiveInt(part.trim());
    if (id !== null) ids.add(id);
  }
  return ids.size > 0 ? [...ids].sort((a, b) => a - b) : null;
}

function parseYear(value: string | undefined, now: Date): number | null {
  const year = parsePositiveInt(value);
  return year !== null && year >= MIN_YEAR && year <= now.getFullYear() + 1 ? year : null;
}

function parseMinRating(value: string | undefined): number | null {
  const rating = parsePositiveInt(value);
  return rating !== null && rating <= 9 ? rating : null;
}

function parseSort(value: string | undefined): SortOption {
  return (SORT_OPTIONS as readonly string[]).includes(value ?? '')
    ? (value as SortOption)
    : DEFAULT_FILTERS.sort;
}

export function parsePageParam(value: string | string[] | undefined): number {
  const page = parsePositiveInt(first(value));
  return page === null ? 1 : Math.min(page, MAX_PAGE);
}

export function parseCatalogFilters(params: RawSearchParams, now: Date = new Date()): CatalogFilters {
  return {
    providers: parseProviders(first(params.providers)),
    genre: parsePositiveInt(first(params.genre)),
    year: parseYear(first(params.year), now),
    minRating: parseMinRating(first(params.minRating)),
    sort: parseSort(first(params.sort)),
    hideWatched: first(params.hideWatched) === '1',
    page: parsePageParam(params.page),
  };
}

export function serializeCatalogFilters(filters: CatalogFilters): string {
  const params = new URLSearchParams();
  if (filters.providers === 'all') params.set('providers', 'all');
  else if (filters.providers && filters.providers.length > 0) {
    params.set('providers', filters.providers.join(','));
  }
  if (filters.genre !== null) params.set('genre', String(filters.genre));
  if (filters.year !== null) params.set('year', String(filters.year));
  if (filters.minRating !== null) params.set('minRating', String(filters.minRating));
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set('sort', filters.sort);
  if (filters.hideWatched) params.set('hideWatched', '1');
  if (filters.page > 1) params.set('page', String(filters.page));
  return params.toString();
}

export function catalogHref(filters: CatalogFilters): string {
  const qs = serializeCatalogFilters(filters);
  return qs ? `/?${qs}` : '/';
}
