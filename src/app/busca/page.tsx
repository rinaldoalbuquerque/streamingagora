import type { Metadata } from 'next';
import { MovieGrid } from '@/components/movie-grid';
import { Pagination } from '@/components/pagination';
import { SearchForm } from '@/components/search-form';
import { parsePageParam, type RawSearchParams } from '@/lib/filters/catalog-filters';
import { normalizeQuery, searchHref } from '@/lib/search/normalize-query';
import { searchMovies } from '@/lib/tmdb/movies';

type PageProps = { searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const query = normalizeQuery((await searchParams).q);
  return { title: query ? `Busca: ${query}` : 'Busca' };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = normalizeQuery(params.q);

  if (!query) {
    return (
      <div className="page-shell">
        <h1 className="page-title">Buscar filmes</h1>
        <SearchForm />
      </div>
    );
  }

  const page = parsePageParam(params.page);
  const result = await searchMovies(query, page);

  return (
    <div className="page-shell">
      <p className="text-sm text-muted-foreground">Resultados para</p>
      <h1 className="page-title mt-1 mb-8">{query}</h1>
      <MovieGrid
        movies={result.results}
        emptyMessage={`Nenhum filme encontrado para "${query}".`}
      />
      <Pagination
        page={page}
        totalPages={result.totalPages}
        hrefForPage={(p) => searchHref(query, p)}
      />
    </div>
  );
}
