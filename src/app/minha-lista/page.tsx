import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Pagination } from '@/components/pagination';
import { buttonVariants } from '@/components/ui/button';
import { UserMovieItem } from '@/components/user-movie-item';
import { loadAvailability } from '@/lib/catalog/load-availability';
import { parsePageParam, type RawSearchParams } from '@/lib/filters/catalog-filters';
import { getMovieWatchProviders } from '@/lib/tmdb/movies';
import { listUserMovies } from '@/lib/user-data/repository';
import { parseListTab, type MovieStatus } from '@/lib/user-data/schemas';
import { getUserDb } from '@/lib/user-data/server';

export const metadata: Metadata = { title: 'Minha lista' };

const TABS: { status: MovieStatus; label: string; empty: string }[] = [
  { status: 'want', label: 'Quero assistir', empty: 'Sua lista está vazia. Explore o catálogo e adicione filmes.' },
  { status: 'watched', label: 'Assistidos', empty: 'Nenhum filme marcado como assistido.' },
];

type PageProps = { searchParams: Promise<RawSearchParams> };

function tabHref(status: MovieStatus, page = 1): string {
  return `/minha-lista?tab=${status}${page > 1 ? `&page=${page}` : ''}`;
}

export default async function MyListPage({ searchParams }: PageProps) {
  const ctx = await getUserDb();
  if (!ctx) redirect('/login?next=%2Fminha-lista');

  const params = await searchParams;
  const tab = parseListTab(params.tab);
  const page = parsePageParam(params.page);
  const { items, totalPages } = await listUserMovies(ctx.db, ctx.userId, tab, page);
  const availability = await loadAvailability(items.map((m) => m.tmdbId), getMovieWatchProviders);
  const current = TABS.find((t) => t.status === tab)!;

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Minha lista</h1>
      <nav aria-label="Abas da lista" className="mb-6 flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.status}
            href={tabHref(t.status)}
            aria-current={t.status === tab ? 'page' : undefined}
            className={buttonVariants({ variant: t.status === tab ? 'default' : 'outline' })}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {items.length === 0 ? (
        <p className="py-8 text-muted-foreground">{current.empty}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((movie) => (
            <UserMovieItem key={movie.tmdbId} movie={movie} availability={availability.get(movie.tmdbId)} />
          ))}
        </ul>
      )}
      <Pagination page={page} totalPages={totalPages} hrefForPage={(p) => tabHref(tab, p)} />
    </>
  );
}
