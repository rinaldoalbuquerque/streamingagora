import { Skeleton } from '@/components/ui/skeleton';

export function MovieGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <ul
      aria-label="Carregando filmes"
      className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
    >
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <Skeleton className="aspect-[2/3] w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />
          <Skeleton className="mt-1 h-3 w-1/2" />
        </li>
      ))}
    </ul>
  );
}
