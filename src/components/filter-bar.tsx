'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_FILTERS,
  MIN_YEAR,
  SORT_OPTIONS,
  catalogHref,
  type CatalogFilters,
  type SortOption,
} from '@/lib/filters/catalog-filters';
import { tmdbImageUrl } from '@/lib/tmdb/images';
import type { Genre, Provider } from '@/lib/tmdb/types';
import { cn } from '@/lib/utils';

const SORT_LABELS: Record<SortOption, string> = {
  'popularity.desc': 'Mais populares',
  'vote_average.desc': 'Melhor avaliados',
  'primary_release_date.desc': 'Lançamentos recentes',
};
const RATING_OPTIONS = [5, 6, 7, 8, 9];
const selectClass =
  'h-10 min-w-36 rounded-md border border-input bg-card px-3 text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40';

interface FilterBarProps {
  filters: CatalogFilters;
  genres: Genre[];
  providers: Provider[];
  selectedProviderIds: number[];
  canHideWatched: boolean;
}

function toNumberOrNull(value: string): number | null {
  return value === '' ? null : Number(value);
}

export function FilterBar({
  filters,
  genres,
  providers,
  selectedProviderIds,
  canHideWatched,
}: FilterBarProps) {
  const router = useRouter();
  const maxYear = new Date().getFullYear() + 1;
  const years = Array.from({ length: maxYear - MIN_YEAR + 1 }, (_, i) => maxYear - i);

  function apply(changes: Partial<CatalogFilters>) {
    router.push(catalogHref({ ...filters, ...changes, page: 1 }));
  }

  function toggleProvider(id: number) {
    const next = selectedProviderIds.includes(id)
      ? selectedProviderIds.filter((p) => p !== id)
      : [...selectedProviderIds, id].sort((a, b) => a - b);
    apply({ providers: next.length > 0 ? next : 'all' });
  }

  return (
    <section aria-label="Filtros" className="mb-8 space-y-5">
      <div className="flex flex-wrap gap-2">
        {providers.map((provider) => {
          const logo = tmdbImageUrl(provider.logoPath, 'w92');
          const active = selectedProviderIds.includes(provider.id);
          return (
            <button
              key={provider.id}
              type="button"
              aria-pressed={active}
              onClick={() => toggleProvider(provider.id)}
              className={cn(
                'flex items-center gap-2 rounded-full border py-1 pr-3.5 pl-1 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/60',
                active
                  ? 'border-primary bg-primary font-medium text-primary-foreground'
                  : 'border-input text-foreground/85 hover:border-foreground/40 hover:text-foreground',
              )}
            >
              {logo && <Image src={logo} alt="" width={24} height={24} className="rounded-full" />}
              <span>{provider.name}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-4 text-sm">
        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-genero" className="text-muted-foreground">
            Gênero
          </label>
          <select
            id="filtro-genero"
            className={selectClass}
            value={filters.genre ?? ''}
            onChange={(e) => apply({ genre: toNumberOrNull(e.target.value) })}
          >
            <option value="">Todos</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-ano" className="text-muted-foreground">
            Ano
          </label>
          <select
            id="filtro-ano"
            className={selectClass}
            value={filters.year ?? ''}
            onChange={(e) => apply({ year: toNumberOrNull(e.target.value) })}
          >
            <option value="">Qualquer</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-nota" className="text-muted-foreground">
            Nota mínima
          </label>
          <select
            id="filtro-nota"
            className={selectClass}
            value={filters.minRating ?? ''}
            onChange={(e) => apply({ minRating: toNumberOrNull(e.target.value) })}
          >
            <option value="">Qualquer</option>
            {RATING_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}+
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-ordem" className="text-muted-foreground">
            Ordenar por
          </label>
          <select
            id="filtro-ordem"
            className={selectClass}
            value={filters.sort}
            onChange={(e) => apply({ sort: e.target.value as SortOption })}
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {canHideWatched && (
          <div className="flex h-10 items-center gap-2">
            <input
              id="filtro-assistidos"
              type="checkbox"
              className="size-4 accent-primary"
              checked={filters.hideWatched}
              onChange={(e) => apply({ hideWatched: e.target.checked })}
            />
            <label htmlFor="filtro-assistidos">Ocultar assistidos</label>
          </div>
        )}

        <Button
          type="button"
          variant="ghost"
          className="h-10 px-3"
          onClick={() => router.push(catalogHref(DEFAULT_FILTERS))}
        >
          Limpar filtros
        </Button>
      </div>
    </section>
  );
}
