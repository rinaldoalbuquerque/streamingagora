import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Defina ${name} em .env.test.local`);
  return value;
}

const url = env('LOCAL_SUPABASE_URL');
const anonKey = env('LOCAL_SUPABASE_ANON_KEY');
const serviceKey = env('LOCAL_SUPABASE_SERVICE_ROLE_KEY');
const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

export const admin = createClient<Database>(url, serviceKey, noSession);

export function createAnonClient(): SupabaseClient<Database> {
  return createClient<Database>(url, anonKey, noSession);
}

export type TestUser = { id: string; email: string; client: SupabaseClient<Database> };

export async function createTestUser(): Promise<TestUser> {
  const email = `teste-${crypto.randomUUID()}@exemplo.com`;
  const password = 'senha-de-teste-123';
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error('Usuário não criado');
  const client = createAnonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, email, client };
}

export async function deleteTestUser(id: string): Promise<void> {
  await admin.auth.admin.deleteUser(id);
}
