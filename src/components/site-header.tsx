import { Search } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { HeaderShell } from './header-shell';

export function SiteHeader({ userSlot }: { userSlot?: ReactNode }) {
  return (
    <HeaderShell>
      <div className="page-container flex h-(--header-height) items-center gap-4 sm:gap-8">
        <Link
          href="/"
          className="shrink-0 font-display text-2xl text-primary uppercase sm:text-[1.75rem]"
        >
          Streaming Agora
        </Link>
        <nav aria-label="Principal" className="hidden gap-5 text-sm text-foreground/80 md:flex">
          <Link href="/" className="transition-colors hover:text-foreground">
            Início
          </Link>
          <Link href="/#explorar" className="transition-colors hover:text-foreground">
            Explorar
          </Link>
        </nav>
        <form action="/busca" role="search" className="relative ml-auto hidden sm:block">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            name="q"
            placeholder="Buscar filme"
            aria-label="Buscar filme por título"
            className="h-9 w-44 rounded-full border border-input bg-background/60 pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 lg:w-64"
          />
          <button type="submit" className="sr-only">
            Buscar
          </button>
        </form>
        <Link
          href="/busca"
          aria-label="Buscar filme"
          className="ml-auto rounded-full p-2 text-foreground/80 hover:text-foreground sm:hidden"
        >
          <Search aria-hidden className="size-5" />
        </Link>
        {userSlot}
      </div>
    </HeaderShell>
  );
}
