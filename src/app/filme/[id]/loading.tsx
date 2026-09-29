import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="grid gap-8 md:grid-cols-[300px_1fr]">
      <Skeleton className="aspect-[2/3] w-full max-w-[300px]" />
      <div className="space-y-4">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
