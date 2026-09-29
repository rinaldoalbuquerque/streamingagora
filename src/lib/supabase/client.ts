import { createBrowserClient } from '@supabase/ssr';
import { supabaseAnonKey, supabaseUrl } from './config';
import type { Database } from './database.types';

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
