import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ProviderPicker } from '@/components/provider-picker';
import { withSelectedProviders } from '@/lib/catalog/provider-options';
import { getBrProviders } from '@/lib/tmdb/catalog-meta';
import { getUserProviderIds } from '@/lib/user-data/repository';
import { getUserDb } from '@/lib/user-data/server';

export const metadata: Metadata = { title: 'Meus streamings' };

const PROFILE_PROVIDER_COUNT = 40;

export default async function ProfilePage() {
  const ctx = await getUserDb();
  if (!ctx) redirect('/login?next=%2Fperfil');

  const [allProviders, selected] = await Promise.all([getBrProviders(), getUserProviderIds(ctx.db, ctx.userId)]);
  const providers = withSelectedProviders(allProviders.slice(0, PROFILE_PROVIDER_COUNT), allProviders, selected);

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">Meus streamings</h1>
      <p className="mb-6 text-muted-foreground">
        Escolha os serviços que você assina. O catálogo vai abrir filtrado por eles.
      </p>
      <ProviderPicker providers={providers} initialSelected={selected} />
    </>
  );
}
