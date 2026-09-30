import { MovieGridSkeleton } from '@/components/movie-grid-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="page-shell">
      <Skeleton className="mb-8 h-14 w-64" />
      <MovieGridSkeleton />
    </div>
  );
}
