'use server';

import { revalidatePath } from 'next/cache';
import { removeMovie, setMovieStatus, setUserProviderIds } from './repository';
import {
  movieRefSchema,
  movieStatusSchema,
  providerIdsSchema,
  tmdbIdSchema,
  type MovieRef,
  type MovieStatus,
} from './schemas';
import { getUserDb, type UserDb } from './server';

export type ActionResult = { ok: true } | { ok: false; error: string };

const INVALID: ActionResult = { ok: false, error: 'Dados inválidos.' };
const NOT_LOGGED_IN: ActionResult = { ok: false, error: 'Você precisa entrar para fazer isso.' };
const SAVE_FAILED: ActionResult = { ok: false, error: 'Não foi possível salvar. Tente novamente.' };

async function run(work: (ctx: UserDb) => Promise<void>, paths: string[]): Promise<ActionResult> {
  const ctx = await getUserDb();
  if (!ctx) return NOT_LOGGED_IN;
  try {
    await work(ctx);
  } catch (error) {
    console.error('[user-data]', error);
    return SAVE_FAILED;
  }
  paths.forEach((path) => revalidatePath(path));
  return { ok: true };
}

const moviePaths = (tmdbId: number) => [`/filme/${tmdbId}`, '/minha-lista', '/'];

export async function setMovieStatusAction(movie: MovieRef, status: MovieStatus): Promise<ActionResult> {
  const parsedMovie = movieRefSchema.safeParse(movie);
  const parsedStatus = movieStatusSchema.safeParse(status);
  if (!parsedMovie.success || !parsedStatus.success) return INVALID;
  return run(
    ({ db, userId }) => setMovieStatus(db, userId, parsedMovie.data, parsedStatus.data),
    moviePaths(parsedMovie.data.tmdbId),
  );
}

export async function removeMovieAction(tmdbId: number): Promise<ActionResult> {
  const parsed = tmdbIdSchema.safeParse(tmdbId);
  if (!parsed.success) return INVALID;
  return run(({ db, userId }) => removeMovie(db, userId, parsed.data), moviePaths(parsed.data));
}

export async function saveProvidersAction(providerIds: number[]): Promise<ActionResult> {
  const parsed = providerIdsSchema.safeParse(providerIds);
  if (!parsed.success) return INVALID;
  return run(({ db, userId }) => setUserProviderIds(db, userId, parsed.data), ['/perfil', '/']);
}
