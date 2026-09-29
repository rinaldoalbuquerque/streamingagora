import Link from 'next/link';
import { FilterBar } from '@/components/filter-bar';
import { MovieGrid } from '@/components/movie-grid';
import { Pagination } from '@/components/pagination';
import { buttonVariants } from '@/components/ui/button';
import { resolveProviderIds } from '@/lib/catalog/resolve-providers';
import { catalogHref, parseCatalogFilters, type RawSearchParams } from '@/lib/filters/catalog-filters';
import { getDefaultProviders, getGenres } from '@/lib/tmdb/catalog-meta';
import { discoverMovies } from '@/lib/tmdb/movies';

type PageProps = { searchParams: Promise<RawSearchParams> };

export default async function CatalogPage({ searchParams }: PageProps) {
  const filters = parseCatalogFilters(await searchParams);
  const [genres, defaultProviders] = await Promise.all([getGenres(), getDefaultProviders()]);
  const { ids } = resolveProviderIds(filters.providers, null, defaultProviders.map((p) => p.id));
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
      <h1 className="mb-4 text-2xl font-bold">Filmes disponíveis nos streamings</h1>
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
        emptyAction={<Link href="/" className={buttonVariants({ variant: 'outline' })}>Limpar filtros</Link>}
      />
      <Pagination
        page={filters.page}
        totalPages={result.totalPages}
        hrefForPage={(page) => catalogHref({ ...filters, page })}
      />
    </>
  );
}
