export const MAX_QUERY_LENGTH = 100;

export function normalizeQuery(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const normalized = (value ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH);
  return normalized === '' ? null : normalized;
}

export function searchHref(query: string, page: number): string {
  const params = new URLSearchParams({ q: query });
  if (page > 1) params.set('page', String(page));
  return `/busca?${params.toString()}`;
}
