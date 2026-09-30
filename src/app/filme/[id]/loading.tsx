import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="page-shell">
      <div className="grid items-end gap-8 md:grid-cols-[16rem_1fr]">
        <Skeleton className="hidden aspect-[2/3] w-full md:block" />
        <div className="space-y-4">
          <Skeleton className="h-20 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-11 w-72" />
        </div>
      </div>
      <Skeleton className="mt-12 h-28 w-full max-w-3xl" />
    </div>
  );
}
