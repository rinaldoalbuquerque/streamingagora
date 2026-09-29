import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth/get-current-user';

export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Link href="/login" className={buttonVariants({ variant: 'outline' })}>
        Entrar
      </Link>
    );
  }
  return (
    <nav aria-label="Conta" className="flex items-center gap-1 text-sm">
      <Link href="/minha-lista" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>Minha lista</Link>
      <Link href="/perfil" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>Meus streamings</Link>
      <form action="/auth/signout" method="post">
        <button type="submit" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>Sair</button>
      </form>
    </nav>
  );
}
