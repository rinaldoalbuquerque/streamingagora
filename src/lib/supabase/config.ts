// Acesso literal para o Next embutir as variáveis no bundle do navegador.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabaseUrl: string = url;
export const supabaseAnonKey: string = anonKey;
