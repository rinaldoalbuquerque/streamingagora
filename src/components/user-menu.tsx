import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth/get-current-user';

const linkClass = 'rounded-sm px-2 py-1 text-foreground/80 transition-colors hover:text-foreground';

export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Link href="/login" className={buttonVariants({ className: 'h-9 px-4' })}>
        Entrar
      </Link>
    );
  }
  return (
    <nav aria-label="Conta" className="flex items-center gap-1 text-sm">
      <Link href="/minha-lista" className={linkClass}>
        Minha lista
      </Link>
      <Link href="/perfil" className={`${linkClass} hidden sm:inline`}>
        Meus streamings
      </Link>
      <form action="/auth/signout" method="post">
        <button type="submit" className={linkClass}>
          Sair
        </button>
      </form>
    </nav>
  );
}
