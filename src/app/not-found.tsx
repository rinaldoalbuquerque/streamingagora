import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h2 className="text-xl font-semibold">Página não encontrada</h2>
      <Link href="/" className={buttonVariants({ className: 'mt-4' })}>
        Voltar ao catálogo
      </Link>
    </div>
  );
}
