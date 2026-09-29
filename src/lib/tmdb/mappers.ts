import type { z } from 'zod';
import { MAX_PAGE } from '@/lib/filters/catalog-filters';
import { TmdbError } from './client';
import { rawPageSchema, type RawMovie, type RawProvider } from './schemas';
import type { Movie, Paginated, Provider } from './types';

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
