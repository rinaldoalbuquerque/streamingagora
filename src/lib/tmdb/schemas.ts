import { z } from 'zod';

export const rawMovieSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  poster_path: z.string().nullable().optional(),
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
