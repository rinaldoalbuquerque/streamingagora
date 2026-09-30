import Image from 'next/image';
import Link from 'next/link';
import type { Availability } from '@/lib/catalog/load-availability';
import { tmdbImageUrl } from '@/lib/tmdb/images';
import type { UserMovie } from '@/lib/user-data/schemas';
import { ListButtons } from './list-buttons';

function AvailabilityLine({ availability }: { availability: Availability | undefined }) {
  if (!availability || availability.status === 'error') {
    return (
      <p className="text-sm text-muted-foreground">
        Não foi possível verificar a disponibilidade agora.
      </p>
    );
  }
  if (availability.providers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Não está disponível por assinatura no momento.
      </p>
    );
  }
  return (
    <p className="text-sm">Disponível em: {availability.providers.map((p) => p.name).join(', ')}</p>
  );
}

export function UserMovieItem({
  movie,
  availability,
}: {
  movie: UserMovie;
  availability: Availability | undefined;
}) {
  const poster = tmdbImageUrl(movie.posterPath, 'w185');
  const href = `/filme/${movie.tmdbId}`;
  return (
    <li className="flex gap-4 rounded-lg bg-card p-3">
      <Link
        href={href}
        aria-hidden
        tabIndex={-1}
        className="relative h-36 w-24 shrink-0 overflow-hidden rounded-md bg-muted"
      >
        {poster && <Image src={poster} alt="" fill sizes="96px" className="object-cover" />}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Link href={href} className="text-base font-semibold hover:underline">
          {movie.title}
        </Link>
        <AvailabilityLine availability={availability} />
        <ListButtons
          movie={{ tmdbId: movie.tmdbId, title: movie.title, posterPath: movie.posterPath }}
          initialStatus={movie.status}
          isLoggedIn
        />
      </div>
    </li>
  );
}
