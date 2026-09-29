import type { Metadata } from 'next';
import { MovieGrid } from '@/components/movie-grid';
import { Pagination } from '@/components/pagination';
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
      <>
        <h1 className="mb-4 text-2xl font-bold">Buscar filmes</h1>
        <p className="text-muted-foreground">Digite o nome de um filme na busca acima.</p>
      </>
    );
  }

  const page = parsePageParam(params.page);
  const result = await searchMovies(query, page);

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Resultados para &quot;{query}&quot;</h1>
      <MovieGrid movies={result.results} emptyMessage={`Nenhum filme encontrado para "${query}".`} />
      <Pagination page={page} totalPages={result.totalPages} hrefForPage={(p) => searchHref(query, p)} />
    </>
  );
}
