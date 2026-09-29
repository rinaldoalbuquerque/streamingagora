import { z } from 'zod';

export const MOVIE_STATUSES = ['want', 'watched'] as const;
export type MovieStatus = (typeof MOVIE_STATUSES)[number];
export const movieStatusSchema = z.enum(MOVIE_STATUSES);

export const tmdbIdSchema = z.number().int().positive();

export const movieRefSchema = z.object({
  tmdbId: tmdbIdSchema,
  title: z.string().trim().min(1).max(300),
  posterPath: z.string().regex(/^\/[\w.-]+$/).nullable(),
});
export type MovieRef = z.infer<typeof movieRefSchema>;

export const providerIdsSchema = z
  .array(z.number().int().positive())
  .max(50)
  .transform((ids) => [...new Set(ids)]);

export interface UserMovie extends MovieRef {
  status: MovieStatus;
  updatedAt: string;
}

export const USER_LIST_PAGE_SIZE = 20;

export function parseListTab(raw: string | string[] | undefined): MovieStatus {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === 'watched' ? 'watched' : 'want';
}
