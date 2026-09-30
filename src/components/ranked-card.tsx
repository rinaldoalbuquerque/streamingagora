import Image from 'next/image';
import Link from 'next/link';
import { tmdbImageUrl } from '@/lib/tmdb/images';
import type { Movie } from '@/lib/tmdb/types';

/** Card do Top 10: o numeral da posição em contorno, com o pôster encostado nele. */
export function RankedCard({ movie, rank }: { movie: Movie; rank: number }) {
  const poster = tmdbImageUrl(movie.posterPath, 'w342');
  return (
    <Link
      href={`/filme/${movie.id}`}
      aria-label={`${rank}º lugar: ${movie.title}`}
      className="group/card flex items-end rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring"
    >
      <span
        aria-hidden
        className="-mr-[0.14em] font-display text-[clamp(7rem,13vw,11.5rem)] leading-[0.78] text-background [-webkit-text-stroke:3px_var(--muted-foreground)] transition-[-webkit-text-stroke-color] group-hover/card:[-webkit-text-stroke-color:var(--primary)]"
      >
        {rank}
      </span>
      <span className="relative aspect-[2/3] w-[clamp(6.5rem,11vw,9.5rem)] shrink-0 overflow-hidden rounded-md bg-card shadow-[-12px_0_24px_-8px_rgb(0_0_0/0.6)] ring-foreground/70 group-hover/card:ring-2">
        {poster ? (
          <Image src={poster} alt="" fill sizes="160px" className="object-cover" />
        ) : (
          <span className="flex h-full items-center p-2 text-center text-xs text-muted-foreground">
            {movie.title}
          </span>
        )}
      </span>
    </Link>
  );
}
