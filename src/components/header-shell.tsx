'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Cabeçalho fixo: transparente sobre o destaque e sólido depois que a página rola. */
export function HeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <header
      data-scrolled={scrolled}
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-300',
        scrolled
          ? 'bg-background/95 shadow-[0_1px_0_var(--border)] backdrop-blur-md'
          : 'bg-gradient-to-b from-background/90 via-background/40 to-transparent',
      )}
    >
      {children}
    </header>
  );
}
