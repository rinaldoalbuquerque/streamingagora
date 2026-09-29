import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function MovieNotFound() {
  return (
    <div className="py-16 text-center">
      <h2 className="text-xl font-semibold">Filme não encontrado</h2>
      <Link href="/" className={buttonVariants({ className: 'mt-4' })}>
        Voltar ao catálogo
      </Link>
    </div>
  );
}
