import Link from 'next/link';
import { FilterBar } from '@/components/filter-bar';
import { HomeShowcase } from '@/components/home-showcase';
import { MovieGrid } from '@/components/movie-grid';
import { Pagination } from '@/components/pagination';
import { buttonVariants } from '@/components/ui/button';
import { resolveProviderIds } from '@/lib/catalog/resolve-providers';
import {
  catalogHref,
  parseCatalogFilters,
  serializeCatalogFilters,
  type RawSearchParams,
} from '@/lib/filters/catalog-filters';
import { getDefaultProviders, getGenres } from '@/lib/tmdb/catalog-meta';
import { discoverMovies } from '@/lib/tmdb/movies';
import { cn } from '@/lib/utils';

type PageProps = { searchParams: Promise<RawSearchParams> };

export default async function CatalogPage({ searchParams }: PageProps) {
  const filters = parseCatalogFilters(await searchParams);
  // Com qualquer filtro ou página ativa, a home vira só o Explorar, sem a vitrine.
  const isBrowsing = serializeCatalogFilters(filters) !== '';
  const Heading = isBrowsing ? 'h1' : 'h2';
  const [genres, defaultProviders] = await Promise.all([getGenres(), getDefaultProviders()]);
  const { ids } = resolveProviderIds(
    filters.providers,
    null,
    defaultProviders.map((p) => p.id),
  );
  const result = await discoverMovies({
    providerIds: ids,
    genre: filters.genre,
    year: filters.year,
    minRating: filters.minRating,
    sort: filters.sort,
    page: filters.page,
  });

  return (
    <>
      {!isBrowsing && <HomeShowcase providers={defaultProviders} />}

      <section
        id="explorar"
        aria-labelledby="explorar-titulo"
        className={cn(
          'page-container scroll-mt-(--header-height)',
          isBrowsing ? 'pt-[calc(var(--header-height)+2rem)]' : 'mt-16 border-t pt-12',
        )}
      >
        <Heading id="explorar-titulo" className="font-display text-5xl uppercase sm:text-6xl">
          Explorar
        </Heading>
        <p className="mt-2 mb-6 text-muted-foreground">Filtre por streaming, gênero, ano e nota.</p>
        <FilterBar
          filters={filters}
          genres={genres}
          providers={defaultProviders}
          selectedProviderIds={Array.isArray(filters.providers) ? filters.providers : []}
          canHideWatched={false}
        />
        <MovieGrid
          movies={result.results}
          emptyMessage="Nenhum filme encontrado com esses filtros."
          emptyAction={
            <Link href="/" className={buttonVariants({ variant: 'outline' })}>
              Limpar filtros
            </Link>
          }
        />
        <Pagination
          page={filters.page}
          totalPages={result.totalPages}
          hrefForPage={(page) => catalogHref({ ...filters, page })}
        />
      </section>
    </>
  );
}
