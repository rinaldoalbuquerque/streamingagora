import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="page-shell text-center">
      <h1 className="page-title">Página não encontrada</h1>
      <Link href="/" className={buttonVariants({ className: 'mt-6 h-10 px-5' })}>
        Voltar ao catálogo
      </Link>
    </div>
  );
}
