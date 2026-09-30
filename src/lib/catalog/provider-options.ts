import type { Provider } from '@/lib/tmdb/types';

/** Lista base + provedores selecionados que ficaram de fora, ordenados por prioridade. */
export function withSelectedProviders(base: Provider[], all: Provider[], selectedIds: number[]): Provider[] {
  const baseIds = new Set(base.map((p) => p.id));
  const extras = all.filter((p) => selectedIds.includes(p.id) && !baseIds.has(p.id));
  return [...base, ...extras].sort((a, b) => a.displayPriority - b.displayPriority);
}
