import Image from 'next/image';
import Link from 'next/link';
import { formatRating } from '@/lib/format';
import { tmdbImageUrl } from '@/lib/tmdb/images';
import type { Movie } from '@/lib/tmdb/types';

export function MovieCard({ movie }: { movie: Movie }) {
  const poster = tmdbImageUrl(movie.posterPath, 'w342');
  return (
    <Link
      href={`/filme/${movie.id}`}
      className="group block rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-card ring-foreground/70 group-hover:ring-2">
        {poster ? (
          <Image
            src={poster}
            alt={`Pôster de ${movie.title}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-center text-sm text-muted-foreground">
            Sem pôster
          </div>
        )}
      </div>
      <h3 className="mt-2.5 line-clamp-2 text-sm font-medium">{movie.title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {movie.releaseYear ?? '—'} · ★ {formatRating(movie.voteAverage)}
      </p>
    </Link>
  );
}
