import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/login-form';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { safeNextPath } from '@/lib/auth/safe-next';
import type { RawSearchParams } from '@/lib/filters/catalog-filters';

export const metadata: Metadata = { title: 'Entrar' };

type PageProps = { searchParams: Promise<RawSearchParams> };

export default async function LoginPage({ searchParams }: PageProps) {
  const { next, erro } = await searchParams;
  const nextPath = safeNextPath(typeof next === 'string' ? next : undefined);
  if (await getCurrentUser()) redirect(nextPath);

  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="mb-6 text-2xl font-bold">Entrar</h1>
      {erro === 'callback' && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          Não foi possível concluir o login. Tente novamente.
        </p>
      )}
      <LoginForm next={nextPath} />
    </div>
  );
}
