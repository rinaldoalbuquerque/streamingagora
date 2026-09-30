import Image from 'next/image';
import Link from 'next/link';
import { formatRating } from '@/lib/format';
import { tmdbImageUrl } from '@/lib/tmdb/images';
import type { Movie } from '@/lib/tmdb/types';

/** Card horizontal (16:9) das fileiras, com o título sobre a cena do filme. */
export function BackdropCard({ movie }: { movie: Movie }) {
  const image = tmdbImageUrl(movie.backdropPath, 'w780') ?? tmdbImageUrl(movie.posterPath, 'w500');
  return (
    <Link
      href={`/filme/${movie.id}`}
      className="group/card relative block aspect-video overflow-hidden rounded-md bg-card ring-foreground/70 outline-none hover:ring-2 focus-visible:ring-3 focus-visible:ring-ring"
    >
      {image && (
        <Image
          src={image}
          alt=""
          fill
          sizes="(max-width: 640px) 70vw, (max-width: 1280px) 30vw, 22vw"
          className="object-cover transition-transform duration-500 group-hover/card:scale-105"
        />
      )}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent"
      />
      <div className="absolute inset-x-0 bottom-0 p-3">
        <h3 className="line-clamp-2 font-display text-xl text-white uppercase sm:text-2xl">
          {movie.title}
        </h3>
        <p className="mt-1 flex gap-3 text-xs text-white/80">
          <span className="font-semibold text-primary">★ {formatRating(movie.voteAverage)}</span>
          {movie.releaseYear && <span>{movie.releaseYear}</span>}
        </p>
      </div>
    </Link>
  );
}
