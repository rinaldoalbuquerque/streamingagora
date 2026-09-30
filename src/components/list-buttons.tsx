'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useOptimistic, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { removeMovieAction, setMovieStatusAction } from '@/lib/user-data/actions';
import type { MovieRef, MovieStatus } from '@/lib/user-data/schemas';

const buttonClass = 'h-11 px-5 text-sm font-semibold';

interface ListButtonsProps {
  movie: MovieRef;
  initialStatus: MovieStatus | null;
  isLoggedIn: boolean;
}

export function ListButtons({ movie, initialStatus, isLoggedIn }: ListButtonsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<MovieStatus | null>(initialStatus);
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);
  const [isPending, startTransition] = useTransition();

  function change(next: MovieStatus | null) {
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    startTransition(async () => {
      setOptimisticStatus(next);
      const result =
        next === null
          ? await removeMovieAction(movie.tmdbId)
          : await setMovieStatusAction(movie, next);
      if (result.ok) setStatus(next);
      else toast.error(result.error);
    });
  }

  const isWant = optimisticStatus === 'want';
  const isWatched = optimisticStatus === 'watched';

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant={isWant ? 'default' : 'secondary'}
        aria-pressed={isWant}
        className={buttonClass}
        disabled={isPending}
        onClick={() => change(isWant ? null : 'want')}
      >
        {isWant ? '✓ Na lista' : '+ Quero assistir'}
      </Button>
      <Button
        variant={isWatched ? 'default' : 'secondary'}
        aria-pressed={isWatched}
        className={buttonClass}
        disabled={isPending}
        onClick={() => change(isWatched ? null : 'watched')}
      >
        {isWatched ? '✓ Assistido' : 'Marcar como assistido'}
      </Button>
    </div>
  );
}
