import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { WatchProvidersSection } from '@/components/watch-providers-section';
import { formatRating, formatRuntime } from '@/lib/format';
import { parseMovieId } from '@/lib/movie-id';
import { TmdbNotFoundError } from '@/lib/tmdb/client';
import { tmdbImageUrl } from '@/lib/tmdb/images';
import { getMovieDetails } from '@/lib/tmdb/movies';
import type { MovieDetails } from '@/lib/tmdb/types';

type PageProps = { params: Promise<{ id: string }> };

async function loadMovie(rawId: string): Promise<MovieDetails> {
  const id = parseMovieId(rawId);
  if (id === null) notFound();
  try {
    return await getMovieDetails(id);
  } catch (error) {
    if (error instanceof TmdbNotFoundError) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const movie = await loadMovie((await params).id);
  return { title: movie.title, description: movie.overview.slice(0, 160) };
}

export default async function MoviePage({ params }: PageProps) {
  const movie = await loadMovie((await params).id);
  const poster = tmdbImageUrl(movie.posterPath, 'w500');
  const meta = [movie.releaseYear, formatRuntime(movie.runtime), `★ ${formatRating(movie.voteAverage)}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="grid gap-8 md:grid-cols-[300px_1fr]">
      <div className="relative aspect-[2/3] w-full max-w-[300px] overflow-hidden rounded-lg bg-muted">
        {poster ? (
          <Image src={poster} alt={`Pôster de ${movie.title}`} fill priority sizes="300px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">Sem pôster</div>
        )}
      </div>

      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold">{movie.title}</h1>
          <p className="mt-1 text-muted-foreground">{meta}</p>
          {movie.tagline && <p className="mt-2 italic">{movie.tagline}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {movie.genres.map((g) => (
              <Badge key={g.id} variant="secondary">{g.name}</Badge>
            ))}
          </div>
        </header>

        <WatchProvidersSection providers={movie.watchProviders} />

        <section>
          <h2 className="text-lg font-semibold">Sinopse</h2>
          <p className="mt-2 leading-relaxed">{movie.overview || 'Sinopse indisponível.'}</p>
        </section>

        {movie.trailerKey && (
          <section>
            <h2 className="text-lg font-semibold">Trailer</h2>
            <div className="mt-2 aspect-video">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${movie.trailerKey}`}
                title={`Trailer de ${movie.title}`}
                allow="accelerometer; encrypted-media; picture-in-picture"
                allowFullScreen
                className="h-full w-full rounded-lg"
              />
            </div>
          </section>
        )}

        {movie.cast.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold">Elenco</h2>
            <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {movie.cast.map((c) => (
                <li key={c.id} className="text-sm">
                  <p className="font-medium">{c.name}</p>
                  {c.character && <p className="text-muted-foreground">{c.character}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}
