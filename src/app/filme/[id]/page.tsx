import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ListButtons } from '@/components/list-buttons';
import { MovieRow } from '@/components/movie-row';
import { WatchProvidersSection } from '@/components/watch-providers-section';
import { formatRating, formatRuntime } from '@/lib/format';
import { parseMovieId } from '@/lib/movie-id';
import { TmdbNotFoundError } from '@/lib/tmdb/client';
import { tmdbImageUrl } from '@/lib/tmdb/images';
import { getMovieDetails } from '@/lib/tmdb/movies';
import type { MovieDetails } from '@/lib/tmdb/types';
import { getMovieStatus } from '@/lib/user-data/repository';
import { getUserDb } from '@/lib/user-data/server';
import { cn } from '@/lib/utils';

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

const sectionTitleClass = 'text-lg font-semibold sm:text-xl';

export default async function MoviePage({ params }: PageProps) {
  const movie = await loadMovie((await params).id);
  const ctx = await getUserDb();
  const status = ctx ? await getMovieStatus(ctx.db, ctx.userId, movie.id) : null;
  const poster = tmdbImageUrl(movie.posterPath, 'w500');
  const backdrop = tmdbImageUrl(movie.backdropPath, 'w1280');
  const runtime = formatRuntime(movie.runtime);

  return (
    <article>
      <header className="relative isolate flex min-h-[max(30rem,72svh)] items-end overflow-hidden">
        {backdrop && (
          <Image
            src={backdrop}
            alt=""
            fill
            preload
            sizes="100vw"
            className="-z-20 object-cover object-[center_20%]"
          />
        )}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/70 to-background/20"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-r from-background/80 to-transparent"
        />

        <div className="page-container grid items-end gap-8 pt-[calc(var(--header-height)+3rem)] pb-10 md:grid-cols-[minmax(0,16rem)_1fr] lg:gap-12">
          <div className="relative hidden aspect-[2/3] overflow-hidden rounded-md bg-card shadow-2xl shadow-black/60 md:block">
            {poster ? (
              <Image
                src={poster}
                alt={`Pôster de ${movie.title}`}
                fill
                preload
                sizes="256px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Sem pôster
              </div>
            )}
          </div>

          <div>
            <h1
              className={cn(
                'max-w-[18ch] font-display text-balance uppercase',
                movie.title.length > 22
                  ? 'text-[clamp(2.5rem,5.5vw,4.75rem)]'
                  : 'text-[clamp(3rem,8vw,6.5rem)]',
              )}
            >
              {movie.title}
            </h1>
            {movie.tagline && (
              <p className="mt-3 max-w-[60ch] text-lg text-foreground/80 italic">{movie.tagline}</p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-foreground/85">
              <span className="font-semibold text-primary">
                ★ {formatRating(movie.voteAverage)}
              </span>
              {movie.releaseYear && <span>{movie.releaseYear}</span>}
              {runtime && <span>{runtime}</span>}
              {movie.genres.map((g) => (
                <span
                  key={g.id}
                  className="rounded-sm border border-foreground/30 px-1.5 py-px text-xs"
                >
                  {g.name}
                </span>
              ))}
            </div>

            <div className="mt-7">
              <ListButtons
                movie={{ tmdbId: movie.id, title: movie.title, posterPath: movie.posterPath }}
                initialStatus={status}
                isLoggedIn={ctx !== null}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="page-container grid gap-10 py-8 lg:grid-cols-[minmax(0,60rem)_22rem] lg:gap-16">
        <div className="space-y-10">
          <section>
            <h2 className={sectionTitleClass}>Sinopse</h2>
            <p className="mt-3 max-w-[68ch] text-base leading-relaxed text-foreground/90 sm:text-lg">
              {movie.overview || 'Sinopse indisponível.'}
            </p>
          </section>

          {movie.trailerKey && (
            <section id="trailer" className="scroll-mt-[calc(var(--header-height)+1rem)]">
              <h2 className={sectionTitleClass}>Trailer</h2>
              <div className="mt-3 aspect-video overflow-hidden rounded-md bg-card">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${movie.trailerKey}`}
                  title={`Trailer de ${movie.title}`}
                  allow="accelerometer; encrypted-media; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            </section>
          )}
        </div>

        <aside className="self-start rounded-lg bg-card p-5 lg:sticky lg:top-[calc(var(--header-height)+1rem)]">
          <WatchProvidersSection providers={movie.watchProviders} />
        </aside>
      </div>

      {movie.cast.length > 0 && (
        <div className="pb-4">
          <MovieRow title="Elenco" label="Elenco">
            {movie.cast.map((c) => {
              const photo = tmdbImageUrl(c.profilePath, 'w185');
              return (
                <li key={c.id} className="w-32 shrink-0 snap-start sm:w-36">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-card">
                    {photo ? (
                      <Image src={photo} alt="" fill sizes="144px" className="object-cover" />
                    ) : (
                      <span
                        aria-hidden
                        className="flex h-full items-center justify-center font-display text-5xl text-muted-foreground"
                      >
                        {c.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium">{c.name}</p>
                  {c.character && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{c.character}</p>
                  )}
                </li>
              );
            })}
          </MovieRow>
        </div>
      )}
    </article>
  );
}
