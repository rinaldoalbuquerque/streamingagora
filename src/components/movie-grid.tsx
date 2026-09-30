import type { ReactNode } from 'react';
import type { Movie } from '@/lib/tmdb/types';
import { MovieCard } from './movie-card';

interface MovieGridProps {
  movies: Movie[];
  emptyMessage: string;
  emptyAction?: ReactNode;
}

export function MovieGrid({ movies, emptyMessage, emptyAction }: MovieGridProps) {
  if (movies.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    );
  }
  return (
    <ul
      aria-label="Filmes"
      className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
    >
      {movies.map((movie) => (
        <li key={movie.id}>
          <MovieCard movie={movie} />
        </li>
      ))}
    </ul>
  );
}
