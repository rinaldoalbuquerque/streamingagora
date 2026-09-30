'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MovieRowProps {
  title: ReactNode;
  /** Nome acessível da lista quando o título não é só texto. */
  label: string;
  action?: ReactNode;
  children: ReactNode;
}

const arrowClass =
  'absolute inset-y-0 z-10 hidden w-(--row-inset) min-w-12 items-center justify-center text-foreground opacity-0 transition-opacity focus-visible:opacity-100 disabled:pointer-events-none disabled:!opacity-0 group-hover/row:opacity-100 md:flex';

/** Fileira horizontal de filmes com rolagem por setas no desktop e por gesto no toque. */
export function MovieRow({ title, label, action, children }: MovieRowProps) {
  const headingId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const updateEdges = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    updateEdges();
    window.addEventListener('resize', updateEdges);
    return () => window.removeEventListener('resize', updateEdges);
  }, [updateEdges]);

  function scrollByPage(direction: 1 | -1) {
    const el = listRef.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: 'smooth' });
  }

  return (
    <section aria-labelledby={headingId} className="mt-8 first:mt-0">
      <div className="page-container flex items-end justify-between gap-4">
        <h2 id={headingId} className="flex items-center gap-2.5 text-lg font-semibold sm:text-xl">
          {title}
        </h2>
        {action}
      </div>
      <div className="group/row relative">
        <button
          type="button"
          aria-label={`Voltar em ${label}`}
          disabled={edges.start}
          onClick={() => scrollByPage(-1)}
          className={cn(arrowClass, 'left-0 bg-gradient-to-r from-background/90 to-transparent')}
        >
          <ChevronLeft aria-hidden className="size-9" />
        </button>
        <ul
          ref={listRef}
          aria-label={label}
          onScroll={updateEdges}
          className="scrollbar-none flex snap-x snap-mandatory scroll-px-(--row-inset) gap-2.5 overflow-x-auto px-(--row-inset) py-3 sm:gap-3"
        >
          {children}
        </ul>
        <button
          type="button"
          aria-label={`Avançar em ${label}`}
          disabled={edges.end}
          onClick={() => scrollByPage(1)}
          className={cn(arrowClass, 'right-0 bg-gradient-to-l from-background/90 to-transparent')}
        >
          <ChevronRight aria-hidden className="size-9" />
        </button>
      </div>
    </section>
  );
}
