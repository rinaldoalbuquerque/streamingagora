import type { z } from 'zod';
import { MAX_PAGE } from '@/lib/filters/catalog-filters';
import { TmdbError } from './client';
import {
  rawCastSchema,
  rawPageSchema,
  rawProviderSchema,
  rawRegionProvidersSchema,
  rawVideoSchema,
  type RawCast,
  type RawMovie,
  type RawMovieDetails,
  type RawProvider,
  type RawVideo,
  type RawWatchProviders,
} from './schemas';
import type { CastMember, Movie, MovieDetails, Paginated, Provider, WatchProviders } from './types';

export function toMovie(raw: RawMovie): Movie {
  const year = raw.release_date && /^\d{4}/.test(raw.release_date)
    ? Number(raw.release_date.slice(0, 4))
    : null;
  return {
    id: raw.id,
    title: raw.title,
    posterPath: raw.poster_path ?? null,
    releaseYear: year,
    voteAverage: raw.vote_average ?? 0,
    overview: raw.overview ?? '',
  };
}

export function toProvider(raw: RawProvider): Provider {
  return {
    id: raw.provider_id,
    name: raw.provider_name,
    logoPath: raw.logo_path ?? null,
    displayPriority: raw.display_priorities?.BR ?? raw.display_priority ?? Number.MAX_SAFE_INTEGER,
  };
}

export function sortByPriority(providers: Provider[]): Provider[] {
  return [...providers].sort(
    (a, b) => a.displayPriority - b.displayPriority || a.name.localeCompare(b.name, 'pt-BR'),
  );
}

/** Converte cada item; itens fora do schema são descartados e registrados no log. */
export function parseItems<R, T>(
  items: unknown[],
  schema: z.ZodType<R>,
  map: (raw: R) => T,
  context: string,
): T[] {
  const out: T[] = [];
  for (const item of items) {
    const parsed = schema.safeParse(item);
    if (parsed.success) out.push(map(parsed.data));
    else console.error(`[tmdb] item inválido descartado em ${context}`, parsed.error.issues);
  }
  return out;
}

export function parseOrThrow<T>(schema: z.ZodType<T>, raw: unknown, context: string): T {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    console.error(`[tmdb] resposta inválida em ${context}`, parsed.error.issues);
    throw new TmdbError(`Resposta inesperada do TMDB em ${context}`);
  }
  return parsed.data;
}

export function toPaginated<R, T>(
  raw: unknown,
  schema: z.ZodType<R>,
  map: (raw: R) => T,
  context: string,
): Paginated<T> {
  const page = parseOrThrow(rawPageSchema, raw, context);
  return {
    page: page.page,
    totalPages: Math.min(page.total_pages, MAX_PAGE),
    totalResults: page.total_results,
    results: parseItems(page.results, schema, map, context),
  };
}

export const MAX_CAST = 12;

const EMPTY_WATCH_PROVIDERS: WatchProviders = { link: null, flatrate: [], rent: [], buy: [] };

function dedupeById(providers: Provider[]): Provider[] {
  const seen = new Map<number, Provider>();
  for (const p of providers) if (!seen.has(p.id)) seen.set(p.id, p);
  return [...seen.values()];
}

export function toWatchProviders(raw: RawWatchProviders | undefined): WatchProviders {
  const br = rawRegionProvidersSchema.safeParse(raw?.results?.BR);
  if (!br.success) return EMPTY_WATCH_PROVIDERS;
  const list = (items: unknown[] | undefined) =>
    parseItems(items ?? [], rawProviderSchema, toProvider, 'watch/providers');
  return {
    link: br.data.link ?? null,
    flatrate: sortByPriority(dedupeById([...list(br.data.flatrate), ...list(br.data.free), ...list(br.data.ads)])),
    rent: sortByPriority(list(br.data.rent)),
    buy: sortByPriority(list(br.data.buy)),
  };
}

export function pickTrailerKey(videos: RawVideo[]): string | null {
  const trailers = videos.filter((v) => v.site === 'YouTube' && v.type === 'Trailer');
  return (trailers.find((v) => v.iso_639_1 === 'pt') ?? trailers[0])?.key ?? null;
}

function toCastMember(raw: RawCast): CastMember {
  return {
    id: raw.id,
    name: raw.name,
    character: raw.character || null,
    profilePath: raw.profile_path ?? null,
  };
}

export function toMovieDetails(raw: RawMovieDetails): MovieDetails {
  return {
    ...toMovie(raw),
    runtime: raw.runtime ?? null,
    tagline: raw.tagline || null,
    backdropPath: raw.backdrop_path ?? null,
    genres: raw.genres ?? [],
    cast: parseItems(raw.credits?.cast ?? [], rawCastSchema, toCastMember, 'credits').slice(0, MAX_CAST),
    trailerKey: pickTrailerKey(parseItems(raw.videos?.results ?? [], rawVideoSchema, (v) => v, 'videos')),
    watchProviders: toWatchProviders(raw['watch/providers']),
  };
}
