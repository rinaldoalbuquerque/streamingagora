import 'server-only';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Db } from './repository';

export type UserDb = { db: Db; userId: string };

export async function getUserDb(): Promise<UserDb | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return { db: await createSupabaseServerClient(), userId: user.id };
}
