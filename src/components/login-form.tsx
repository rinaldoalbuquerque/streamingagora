'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authErrorMessage } from '@/lib/auth/error-messages';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Mode = 'signin' | 'signup';

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function callbackUrl() {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');
    setPending(true);
    setError(null);
    setInfo(null);

    const supabase = createSupabaseBrowserClient();
    const { data, error: authError } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: callbackUrl() },
          });
    setPending(false);

    if (authError) {
      setError(authErrorMessage(authError.message));
      return;
    }
    if (!data.session) {
      setInfo('Enviamos um link de confirmação para o seu e-mail.');
      return;
    }
    router.replace(next);
    router.refresh();
  }

  function switchMode() {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(null);
    setInfo(null);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            E-mail
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="h-10"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Senha
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            className="h-10"
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {info && (
          <p role="status" className="text-sm">
            {info}
          </p>
        )}
        <Button type="submit" className="h-10 w-full font-semibold" disabled={pending}>
          {mode === 'signin' ? 'Entrar' : 'Criar conta'}
        </Button>
      </form>
      <p className="text-center text-sm">
        {mode === 'signin' ? 'Ainda não tem conta? ' : 'Já tem conta? '}
        <button type="button" className="underline" onClick={switchMode}>
          {mode === 'signin' ? 'Cadastre-se' : 'Entrar'}
        </button>
      </p>
    </div>
  );
}
