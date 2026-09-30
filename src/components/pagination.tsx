import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
}

const disabledClass = cn(buttonVariants({ variant: 'outline' }), 'pointer-events-none opacity-50');

export function Pagination({ page, totalPages, hrefForPage }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Paginação" className="mt-12 flex items-center justify-center gap-4">
      {page > 1 ? (
        <Link href={hrefForPage(page - 1)} className={buttonVariants({ variant: 'outline' })}>
          Anterior
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledClass}>
          Anterior
        </span>
      )}
      <span className="text-sm text-muted-foreground">
        Página {page} de {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={hrefForPage(page + 1)} className={buttonVariants({ variant: 'outline' })}>
          Próxima
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledClass}>
          Próxima
        </span>
      )}
    </nav>
  );
}
