import 'server-only';
import { requireEnv } from '@/lib/env';

export const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

/** Tempo de cache (segundos) por tipo de dado. */
export const REVALIDATE = {
  list: 21600,
  search: 3600,
  details: 21600,
  meta: 86400,
} as const;

const TIMEOUT_MS = 8000;
const MAX_RETRY_AFTER_S = 5;

export class TmdbError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'TmdbError';
  }
}

export class TmdbNotFoundError extends TmdbError {
  constructor(path: string) {
    super(`Recurso não encontrado no TMDB: ${path}`, 404);
    this.name = 'TmdbNotFoundError';
  }
}

export type QueryParams = Record<string, string | number | null | undefined>;

export interface TmdbFetchOptions {
  params?: QueryParams;
  revalidate: number;
}

function buildUrl(path: string, params: QueryParams = {}): string {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set('language', 'pt-BR');
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function retryDelayMs(response: Response): number {
  const header = response.headers.get('Retry-After');
  const seconds = header === null ? 1 : Number(header);
  const safe = Number.isFinite(seconds) && seconds >= 0 ? seconds : 1;
  return Math.min(safe, MAX_RETRY_AFTER_S) * 1000;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(url: string, token: string, revalidate: number): Promise<Response> {
  try {
    return await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate },
    });
  } catch (error) {
    throw new TmdbError(`TMDB indisponível: ${(error as Error).message}`);
  }
}

export async function tmdbFetch(path: string, options: TmdbFetchOptions): Promise<unknown> {
  const token = requireEnv('TMDB_READ_TOKEN');
  const url = buildUrl(path, options.params);

  let response = await request(url, token, options.revalidate);
  if (response.status === 429) {
    await sleep(retryDelayMs(response));
    response = await request(url, token, options.revalidate);
  }

  if (response.status === 404) throw new TmdbNotFoundError(path);
  if (!response.ok) {
    throw new TmdbError(`TMDB respondeu ${response.status} em ${path}`, response.status);
  }
  return response.json();
}
