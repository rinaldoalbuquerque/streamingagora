import Image from 'next/image';
import Link from 'next/link';
import { catalogHref, DEFAULT_FILTERS, type SortOption } from '@/lib/filters/catalog-filters';
import { tmdbImageUrl } from '@/lib/tmdb/images';
import { discoverMovies, getMovieDetails } from '@/lib/tmdb/movies';
import type { Movie, Provider } from '@/lib/tmdb/types';
import { BackdropCard } from './backdrop-card';
import { Billboard } from './billboard';
import { MovieCard } from './movie-card';
import { MovieRow } from './movie-row';
import { RankedCard } from './ranked-card';

const ROW_PROVIDER_COUNT = 5;
const TOP_COUNT = 10;

function discover(providerIds: number[], sort: SortOption) {
  return discoverMovies({ providerIds, genre: null, year: null, minRating: null, sort, page: 1 });
}

function settledMovies(result: PromiseSettledResult<{ results: Movie[] }>): Movie[] {
  return result.status === 'fulfilled' ? result.value.results : [];
}

const seeAllClass =
  'shrink-0 text-sm text-muted-foreground transition-colors hover:text-foreground';

/** Vitrine da home: destaque em tela cheia e fileiras por streaming, no estilo das plataformas. */
export async function HomeShowcase({ providers }: { providers: Provider[] }) {
  const allIds = providers.map((p) => p.id);
  const rowProviders = providers.slice(0, ROW_PROVIDER_COUNT);

  const [trending, topRated, ...byProvider] = await Promise.allSettled([
    discover(allIds, 'popularity.desc'),
    discover(allIds, 'vote_average.desc'),
    ...rowProviders.map((p) => discover([p.id], 'popularity.desc')),
  ]);

  const trendingMovies = settledMovies(trending);
  const featured = trendingMovies.find((m) => m.backdropPath && m.overview) ?? trendingMovies[0];
  const details = featured ? await getMovieDetails(featured.id).catch(() => null) : null;
  const topRatedMovies = settledMovies(topRated);

  return (
    <>
      <h1 className="sr-only">Filmes disponíveis nos streamings</h1>
      {details ? <Billboard movie={details} /> : <div className="h-(--header-height)" />}

      <div className="relative z-10 mt-2">
        {trendingMovies.length > 0 && (
          <MovieRow title="Top 10 nos streamings" label="Top 10 nos streamings">
            {trendingMovies.slice(0, TOP_COUNT).map((movie, i) => (
              <li key={movie.id} className="shrink-0 snap-start">
                <RankedCard movie={movie} rank={i + 1} />
              </li>
            ))}
          </MovieRow>
        )}

        {rowProviders.map((provider, i) => {
          const movies = settledMovies(byProvider[i]);
          if (movies.length === 0) return null;
          const logo = tmdbImageUrl(provider.logoPath, 'w92');
          return (
            <MovieRow
              key={provider.id}
              label={`Populares em ${provider.name}`}
              title={
                <>
                  {logo && (
                    <Image src={logo} alt="" width={28} height={28} className="rounded-md" />
                  )}
                  {provider.name}
                </>
              }
              action={
                <Link
                  href={catalogHref({ ...DEFAULT_FILTERS, providers: [provider.id] })}
                  className={seeAllClass}
                >
                  Ver tudo
                </Link>
              }
            >
              {movies.map((movie) => (
                <li key={movie.id} className="w-[clamp(15rem,26vw,22rem)] shrink-0 snap-start">
                  <BackdropCard movie={movie} />
                </li>
              ))}
            </MovieRow>
          );
        })}

        {topRatedMovies.length > 0 && (
          <MovieRow
            title="Mais bem avaliados"
            label="Mais bem avaliados"
            action={
              <Link
                href={catalogHref({ ...DEFAULT_FILTERS, sort: 'vote_average.desc' })}
                className={seeAllClass}
              >
                Ver tudo
              </Link>
            }
          >
            {topRatedMovies.map((movie) => (
              <li key={movie.id} className="w-[clamp(8.5rem,13vw,11rem)] shrink-0 snap-start">
                <MovieCard movie={movie} />
              </li>
            ))}
          </MovieRow>
        )}
      </div>
    </>
  );
}
