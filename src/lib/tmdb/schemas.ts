import { z } from 'zod';

export const rawMovieSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  release_date: z.string().optional(),
  vote_average: z.number().optional(),
  overview: z.string().optional(),
});
export type RawMovie = z.infer<typeof rawMovieSchema>;

export const rawPageSchema = z.object({
  page: z.number().int(),
  total_pages: z.number().int(),
  total_results: z.number().int(),
  results: z.array(z.unknown()),
});

export const rawGenresSchema = z.object({
  genres: z.array(z.object({ id: z.number().int(), name: z.string() })),
});

export const rawProviderSchema = z.object({
  provider_id: z.number().int(),
  provider_name: z.string(),
  logo_path: z.string().nullable().optional(),
  display_priority: z.number().optional(),
  display_priorities: z.record(z.string(), z.number()).optional(),
});
export type RawProvider = z.infer<typeof rawProviderSchema>;

export const rawProvidersListSchema = z.object({ results: z.array(z.unknown()) });

const optionalItems = z.array(z.unknown()).optional();

export const rawRegionProvidersSchema = z.object({
  link: z.string().optional(),
  flatrate: optionalItems,
  free: optionalItems,
  ads: optionalItems,
  rent: optionalItems,
  buy: optionalItems,
});

export const rawWatchProvidersSchema = z.object({
  results: z.record(z.string(), z.unknown()).optional(),
});
export type RawWatchProviders = z.infer<typeof rawWatchProvidersSchema>;

export const rawCastSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  character: z.string().nullable().optional(),
  profile_path: z.string().nullable().optional(),
});
export type RawCast = z.infer<typeof rawCastSchema>;

export const rawVideoSchema = z.object({
  key: z.string(),
  site: z.string(),
  type: z.string(),
  iso_639_1: z.string().optional(),
});
export type RawVideo = z.infer<typeof rawVideoSchema>;

export const rawMovieDetailsSchema = rawMovieSchema.extend({
  runtime: z.number().nullable().optional(),
  tagline: z.string().nullable().optional(),
  genres: z.array(z.object({ id: z.number().int(), name: z.string() })).optional(),
  credits: z.object({ cast: z.array(z.unknown()) }).optional(),
  videos: z.object({ results: z.array(z.unknown()) }).optional(),
  'watch/providers': rawWatchProvidersSchema.optional(),
});
export type RawMovieDetails = z.infer<typeof rawMovieDetailsSchema>;
