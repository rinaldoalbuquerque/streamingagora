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
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Minha lista' };

const TABS: { status: MovieStatus; label: string; empty: string }[] = [
  {
    status: 'want',
    label: 'Quero assistir',
    empty: 'Sua lista está vazia. Adicione filmes com o botão Quero assistir.',
  },
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
  const availability = await loadAvailability(
    items.map((m) => m.tmdbId),
    getMovieWatchProviders,
  );
  const current = TABS.find((t) => t.status === tab)!;

  return (
    <div className="page-shell">
      <h1 className="page-title">Minha lista</h1>
      <nav aria-label="Abas da lista" className="mt-6 mb-8 flex gap-6 border-b">
        {TABS.map((t) => (
          <Link
            key={t.status}
            href={tabHref(t.status)}
            aria-current={t.status === tab ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 pb-3 text-sm font-medium transition-colors',
              t.status === tab
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {items.length === 0 ? (
        <div className="py-12">
          <p className="text-muted-foreground">{current.empty}</p>
          {tab === 'want' && (
            <Link href="/" className={buttonVariants({ className: 'mt-5 h-10 px-5' })}>
              Explorar o catálogo
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {items.map((movie) => (
            <UserMovieItem
              key={movie.tmdbId}
              movie={movie}
              availability={availability.get(movie.tmdbId)}
            />
          ))}
        </ul>
      )}
      <Pagination page={page} totalPages={totalPages} hrefForPage={(p) => tabHref(tab, p)} />
    </div>
  );
}
