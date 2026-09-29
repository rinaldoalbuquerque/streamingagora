import Link from 'next/link';
import type { ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SiteHeader({ userSlot }: { userSlot?: ReactNode }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold">
          🎬 Streaming Agora
        </Link>
        <form action="/busca" role="search" className="ml-auto flex gap-2">
          <Input
            type="search"
            name="q"
            placeholder="Buscar filme..."
            aria-label="Buscar filme por título"
            className="w-44 sm:w-64"
          />
          <button type="submit" className={buttonVariants()}>
            Buscar
          </button>
        </form>
        {userSlot}
      </div>
    </header>
  );
}
