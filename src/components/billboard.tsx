import { Info, Play } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatRating, formatRuntime } from '@/lib/format';
import { tmdbImageUrl } from '@/lib/tmdb/images';
import type { MovieDetails } from '@/lib/tmdb/types';
import { cn } from '@/lib/utils';

const MAX_GENRES = 3;

/** Destaque da home: o filme mais popular dos streamings, em tela cheia. */
export function Billboard({ movie }: { movie: MovieDetails }) {
  const backdrop = tmdbImageUrl(movie.backdropPath, 'w1280');
  const provider = movie.watchProviders.flatrate[0];
  const providerLogo = provider ? tmdbImageUrl(provider.logoPath, 'w92') : null;
  const runtime = formatRuntime(movie.runtime);
  const href = `/filme/${movie.id}`;

  return (
    <section
      aria-labelledby="destaque-titulo"
      className="relative isolate flex min-h-[max(34rem,85svh)] items-end overflow-hidden"
    >
      {backdrop && (
        <Image
          src={backdrop}
          alt=""
          fill
          preload
          sizes="100vw"
          className="-z-20 object-cover object-[center_25%]"
        />
      )}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/60 to-transparent"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/10 to-background/30"
      />

      <div className="page-container animate-billboard pt-32 pb-[clamp(3rem,9vh,6rem)]">
        {provider && (
          <p className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground/90">
            {providerLogo && (
              <Image src={providerLogo} alt="" width={28} height={28} className="rounded-md" />
            )}
            Em alta na {provider.name}
          </p>
        )}
        <h2
          id="destaque-titulo"
          className={cn(
            'max-w-[16ch] font-display text-balance uppercase drop-shadow-[0_2px_24px_rgb(0_0_0/0.45)]',
            movie.title.length > 22
              ? 'text-[clamp(2.75rem,6.5vw,5.5rem)]'
              : 'text-[clamp(3.25rem,9vw,8rem)]',
          )}
        >
          {movie.title}
        </h2>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-foreground/85">
          <span className="font-semibold text-primary">★ {formatRating(movie.voteAverage)}</span>
          {movie.releaseYear && <span>{movie.releaseYear}</span>}
          {runtime && <span>{runtime}</span>}
          {movie.genres.slice(0, MAX_GENRES).map((g) => (
            <span
              key={g.id}
              className="rounded-sm border border-foreground/30 px-1.5 py-px text-xs"
            >
              {g.name}
            </span>
          ))}
        </div>

        {movie.overview && (
          <p className="mt-4 line-clamp-3 max-w-[56ch] text-base leading-relaxed text-foreground/90 sm:text-lg">
            {movie.overview}
          </p>
        )}

        <div className="mt-7 flex flex-wrap gap-3">
          {movie.trailerKey && (
            <Link
              href={`${href}#trailer`}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-foreground px-6 font-semibold text-background transition-colors hover:bg-foreground/85 focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Play aria-hidden className="size-5 fill-current" />
              Ver trailer
            </Link>
          )}
          <Link
            href={href}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-foreground/20 px-6 font-semibold backdrop-blur-sm transition-colors hover:bg-foreground/30 focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Info aria-hidden className="size-5" />
            Mais informações
          </Link>
        </div>
      </div>
    </section>
  );
}
