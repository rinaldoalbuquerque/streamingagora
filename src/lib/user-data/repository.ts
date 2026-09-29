import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { USER_LIST_PAGE_SIZE, type MovieRef, type MovieStatus, type UserMovie } from './schemas';

export type Db = SupabaseClient<Database>;

/** PostgREST responde PGRST103 quando o offset passa do total de linhas. */
const RANGE_NOT_SATISFIABLE = 'PGRST103';

export async function getMovieStatus(db: Db, userId: string, tmdbId: number): Promise<MovieStatus | null> {
  const { data, error } = await db
    .from('user_movies')
    .select('status')
    .eq('user_id', userId)
    .eq('tmdb_id', tmdbId)
    .maybeSingle();
  if (error) throw error;
  return (data?.status as MovieStatus | undefined) ?? null;
}

export async function getWatchedIds(db: Db, userId: string): Promise<Set<number>> {
  const { data, error } = await db
    .from('user_movies')
    .select('tmdb_id')
    .eq('user_id', userId)
    .eq('status', 'watched');
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.tmdb_id));
}

export async function listUserMovies(
  db: Db,
  userId: string,
  status: MovieStatus,
  page: number,
): Promise<{ items: UserMovie[]; totalPages: number }> {
  const from = (page - 1) * USER_LIST_PAGE_SIZE;
  const { data, error, count } = await db
    .from('user_movies')
    .select('tmdb_id, title, poster_path, status, updated_at', { count: 'exact' })
    .eq('user_id', userId)
    .eq('status', status)
    .order('updated_at', { ascending: false })
    .range(from, from + USER_LIST_PAGE_SIZE - 1);

  if (error?.code === RANGE_NOT_SATISFIABLE) return { items: [], totalPages: 1 };
  if (error) throw error;

  return {
    items: (data ?? []).map((row) => ({
      tmdbId: row.tmdb_id,
      title: row.title,
      posterPath: row.poster_path,
      status: row.status as MovieStatus,
      updatedAt: row.updated_at,
    })),
    totalPages: Math.max(1, Math.ceil((count ?? 0) / USER_LIST_PAGE_SIZE)),
  };
}

export async function setMovieStatus(db: Db, userId: string, movie: MovieRef, status: MovieStatus): Promise<void> {
  const { error } = await db.from('user_movies').upsert(
    {
      user_id: userId,
      tmdb_id: movie.tmdbId,
      title: movie.title,
      poster_path: movie.posterPath,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,tmdb_id' },
  );
  if (error) throw error;
}

export async function removeMovie(db: Db, userId: string, tmdbId: number): Promise<void> {
  const { error } = await db.from('user_movies').delete().eq('user_id', userId).eq('tmdb_id', tmdbId);
  if (error) throw error;
}

export async function getUserProviderIds(db: Db, userId: string): Promise<number[]> {
  const { data, error } = await db
    .from('user_providers')
    .select('provider_id')
    .eq('user_id', userId)
    .order('provider_id');
  if (error) throw error;
  return (data ?? []).map((row) => row.provider_id);
}

export async function setUserProviderIds(db: Db, userId: string, ids: number[]): Promise<void> {
  const removal = db.from('user_providers').delete().eq('user_id', userId);
  const { error: deleteError } =
    ids.length > 0 ? await removal.not('provider_id', 'in', `(${ids.join(',')})`) : await removal;
  if (deleteError) throw deleteError;

  if (ids.length === 0) return;
  const { error } = await db
    .from('user_providers')
    .upsert(
      ids.map((provider_id) => ({ user_id: userId, provider_id })),
      { onConflict: 'user_id,provider_id', ignoreDuplicates: true },
    );
  if (error) throw error;
}
