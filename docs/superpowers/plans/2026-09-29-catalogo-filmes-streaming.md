# Catálogo de Filmes em Streaming — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir um app web (Next.js) que lista os filmes disponíveis agora nos streamings por assinatura no Brasil, com filtros, busca, detalhes e — para usuários logados — lista "Quero assistir", "Assistidos" e "Meus streamings".

**Architecture:** Server Components chamam a API do TMDB no servidor (token nunca vai ao navegador) com cache do Next (`fetch` + `next.revalidate`). Filtros vivem na URL. Supabase (Postgres + Auth, com RLS) guarda apenas dados do usuário, referenciando filmes por `tmdb_id`. Mutações via Server Actions.

**Tech Stack:** Next.js 16 (App Router) + TypeScript estrito, Tailwind CSS v4 + shadcn/ui, Zod, Supabase (`@supabase/ssr`, Supabase CLI local), Vitest + Testing Library + MSW, Playwright, ESLint + Prettier, GitHub Actions, Vercel.

**Spec:** `docs/superpowers/specs/2026-09-29-catalogo-filmes-streaming-design.md`

## Global Constraints

- Idioma/região: somente pt-BR e `watch_region=BR`; toda chamada ao TMDB envia `language=pt-BR`.
- Catálogo = monetização `with_watch_monetization_types=flatrate|free|ads`; aluguel/compra só na página de detalhes.
- Catálogo sempre envia `vote_count.gte=50`.
- Revalidação: catálogo 6h (21600 s), busca 1h (3600 s), detalhes/disponibilidade 6h (21600 s), gêneros/provedores 24h (86400 s).
- Timeout de 8 s por chamada ao TMDB; em HTTP 429, uma nova tentativa respeitando `Retry-After`.
- Paginação limitada a 500 páginas (limite do TMDB).
- Catálogo sem provedor selecionado envia os 15 principais provedores BR por `display_priority`.
- Somente `lib/tmdb` lê `TMDB_READ_TOKEN`; o token nunca chega ao navegador.
- Somente `lib/user-data` acessa `user_movies` e `user_providers`.
- Variáveis de ambiente: `TMDB_READ_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- "Minha lista" paginada em 20 itens.
- Rodapé com créditos ao TMDB e ao JustWatch.
- Textos de interface em pt-BR; identificadores de código em inglês.
- Ambiente de desenvolvimento: Windows; rode os comandos no **Git Bash**.
- Next.js ≥ 16: o middleware se chama `src/proxy.ts` e exporta `proxy`; `params`/`searchParams` de páginas são `Promise`.
- Todo commit termina com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (os comandos abaixo já incluem via segundo `-m`).

## Review Focus

1. **`next` malicioso no login** (`//evil.com`, `/\evil.com`, `/<TAB>/evil.com`, `https://evil.com`) → o usuário volta para `/`, nunca para outro domínio. *Teste: Task 11, `safe-next.test.ts`.*
2. **ID de filme inválido na URL** (`/filme/abc`, `/filme/0`, `/filme/-1`, `/filme/99999999999`) → página 404, não erro 500. *Teste: Task 9, `movie-id.test.ts`.*
3. **Busca vazia, só com espaços ou com `&`/acentos** → busca vazia mostra orientação sem chamar o TMDB; caracteres especiais chegam intactos ao TMDB. *Testes: Task 8, `normalize-query.test.ts`; Task 4, teste de `searchMovies`.*
4. **Filme sem disponibilidade no BR, sem pôster ou sem trailer** → "Indisponível em streaming no Brasil no momento.", placeholder "Sem pôster", nenhuma seção de trailer. *Testes: Task 5 (mapper sem BR), Task 6 (MovieCard sem pôster), Task 9 (WatchProvidersSection vazio).*
5. **"Minha lista" com `?page=99` ou com falha do TMDB em um item** → lista vazia amigável sem erro; o item com falha mostra aviso e os demais renderizam. *Testes: Task 12, `user-data.test.ts` (página além do fim); Task 14, `load-availability.test.ts`.*

---

## Estrutura de arquivos

```
.github/workflows/ci.yml
.env.example
vitest.config.mts, vitest.setup.ts, vitest.db.config.mts, playwright.config.ts
test/empty.ts                              stub de 'server-only' para testes
supabase/config.toml, supabase/migrations/20260929120000_user_tables.sql
tests/db/{setup,helpers}.ts, tests/db/{rls,user-data}.test.ts
e2e/{global-setup,test-user}.ts, e2e/{catalog,search,my-list}.spec.ts
src/
  proxy.ts                                 renova sessão Supabase + protege rotas
  app/
    layout.tsx, page.tsx (catálogo), loading.tsx, error.tsx, not-found.tsx
    busca/{page,loading}.tsx
    filme/[id]/{page,loading,not-found}.tsx
    minha-lista/page.tsx, perfil/page.tsx, login/page.tsx
    auth/callback/route.ts, auth/signout/route.ts
  components/
    ui/*                                   gerados pelo shadcn
    site-header.tsx, site-footer.tsx, user-menu.tsx
    movie-card.tsx, movie-grid.tsx, movie-grid-skeleton.tsx, pagination.tsx
    filter-bar.tsx, user-providers-chip.tsx
    watch-providers-section.tsx, list-buttons.tsx
    user-movie-item.tsx, provider-picker.tsx, login-form.tsx
  lib/
    env.ts, format.ts, movie-id.ts
    filters/catalog-filters.ts             filtros <-> query string (puro)
    search/normalize-query.ts              (puro)
    catalog/resolve-providers.ts, catalog/provider-options.ts, catalog/load-availability.ts
    tmdb/client.ts, types.ts, schemas.ts, mappers.ts, images.ts, movies.ts, catalog-meta.ts
    supabase/config.ts, server.ts, client.ts, proxy.ts, database.types.ts
    auth/safe-next.ts, error-messages.ts, protected-routes.ts, get-current-user.ts
    user-data/schemas.ts, repository.ts, server.ts, actions.ts
  test/msw-server.ts, test/fixtures/tmdb.ts
```

Testes unitários ficam ao lado do arquivo (`*.test.ts(x)`).

---

### Task 1: Scaffold do projeto e ferramentas

**Files:**
- Create: projeto Next.js (via `create-next-app`), `vitest.config.mts`, `vitest.setup.ts`, `test/empty.ts`, `src/test/msw-server.ts`, `src/lib/env.ts`, `src/lib/env.test.ts`, `.prettierrc`, `.prettierignore`, `.env.example`, `.github/workflows/ci.yml`
- Modify: `eslint.config.mjs`, `package.json` (scripts), `.gitignore`

**Interfaces:**
- Produces: `requireEnv(name: string): string` (lança `Error` com o nome da variável se ausente/vazia — **uso apenas no servidor**); `server` (MSW `setupServer()`) em `@/test/msw-server`; scripts `lint`, `typecheck`, `test`, `test:db`, `test:e2e`, `format`.

- [ ] **Step 1: Gerar o app em pasta temporária e mover para a raiz** (o `create-next-app` recusa pastas com `docs/`)

```bash
cd /c/Users/User/Documents/projeto-claud-cod
npx create-next-app@latest .tmp-next --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
rm -rf .tmp-next/.git
shopt -s dotglob && mv .tmp-next/* . && rmdir .tmp-next
npx next --version
```
Expected: versão `16.x` ou superior. Se for menor, pare e avise (o plano assume `src/proxy.ts`).

- [ ] **Step 2: Instalar dependências**

```bash
npm install zod @supabase/supabase-js @supabase/ssr server-only
npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event msw prettier eslint-config-prettier @playwright/test supabase
```

- [ ] **Step 3: Configurar Vitest**

`vitest.config.mts`:
```ts
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      'server-only': fileURLToPath(new URL('./test/empty.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    env: { TMDB_READ_TOKEN: 'test-token' },
  },
});
```

`vitest.setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './src/test/msw-server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());
```

`test/empty.ts`:
```ts
export {};
```

`src/test/msw-server.ts`:
```ts
import { setupServer } from 'msw/node';

export const server = setupServer();
```

- [ ] **Step 4: ESLint + Prettier**

Substitua `eslint.config.mjs` por:
```js
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
    'src/lib/supabase/database.types.ts',
  ]),
]);
```

`.prettierrc`:
```json
{ "singleQuote": true, "semi": true, "printWidth": 100, "trailingComma": "all" }
```

`.prettierignore`:
```
.next
node_modules
src/lib/supabase/database.types.ts
supabase/.temp
```

- [ ] **Step 5: Scripts do package.json**

```bash
npm pkg set scripts.lint="eslint ."
npm pkg set scripts.typecheck="tsc --noEmit"
npm pkg set scripts.format="prettier --write ."
npm pkg set scripts.test="vitest run"
npm pkg set scripts.test:watch="vitest"
npm pkg set scripts.test:db="vitest run --config vitest.db.config.mts"
npm pkg set scripts.test:e2e="playwright test"
```

- [ ] **Step 6: Escrever o teste que falha para `requireEnv`**

`src/lib/env.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { requireEnv } from './env';

describe('requireEnv', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('retorna o valor quando a variável existe', () => {
    vi.stubEnv('EXEMPLO_TESTE', 'abc');
    expect(requireEnv('EXEMPLO_TESTE')).toBe('abc');
  });

  it('lança erro citando o nome quando a variável está vazia', () => {
    vi.stubEnv('EXEMPLO_TESTE', '');
    expect(() => requireEnv('EXEMPLO_TESTE')).toThrow('EXEMPLO_TESTE');
  });
});
```

- [ ] **Step 7: Rodar e ver falhar**

Run: `npm test -- src/lib/env.test.ts`
Expected: FAIL — `Failed to resolve import "./env"`.

- [ ] **Step 8: Implementar**

`src/lib/env.ts`:
```ts
/**
 * Lê uma variável de ambiente obrigatória. Use apenas no servidor:
 * no navegador, só `process.env.NEXT_PUBLIC_*` escrito literalmente é embutido.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${name}`);
  }
  return value;
}
```

- [ ] **Step 9: Rodar e ver passar**

Run: `npm test -- src/lib/env.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 10: Variáveis de ambiente de exemplo e .gitignore**

`.env.example`:
```
# Read Access Token (v4) em https://www.themoviedb.org/settings/api
TMDB_READ_TOKEN=
# Local: valores de `npx supabase status` (API URL e anon/publishable key)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Acrescente ao final do `.gitignore`:
```
!.env.example
/playwright-report
/test-results
```

- [ ] **Step 11: CI**

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
```

- [ ] **Step 12: Verificar tudo**

Run: `npm run lint && npm run typecheck && npm test`
Expected: sem erros; 2 testes passando.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js com Vitest, MSW, ESLint, Prettier e CI" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Filtros do catálogo (URL ↔ objeto)

**Files:**
- Create: `src/lib/filters/catalog-filters.ts`
- Test: `src/lib/filters/catalog-filters.test.ts`

**Interfaces:**
- Produces:
  - `SORT_OPTIONS`, `type SortOption = 'popularity.desc' | 'vote_average.desc' | 'primary_release_date.desc'`
  - `MAX_PAGE = 500`, `MIN_YEAR = 1900`
  - `type ProviderSelection = number[] | 'all' | null` — `null` = não especificado (usa padrão do usuário/top 15); `'all'` = explicitamente todos (top 15, ignora preferências); `number[]` = ids escolhidos
  - `interface CatalogFilters { providers: ProviderSelection; genre: number | null; year: number | null; minRating: number | null; sort: SortOption; hideWatched: boolean; page: number }`
  - `DEFAULT_FILTERS: CatalogFilters`
  - `type RawSearchParams = Record<string, string | string[] | undefined>`
  - `parseCatalogFilters(params: RawSearchParams, now?: Date): CatalogFilters`
  - `parsePageParam(value: string | string[] | undefined): number` (1..500)
  - `serializeCatalogFilters(filters: CatalogFilters): string` (sem `?`, omite padrões)
  - `catalogHref(filters: CatalogFilters): string` (`/` ou `/?...`)

- [ ] **Step 1: Escrever os testes que falham**

`src/lib/filters/catalog-filters.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTERS,
  catalogHref,
  parseCatalogFilters,
  parsePageParam,
  serializeCatalogFilters,
} from './catalog-filters';

const NOW = new Date('2026-09-29T12:00:00Z');

describe('parseCatalogFilters', () => {
  it('retorna os padrões para URL vazia', () => {
    expect(parseCatalogFilters({}, NOW)).toEqual(DEFAULT_FILTERS);
  });

  it('lê todos os filtros válidos', () => {
    expect(
      parseCatalogFilters(
        {
          providers: '119,8',
          genre: '28',
          year: '2024',
          minRating: '7',
          sort: 'vote_average.desc',
          hideWatched: '1',
          page: '3',
        },
        NOW,
      ),
    ).toEqual({
      providers: [8, 119],
      genre: 28,
      year: 2024,
      minRating: 7,
      sort: 'vote_average.desc',
      hideWatched: true,
      page: 3,
    });
  });

  it('entende providers=all', () => {
    expect(parseCatalogFilters({ providers: 'all' }, NOW).providers).toBe('all');
  });

  it('descarta ids de provedor inválidos e duplicados', () => {
    expect(parseCatalogFilters({ providers: '8,abc,8,-3,,119' }, NOW).providers).toEqual([8, 119]);
    expect(parseCatalogFilters({ providers: 'abc' }, NOW).providers).toBeNull();
  });

  it('descarta valores inválidos', () => {
    const f = parseCatalogFilters(
      { genre: 'x', year: '1800', minRating: '11', sort: 'hack', hideWatched: 'true' },
      NOW,
    );
    expect(f.genre).toBeNull();
    expect(f.year).toBeNull();
    expect(f.minRating).toBeNull();
    expect(f.sort).toBe('popularity.desc');
    expect(f.hideWatched).toBe(false);
  });

  it('aceita até o ano que vem e recusa depois', () => {
    expect(parseCatalogFilters({ year: '2027' }, NOW).year).toBe(2027);
    expect(parseCatalogFilters({ year: '2028' }, NOW).year).toBeNull();
  });

  it('usa o primeiro valor quando o parâmetro se repete', () => {
    expect(parseCatalogFilters({ genre: ['12', '28'] }, NOW).genre).toBe(12);
  });
});

describe('parsePageParam', () => {
  it('limita a página entre 1 e 500', () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam('0')).toBe(1);
    expect(parsePageParam('abc')).toBe(1);
    expect(parsePageParam('2.5')).toBe(1);
    expect(parsePageParam('42')).toBe(42);
    expect(parsePageParam('9999')).toBe(500);
  });
});

describe('serializeCatalogFilters', () => {
  it('omite valores padrão', () => {
    expect(serializeCatalogFilters(DEFAULT_FILTERS)).toBe('');
    expect(catalogHref(DEFAULT_FILTERS)).toBe('/');
  });

  it('serializa todos os campos e faz ida e volta', () => {
    const filters = {
      providers: [8, 119],
      genre: 28,
      year: 2024,
      minRating: 7,
      sort: 'primary_release_date.desc' as const,
      hideWatched: true,
      page: 2,
    };
    const qs = serializeCatalogFilters(filters);
    expect(qs).toBe(
      'providers=8%2C119&genre=28&year=2024&minRating=7&sort=primary_release_date.desc&hideWatched=1&page=2',
    );
    expect(parseCatalogFilters(Object.fromEntries(new URLSearchParams(qs)), NOW)).toEqual(filters);
  });

  it('serializa providers=all', () => {
    expect(catalogHref({ ...DEFAULT_FILTERS, providers: 'all' })).toBe('/?providers=all');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/lib/filters`
Expected: FAIL — `Failed to resolve import "./catalog-filters"`.

- [ ] **Step 3: Implementar**

`src/lib/filters/catalog-filters.ts`:
```ts
export const SORT_OPTIONS = [
  'popularity.desc',
  'vote_average.desc',
  'primary_release_date.desc',
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const MAX_PAGE = 500;
export const MIN_YEAR = 1900;

/** null = não especificado; 'all' = todos explicitamente; number[] = ids escolhidos. */
export type ProviderSelection = number[] | 'all' | null;

export interface CatalogFilters {
  providers: ProviderSelection;
  genre: number | null;
  year: number | null;
  minRating: number | null;
  sort: SortOption;
  hideWatched: boolean;
  page: number;
}

export const DEFAULT_FILTERS: CatalogFilters = {
  providers: null,
  genre: null,
  year: null,
  minRating: null,
  sort: 'popularity.desc',
  hideWatched: false,
  page: 1,
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function parseProviders(value: string | undefined): ProviderSelection {
  if (value === undefined) return null;
  if (value === 'all') return 'all';
  const ids = new Set<number>();
  for (const part of value.split(',')) {
    const id = parsePositiveInt(part.trim());
    if (id !== null) ids.add(id);
  }
  return ids.size > 0 ? [...ids].sort((a, b) => a - b) : null;
}

function parseYear(value: string | undefined, now: Date): number | null {
  const year = parsePositiveInt(value);
  return year !== null && year >= MIN_YEAR && year <= now.getFullYear() + 1 ? year : null;
}

function parseMinRating(value: string | undefined): number | null {
  const rating = parsePositiveInt(value);
  return rating !== null && rating <= 9 ? rating : null;
}

function parseSort(value: string | undefined): SortOption {
  return (SORT_OPTIONS as readonly string[]).includes(value ?? '')
    ? (value as SortOption)
    : DEFAULT_FILTERS.sort;
}

export function parsePageParam(value: string | string[] | undefined): number {
  const page = parsePositiveInt(first(value));
  return page === null ? 1 : Math.min(page, MAX_PAGE);
}

export function parseCatalogFilters(params: RawSearchParams, now: Date = new Date()): CatalogFilters {
  return {
    providers: parseProviders(first(params.providers)),
    genre: parsePositiveInt(first(params.genre)),
    year: parseYear(first(params.year), now),
    minRating: parseMinRating(first(params.minRating)),
    sort: parseSort(first(params.sort)),
    hideWatched: first(params.hideWatched) === '1',
    page: parsePageParam(params.page),
  };
}

export function serializeCatalogFilters(filters: CatalogFilters): string {
  const params = new URLSearchParams();
  if (filters.providers === 'all') params.set('providers', 'all');
  else if (filters.providers && filters.providers.length > 0) {
    params.set('providers', filters.providers.join(','));
  }
  if (filters.genre !== null) params.set('genre', String(filters.genre));
  if (filters.year !== null) params.set('year', String(filters.year));
  if (filters.minRating !== null) params.set('minRating', String(filters.minRating));
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set('sort', filters.sort);
  if (filters.hideWatched) params.set('hideWatched', '1');
  if (filters.page > 1) params.set('page', String(filters.page));
  return params.toString();
}

export function catalogHref(filters: CatalogFilters): string {
  const qs = serializeCatalogFilters(filters);
  return qs ? `/?${qs}` : '/';
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/lib/filters`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/filters
git commit -m "feat: parse e serialização dos filtros do catálogo" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Cliente base do TMDB

**Files:**
- Create: `src/lib/tmdb/client.ts`
- Test: `src/lib/tmdb/client.test.ts`

**Interfaces:**
- Consumes: `requireEnv` (Task 1).
- Produces:
  - `TMDB_BASE_URL = 'https://api.themoviedb.org/3'`
  - `REVALIDATE = { list: 21600, search: 3600, details: 21600, meta: 86400 } as const`
  - `class TmdbError extends Error { status?: number }`, `class TmdbNotFoundError extends TmdbError`
  - `type QueryParams = Record<string, string | number | null | undefined>`
  - `tmdbFetch(path: string, options: { params?: QueryParams; revalidate: number }): Promise<unknown>` — adiciona `language=pt-BR`, omite parâmetros `null`/`undefined`/`''`, timeout 8 s, 1 retry em 429, `TmdbNotFoundError` em 404, `TmdbError` em outros erros/rede.

- [ ] **Step 1: Escrever os testes que falham**

`src/lib/tmdb/client.test.ts`:
```ts
// @vitest-environment node
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/msw-server';
import { TmdbError, TmdbNotFoundError, tmdbFetch } from './client';

const GENRES_URL = 'https://api.themoviedb.org/3/genre/movie/list';

describe('tmdbFetch', () => {
  it('envia o token, o idioma pt-BR e os parâmetros definidos', async () => {
    let captured: Request | undefined;
    server.use(
      http.get(GENRES_URL, ({ request }) => {
        captured = request;
        return HttpResponse.json({ ok: true });
      }),
    );

    await expect(
      tmdbFetch('/genre/movie/list', {
        revalidate: 60,
        params: { page: 2, genre: null, year: undefined, empty: '' },
      }),
    ).resolves.toEqual({ ok: true });

    const url = new URL(captured!.url);
    expect(captured!.headers.get('authorization')).toBe('Bearer test-token');
    expect(url.searchParams.get('language')).toBe('pt-BR');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.has('genre')).toBe(false);
    expect(url.searchParams.has('year')).toBe(false);
    expect(url.searchParams.has('empty')).toBe(false);
  });

  it('lança TmdbNotFoundError em 404', async () => {
    server.use(http.get(GENRES_URL, () => new HttpResponse(null, { status: 404 })));
    await expect(tmdbFetch('/genre/movie/list', { revalidate: 60 })).rejects.toBeInstanceOf(
      TmdbNotFoundError,
    );
  });

  it('lança TmdbError com o status em erros HTTP', async () => {
    server.use(http.get(GENRES_URL, () => new HttpResponse(null, { status: 500 })));
    await expect(tmdbFetch('/genre/movie/list', { revalidate: 60 })).rejects.toMatchObject({
      name: 'TmdbError',
      status: 500,
    });
  });

  it('tenta de novo uma vez após 429', async () => {
    let calls = 0;
    server.use(
      http.get(GENRES_URL, () => {
        calls += 1;
        return calls === 1
          ? new HttpResponse(null, { status: 429, headers: { 'Retry-After': '0' } })
          : HttpResponse.json({ ok: true });
      }),
    );
    await expect(tmdbFetch('/genre/movie/list', { revalidate: 60 })).resolves.toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it('desiste após o segundo 429', async () => {
    let calls = 0;
    server.use(
      http.get(GENRES_URL, () => {
        calls += 1;
        return new HttpResponse(null, { status: 429, headers: { 'Retry-After': '0' } });
      }),
    );
    await expect(tmdbFetch('/genre/movie/list', { revalidate: 60 })).rejects.toMatchObject({
      status: 429,
    });
    expect(calls).toBe(2);
  });

  it('converte falha de rede em TmdbError', async () => {
    server.use(http.get(GENRES_URL, () => HttpResponse.error()));
    await expect(tmdbFetch('/genre/movie/list', { revalidate: 60 })).rejects.toBeInstanceOf(
      TmdbError,
    );
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/lib/tmdb/client.test.ts`
Expected: FAIL — `Failed to resolve import "./client"`.

- [ ] **Step 3: Implementar**

`src/lib/tmdb/client.ts`:
```ts
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/lib/tmdb/client.test.ts`
Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tmdb
git commit -m "feat: cliente base do TMDB com timeout, retry em 429 e erros tipados" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: TMDB — tipos, catálogo, busca, gêneros e provedores

**Files:**
- Create: `src/lib/tmdb/types.ts`, `src/lib/tmdb/schemas.ts`, `src/lib/tmdb/mappers.ts`, `src/lib/tmdb/images.ts`, `src/lib/tmdb/movies.ts`, `src/lib/tmdb/catalog-meta.ts`, `src/test/fixtures/tmdb.ts`
- Test: `src/lib/tmdb/mappers.test.ts`, `src/lib/tmdb/movies.test.ts`, `src/lib/tmdb/catalog-meta.test.ts`, `src/lib/tmdb/images.test.ts`

**Interfaces:**
- Consumes: `tmdbFetch`, `REVALIDATE`, `TmdbError` (Task 3); `MAX_PAGE`, `SortOption` (Task 2).
- Produces (tipos do app, `src/lib/tmdb/types.ts`):
  - `Movie { id: number; title: string; posterPath: string | null; releaseYear: number | null; voteAverage: number; overview: string }`
  - `Paginated<T> { page: number; totalPages: number; totalResults: number; results: T[] }`
  - `Genre { id: number; name: string }`
  - `Provider { id: number; name: string; logoPath: string | null; displayPriority: number }`
  - `WatchProviders { link: string | null; flatrate: Provider[]; rent: Provider[]; buy: Provider[] }`
  - `CastMember { id: number; name: string; character: string | null; profilePath: string | null }`
  - `MovieDetails extends Movie { runtime: number | null; tagline: string | null; backdropPath: string | null; genres: Genre[]; cast: CastMember[]; trailerKey: string | null; watchProviders: WatchProviders }`
- Produces (funções):
  - `mappers.ts`: `toMovie(raw)`, `toProvider(raw)`, `sortByPriority(providers)`, `parseItems(items, schema, map, context)`, `parseOrThrow(schema, raw, context)`, `toPaginated(raw, schema, map, context)`
  - `images.ts`: `type ImageSize = 'w45' | 'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'w1280'`; `tmdbImageUrl(path: string | null, size: ImageSize): string | null`
  - `movies.ts`: `interface DiscoverInput { providerIds: number[]; genre: number | null; year: number | null; minRating: number | null; sort: SortOption; page: number }`; `discoverMovies(input): Promise<Paginated<Movie>>`; `searchMovies(query: string, page: number): Promise<Paginated<Movie>>`; constantes `MONETIZATION_TYPES = 'flatrate|free|ads'`, `MIN_VOTE_COUNT = 50`
  - `catalog-meta.ts`: `DEFAULT_PROVIDER_COUNT = 15`; `getGenres(): Promise<Genre[]>`; `getBrProviders(): Promise<Provider[]>` (ordenados por prioridade BR); `getDefaultProviders(): Promise<Provider[]>` (15 primeiros)

- [ ] **Step 1: Criar tipos e fixtures**

`src/lib/tmdb/types.ts`:
```ts
export interface Movie {
  id: number;
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
  voteAverage: number;
  overview: string;
}

export interface Paginated<T> {
  page: number;
  totalPages: number;
  totalResults: number;
  results: T[];
}

export interface Genre {
  id: number;
  name: string;
}

export interface Provider {
  id: number;
  name: string;
  logoPath: string | null;
  displayPriority: number;
}

/** `flatrate` junta assinatura, grátis e com anúncios. */
export interface WatchProviders {
  link: string | null;
  flatrate: Provider[];
  rent: Provider[];
  buy: Provider[];
}

export interface CastMember {
  id: number;
  name: string;
  character: string | null;
  profilePath: string | null;
}

export interface MovieDetails extends Movie {
  runtime: number | null;
  tagline: string | null;
  backdropPath: string | null;
  genres: Genre[];
  cast: CastMember[];
  trailerKey: string | null;
  watchProviders: WatchProviders;
}
```

`src/test/fixtures/tmdb.ts`:
```ts
export const rawMatrix = {
  id: 603,
  title: 'Matrix',
  poster_path: '/matrix.jpg',
  release_date: '1999-03-30',
  vote_average: 8.2,
  overview: 'Um hacker descobre a verdade.',
};

export const rawNoPoster = {
  id: 1,
  title: 'Sem Pôster',
  poster_path: null,
  release_date: '',
  vote_average: 0,
  overview: '',
};

export function rawPage(results: unknown[], overrides: Record<string, unknown> = {}) {
  return { page: 1, total_pages: 1, total_results: results.length, results, ...overrides };
}

export const rawProvidersList = {
  results: [
    { provider_id: 119, provider_name: 'Amazon Prime Video', logo_path: '/prime.jpg', display_priority: 1, display_priorities: { BR: 2 } },
    { provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg', display_priority: 5, display_priorities: { BR: 1 } },
    { provider_id: 337, provider_name: 'Disney Plus', logo_path: '/disney.jpg', display_priority: 3, display_priorities: { BR: 3 } },
  ],
};

const netflix = { provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg', display_priority: 1 };
const appleTv = { provider_id: 2, provider_name: 'Apple TV', logo_path: '/apple.jpg', display_priority: 4 };

export const rawMatrixWatchProviders = {
  results: {
    BR: {
      link: 'https://www.themoviedb.org/movie/603/watch?locale=BR',
      flatrate: [netflix],
      ads: [netflix, { provider_id: 999, provider_name: 'Plataforma Grátis', logo_path: null, display_priority: 20 }],
      rent: [appleTv],
      buy: [appleTv],
    },
    US: { flatrate: [{ provider_id: 15, provider_name: 'Hulu', logo_path: null, display_priority: 1 }] },
  },
};

export const rawMatrixDetails = {
  ...rawMatrix,
  runtime: 136,
  tagline: 'Bem-vindo ao mundo real.',
  backdrop_path: '/backdrop.jpg',
  genres: [
    { id: 28, name: 'Ação' },
    { id: 878, name: 'Ficção científica' },
  ],
  credits: {
    cast: Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      name: `Ator ${i + 1}`,
      character: `Personagem ${i + 1}`,
      profile_path: null,
    })),
  },
  videos: {
    results: [
      { key: 'en-trailer', site: 'YouTube', type: 'Trailer', iso_639_1: 'en' },
      { key: 'pt-teaser', site: 'YouTube', type: 'Teaser', iso_639_1: 'pt' },
      { key: 'pt-trailer', site: 'YouTube', type: 'Trailer', iso_639_1: 'pt' },
    ],
  },
  'watch/providers': rawMatrixWatchProviders,
};
```
(`rawMatrixDetails` e `rawMatrixWatchProviders` são usados na Task 5.)

- [ ] **Step 2: Escrever os testes que falham**

`src/lib/tmdb/images.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { tmdbImageUrl } from './images';

describe('tmdbImageUrl', () => {
  it('monta a URL da imagem no tamanho pedido', () => {
    expect(tmdbImageUrl('/matrix.jpg', 'w342')).toBe('https://image.tmdb.org/t/p/w342/matrix.jpg');
  });
  it('retorna null sem caminho', () => {
    expect(tmdbImageUrl(null, 'w342')).toBeNull();
  });
});
```

`src/lib/tmdb/mappers.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { rawMatrix, rawNoPoster, rawPage } from '@/test/fixtures/tmdb';
import { parseItems, toMovie, toPaginated, toProvider } from './mappers';
import { rawMovieSchema } from './schemas';

describe('toMovie', () => {
  it('converte o formato do TMDB', () => {
    expect(toMovie(rawMatrix)).toEqual({
      id: 603,
      title: 'Matrix',
      posterPath: '/matrix.jpg',
      releaseYear: 1999,
      voteAverage: 8.2,
      overview: 'Um hacker descobre a verdade.',
    });
  });

  it('usa null para pôster e ano ausentes', () => {
    const movie = toMovie(rawNoPoster);
    expect(movie.posterPath).toBeNull();
    expect(movie.releaseYear).toBeNull();
  });
});

describe('toProvider', () => {
  it('prefere a prioridade do Brasil', () => {
    expect(
      toProvider({ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg', display_priority: 5, display_priorities: { BR: 1 } }),
    ).toEqual({ id: 8, name: 'Netflix', logoPath: '/n.jpg', displayPriority: 1 });
  });
});

describe('parseItems', () => {
  afterEach(() => vi.restoreAllMocks());

  it('descarta itens fora do schema e registra no log', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const movies = parseItems([rawMatrix, { id: 'x' }], rawMovieSchema, toMovie, 'teste');
    expect(movies.map((m) => m.id)).toEqual([603]);
    expect(log).toHaveBeenCalledOnce();
  });
});

describe('toPaginated', () => {
  it('limita totalPages a 500', () => {
    const page = toPaginated(rawPage([rawMatrix], { total_pages: 900 }), rawMovieSchema, toMovie, 'teste');
    expect(page.totalPages).toBe(500);
    expect(page.results).toHaveLength(1);
  });

  it('lança TmdbError se a página não tiver o formato esperado', () => {
    expect(() => toPaginated({ foo: 1 }, rawMovieSchema, toMovie, 'teste')).toThrow(
      'Resposta inesperada do TMDB em teste',
    );
  });
});
```

`src/lib/tmdb/movies.test.ts`:
```ts
// @vitest-environment node
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { rawMatrix, rawPage } from '@/test/fixtures/tmdb';
import { server } from '@/test/msw-server';
import { discoverMovies, searchMovies } from './movies';

const BASE = 'https://api.themoviedb.org/3';

describe('discoverMovies', () => {
  it('monta os parâmetros do discover e converte o resultado', async () => {
    let url: URL | undefined;
    server.use(
      http.get(`${BASE}/discover/movie`, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json(rawPage([rawMatrix], { total_pages: 900 }));
      }),
    );

    const result = await discoverMovies({
      providerIds: [8, 119],
      genre: 28,
      year: null,
      minRating: 7,
      sort: 'vote_average.desc',
      page: 2,
    });

    const p = url!.searchParams;
    expect(p.get('watch_region')).toBe('BR');
    expect(p.get('with_watch_providers')).toBe('8|119');
    expect(p.get('with_watch_monetization_types')).toBe('flatrate|free|ads');
    expect(p.get('with_genres')).toBe('28');
    expect(p.has('primary_release_year')).toBe(false);
    expect(p.get('vote_average.gte')).toBe('7');
    expect(p.get('vote_count.gte')).toBe('50');
    expect(p.get('sort_by')).toBe('vote_average.desc');
    expect(p.get('page')).toBe('2');
    expect(p.get('language')).toBe('pt-BR');
    expect(result.totalPages).toBe(500);
    expect(result.results[0]).toMatchObject({ id: 603, title: 'Matrix', releaseYear: 1999 });
  });
});

describe('searchMovies', () => {
  it('envia o texto com acentos e & intactos', async () => {
    let url: URL | undefined;
    server.use(
      http.get(`${BASE}/search/movie`, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json(rawPage([rawMatrix]));
      }),
    );

    const result = await searchMovies('Amor & Morte à Tarde', 3);

    expect(url!.searchParams.get('query')).toBe('Amor & Morte à Tarde');
    expect(url!.searchParams.get('page')).toBe('3');
    expect(url!.searchParams.get('region')).toBe('BR');
    expect(result.results).toHaveLength(1);
  });
});
```

`src/lib/tmdb/catalog-meta.test.ts`:
```ts
// @vitest-environment node
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { rawProvidersList } from '@/test/fixtures/tmdb';
import { server } from '@/test/msw-server';
import { getBrProviders, getDefaultProviders, getGenres } from './catalog-meta';

const BASE = 'https://api.themoviedb.org/3';

describe('getGenres', () => {
  it('retorna a lista de gêneros', async () => {
    server.use(
      http.get(`${BASE}/genre/movie/list`, () =>
        HttpResponse.json({ genres: [{ id: 28, name: 'Ação' }] }),
      ),
    );
    await expect(getGenres()).resolves.toEqual([{ id: 28, name: 'Ação' }]);
  });
});

describe('provedores', () => {
  it('pede os provedores do BR e ordena pela prioridade do Brasil', async () => {
    let url: URL | undefined;
    server.use(
      http.get(`${BASE}/watch/providers/movie`, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json(rawProvidersList);
      }),
    );
    const providers = await getBrProviders();
    expect(url!.searchParams.get('watch_region')).toBe('BR');
    expect(providers.map((p) => p.name)).toEqual(['Netflix', 'Amazon Prime Video', 'Disney Plus']);
  });

  it('getDefaultProviders devolve no máximo 15', async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      provider_id: i + 1,
      provider_name: `P${i + 1}`,
      logo_path: null,
      display_priority: i,
    }));
    server.use(http.get(`${BASE}/watch/providers/movie`, () => HttpResponse.json({ results: many })));
    const providers = await getDefaultProviders();
    expect(providers).toHaveLength(15);
    expect(providers[0].id).toBe(1);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test -- src/lib/tmdb`
Expected: FAIL — imports `./images`, `./mappers`, `./schemas`, `./movies`, `./catalog-meta` não resolvidos.

- [ ] **Step 4: Implementar schemas, mappers e imagens**

`src/lib/tmdb/schemas.ts`:
```ts
import { z } from 'zod';

export const rawMovieSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  poster_path: z.string().nullable().optional(),
  release_date: z.string().optional(),
  vote_average: z.number().optional(),
  overview: z.string().optional(),
});
export type RawMovie = z.infer<typeof rawMovieSchema>;

export const rawPageSchema = z.object({
  page: z.number().int(),
  total_pages: z.number().int(),
  total_results: z.number().int(),
  results: z.array(z.unknown()),
});

export const rawGenresSchema = z.object({
  genres: z.array(z.object({ id: z.number().int(), name: z.string() })),
});

export const rawProviderSchema = z.object({
  provider_id: z.number().int(),
  provider_name: z.string(),
  logo_path: z.string().nullable().optional(),
  display_priority: z.number().optional(),
  display_priorities: z.record(z.string(), z.number()).optional(),
});
export type RawProvider = z.infer<typeof rawProviderSchema>;

export const rawProvidersListSchema = z.object({ results: z.array(z.unknown()) });
```

`src/lib/tmdb/mappers.ts`:
```ts
import type { z } from 'zod';
import { MAX_PAGE } from '@/lib/filters/catalog-filters';
import { TmdbError } from './client';
import { rawPageSchema, type RawMovie, type RawProvider } from './schemas';
import type { Movie, Paginated, Provider } from './types';

export function toMovie(raw: RawMovie): Movie {
  const year = raw.release_date && /^\d{4}/.test(raw.release_date)
    ? Number(raw.release_date.slice(0, 4))
    : null;
  return {
    id: raw.id,
    title: raw.title,
    posterPath: raw.poster_path ?? null,
    releaseYear: year,
    voteAverage: raw.vote_average ?? 0,
    overview: raw.overview ?? '',
  };
}

export function toProvider(raw: RawProvider): Provider {
  return {
    id: raw.provider_id,
    name: raw.provider_name,
    logoPath: raw.logo_path ?? null,
    displayPriority: raw.display_priorities?.BR ?? raw.display_priority ?? Number.MAX_SAFE_INTEGER,
  };
}

export function sortByPriority(providers: Provider[]): Provider[] {
  return [...providers].sort(
    (a, b) => a.displayPriority - b.displayPriority || a.name.localeCompare(b.name, 'pt-BR'),
  );
}

/** Converte cada item; itens fora do schema são descartados e registrados no log. */
export function parseItems<R, T>(
  items: unknown[],
  schema: z.ZodType<R>,
  map: (raw: R) => T,
  context: string,
): T[] {
  const out: T[] = [];
  for (const item of items) {
    const parsed = schema.safeParse(item);
    if (parsed.success) out.push(map(parsed.data));
    else console.error(`[tmdb] item inválido descartado em ${context}`, parsed.error.issues);
  }
  return out;
}

export function parseOrThrow<T>(schema: z.ZodType<T>, raw: unknown, context: string): T {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    console.error(`[tmdb] resposta inválida em ${context}`, parsed.error.issues);
    throw new TmdbError(`Resposta inesperada do TMDB em ${context}`);
  }
  return parsed.data;
}

export function toPaginated<R, T>(
  raw: unknown,
  schema: z.ZodType<R>,
  map: (raw: R) => T,
  context: string,
): Paginated<T> {
  const page = parseOrThrow(rawPageSchema, raw, context);
  return {
    page: page.page,
    totalPages: Math.min(page.total_pages, MAX_PAGE),
    totalResults: page.total_results,
    results: parseItems(page.results, schema, map, context),
  };
}
```

`src/lib/tmdb/images.ts`:
```ts
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export type ImageSize = 'w45' | 'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'w1280';

export function tmdbImageUrl(path: string | null, size: ImageSize): string | null {
  return path ? `${IMAGE_BASE_URL}/${size}${path}` : null;
}
```

- [ ] **Step 5: Implementar endpoints**

`src/lib/tmdb/movies.ts`:
```ts
import 'server-only';
import type { SortOption } from '@/lib/filters/catalog-filters';
import { REVALIDATE, tmdbFetch } from './client';
import { toMovie, toPaginated } from './mappers';
import { rawMovieSchema } from './schemas';
import type { Movie, Paginated } from './types';

export const MONETIZATION_TYPES = 'flatrate|free|ads';
export const MIN_VOTE_COUNT = 50;

export interface DiscoverInput {
  providerIds: number[];
  genre: number | null;
  year: number | null;
  minRating: number | null;
  sort: SortOption;
  page: number;
}

export async function discoverMovies(input: DiscoverInput): Promise<Paginated<Movie>> {
  const raw = await tmdbFetch('/discover/movie', {
    revalidate: REVALIDATE.list,
    params: {
      watch_region: 'BR',
      with_watch_providers: input.providerIds.join('|'),
      with_watch_monetization_types: MONETIZATION_TYPES,
      with_genres: input.genre,
      primary_release_year: input.year,
      'vote_average.gte': input.minRating,
      'vote_count.gte': MIN_VOTE_COUNT,
      sort_by: input.sort,
      include_adult: 'false',
      page: input.page,
    },
  });
  return toPaginated(raw, rawMovieSchema, toMovie, 'discover/movie');
}

export async function searchMovies(query: string, page: number): Promise<Paginated<Movie>> {
  const raw = await tmdbFetch('/search/movie', {
    revalidate: REVALIDATE.search,
    params: { query, region: 'BR', include_adult: 'false', page },
  });
  return toPaginated(raw, rawMovieSchema, toMovie, 'search/movie');
}
```

`src/lib/tmdb/catalog-meta.ts`:
```ts
import 'server-only';
import { REVALIDATE, tmdbFetch } from './client';
import { parseItems, parseOrThrow, sortByPriority, toProvider } from './mappers';
import { rawGenresSchema, rawProviderSchema, rawProvidersListSchema } from './schemas';
import type { Genre, Provider } from './types';

export const DEFAULT_PROVIDER_COUNT = 15;

export async function getGenres(): Promise<Genre[]> {
  const raw = await tmdbFetch('/genre/movie/list', { revalidate: REVALIDATE.meta });
  return parseOrThrow(rawGenresSchema, raw, 'genre/movie/list').genres;
}

export async function getBrProviders(): Promise<Provider[]> {
  const raw = await tmdbFetch('/watch/providers/movie', {
    revalidate: REVALIDATE.meta,
    params: { watch_region: 'BR' },
  });
  const list = parseOrThrow(rawProvidersListSchema, raw, 'watch/providers/movie');
  return sortByPriority(parseItems(list.results, rawProviderSchema, toProvider, 'watch/providers/movie'));
}

export async function getDefaultProviders(): Promise<Provider[]> {
  return (await getBrProviders()).slice(0, DEFAULT_PROVIDER_COUNT);
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npm test -- src/lib/tmdb && npm run typecheck`
Expected: PASS, sem erros de tipo.

- [ ] **Step 7: Commit**

```bash
git add src/lib/tmdb src/test/fixtures
git commit -m "feat: TMDB discover, busca, gêneros e provedores do Brasil" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: TMDB — detalhes do filme e disponibilidade

**Files:**
- Modify: `src/lib/tmdb/schemas.ts`, `src/lib/tmdb/mappers.ts`, `src/lib/tmdb/movies.ts`
- Test: `src/lib/tmdb/details.test.ts`

**Interfaces:**
- Consumes: Task 3 e Task 4; fixtures `rawMatrixDetails`, `rawMatrixWatchProviders`.
- Produces:
  - `mappers.ts`: `toWatchProviders(raw: RawWatchProviders | undefined): WatchProviders` (só `BR`; `flatrate` = flatrate + free + ads sem duplicatas; listas ordenadas por prioridade); `pickTrailerKey(videos: RawVideo[]): string | null` (YouTube + Trailer, prefere `pt`); `toMovieDetails(raw: RawMovieDetails): MovieDetails` (elenco limitado a `MAX_CAST = 12`)
  - `movies.ts`: `getMovieDetails(id: number): Promise<MovieDetails>`; `getMovieWatchProviders(id: number): Promise<WatchProviders>`

- [ ] **Step 1: Escrever os testes que falham**

`src/lib/tmdb/details.test.ts`:
```ts
// @vitest-environment node
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { rawMatrixDetails, rawMatrixWatchProviders } from '@/test/fixtures/tmdb';
import { server } from '@/test/msw-server';
import { TmdbNotFoundError } from './client';
import { pickTrailerKey, toWatchProviders } from './mappers';
import { getMovieDetails, getMovieWatchProviders } from './movies';

const BASE = 'https://api.themoviedb.org/3';

describe('toWatchProviders', () => {
  it('usa só o Brasil e junta assinatura, grátis e anúncios sem duplicar', () => {
    const wp = toWatchProviders(rawMatrixWatchProviders);
    expect(wp.link).toBe('https://www.themoviedb.org/movie/603/watch?locale=BR');
    expect(wp.flatrate.map((p) => p.name)).toEqual(['Netflix', 'Plataforma Grátis']);
    expect(wp.rent.map((p) => p.name)).toEqual(['Apple TV']);
    expect(wp.buy.map((p) => p.name)).toEqual(['Apple TV']);
  });

  it('retorna listas vazias quando não há dados do Brasil', () => {
    expect(toWatchProviders({ results: { US: {} } })).toEqual({ link: null, flatrate: [], rent: [], buy: [] });
    expect(toWatchProviders(undefined)).toEqual({ link: null, flatrate: [], rent: [], buy: [] });
  });
});

describe('pickTrailerKey', () => {
  it('prefere trailer em português do YouTube', () => {
    expect(pickTrailerKey(rawMatrixDetails.videos.results)).toBe('pt-trailer');
  });
  it('cai para outro idioma e depois para null', () => {
    expect(pickTrailerKey([{ key: 'en', site: 'YouTube', type: 'Trailer', iso_639_1: 'en' }])).toBe('en');
    expect(pickTrailerKey([{ key: 'v', site: 'Vimeo', type: 'Trailer' }])).toBeNull();
  });
});

describe('getMovieDetails', () => {
  it('pede tudo em uma chamada e converte', async () => {
    let url: URL | undefined;
    server.use(
      http.get(`${BASE}/movie/603`, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json(rawMatrixDetails);
      }),
    );

    const movie = await getMovieDetails(603);

    expect(url!.searchParams.get('append_to_response')).toBe('credits,videos,watch/providers');
    expect(url!.searchParams.get('include_video_language')).toBe('pt,en');
    expect(movie).toMatchObject({
      id: 603,
      title: 'Matrix',
      runtime: 136,
      tagline: 'Bem-vindo ao mundo real.',
      trailerKey: 'pt-trailer',
      genres: [{ id: 28, name: 'Ação' }, { id: 878, name: 'Ficção científica' }],
    });
    expect(movie.cast).toHaveLength(12);
    expect(movie.cast[0]).toEqual({ id: 1, name: 'Ator 1', character: 'Personagem 1', profilePath: null });
    expect(movie.watchProviders.flatrate[0].name).toBe('Netflix');
  });

  it('lança TmdbNotFoundError para filme inexistente', async () => {
    server.use(http.get(`${BASE}/movie/999999`, () => new HttpResponse(null, { status: 404 })));
    await expect(getMovieDetails(999999)).rejects.toBeInstanceOf(TmdbNotFoundError);
  });
});

describe('getMovieWatchProviders', () => {
  it('retorna a disponibilidade no Brasil', async () => {
    server.use(http.get(`${BASE}/movie/603/watch/providers`, () => HttpResponse.json(rawMatrixWatchProviders)));
    const wp = await getMovieWatchProviders(603);
    expect(wp.flatrate.map((p) => p.id)).toEqual([8, 999]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/lib/tmdb/details.test.ts`
Expected: FAIL — `pickTrailerKey`/`toWatchProviders`/`getMovieDetails` não exportados.

- [ ] **Step 3: Acrescentar schemas**

Adicione ao final de `src/lib/tmdb/schemas.ts`:
```ts
const optionalItems = z.array(z.unknown()).optional();

export const rawRegionProvidersSchema = z.object({
  link: z.string().optional(),
  flatrate: optionalItems,
  free: optionalItems,
  ads: optionalItems,
  rent: optionalItems,
  buy: optionalItems,
});

export const rawWatchProvidersSchema = z.object({
  results: z.record(z.string(), z.unknown()).optional(),
});
export type RawWatchProviders = z.infer<typeof rawWatchProvidersSchema>;

export const rawCastSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  character: z.string().nullable().optional(),
  profile_path: z.string().nullable().optional(),
});
export type RawCast = z.infer<typeof rawCastSchema>;

export const rawVideoSchema = z.object({
  key: z.string(),
  site: z.string(),
  type: z.string(),
  iso_639_1: z.string().optional(),
});
export type RawVideo = z.infer<typeof rawVideoSchema>;

export const rawMovieDetailsSchema = rawMovieSchema.extend({
  runtime: z.number().nullable().optional(),
  tagline: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  genres: z.array(z.object({ id: z.number().int(), name: z.string() })).optional(),
  credits: z.object({ cast: z.array(z.unknown()) }).optional(),
  videos: z.object({ results: z.array(z.unknown()) }).optional(),
  'watch/providers': rawWatchProvidersSchema.optional(),
});
export type RawMovieDetails = z.infer<typeof rawMovieDetailsSchema>;
```

- [ ] **Step 4: Acrescentar mappers**

Em `src/lib/tmdb/mappers.ts`, atualize os imports:
```ts
import type { z } from 'zod';
import { MAX_PAGE } from '@/lib/filters/catalog-filters';
import { TmdbError } from './client';
import {
  rawCastSchema,
  rawPageSchema,
  rawProviderSchema,
  rawRegionProvidersSchema,
  rawVideoSchema,
  type RawCast,
  type RawMovie,
  type RawMovieDetails,
  type RawProvider,
  type RawVideo,
  type RawWatchProviders,
} from './schemas';
import type { CastMember, Movie, MovieDetails, Paginated, Provider, WatchProviders } from './types';
```
e adicione ao final:
```ts
export const MAX_CAST = 12;

const EMPTY_WATCH_PROVIDERS: WatchProviders = { link: null, flatrate: [], rent: [], buy: [] };

function dedupeById(providers: Provider[]): Provider[] {
  const seen = new Map<number, Provider>();
  for (const p of providers) if (!seen.has(p.id)) seen.set(p.id, p);
  return [...seen.values()];
}

export function toWatchProviders(raw: RawWatchProviders | undefined): WatchProviders {
  const br = rawRegionProvidersSchema.safeParse(raw?.results?.BR);
  if (!br.success) return EMPTY_WATCH_PROVIDERS;
  const list = (items: unknown[] | undefined) =>
    parseItems(items ?? [], rawProviderSchema, toProvider, 'watch/providers');
  return {
    link: br.data.link ?? null,
    flatrate: sortByPriority(dedupeById([...list(br.data.flatrate), ...list(br.data.free), ...list(br.data.ads)])),
    rent: sortByPriority(list(br.data.rent)),
    buy: sortByPriority(list(br.data.buy)),
  };
}

export function pickTrailerKey(videos: RawVideo[]): string | null {
  const trailers = videos.filter((v) => v.site === 'YouTube' && v.type === 'Trailer');
  return (trailers.find((v) => v.iso_639_1 === 'pt') ?? trailers[0])?.key ?? null;
}

function toCastMember(raw: RawCast): CastMember {
  return {
    id: raw.id,
    name: raw.name,
    character: raw.character || null,
    profilePath: raw.profile_path ?? null,
  };
}

export function toMovieDetails(raw: RawMovieDetails): MovieDetails {
  return {
    ...toMovie(raw),
    runtime: raw.runtime ?? null,
    tagline: raw.tagline || null,
    backdropPath: raw.backdrop_path ?? null,
    genres: raw.genres ?? [],
    cast: parseItems(raw.credits?.cast ?? [], rawCastSchema, toCastMember, 'credits').slice(0, MAX_CAST),
    trailerKey: pickTrailerKey(parseItems(raw.videos?.results ?? [], rawVideoSchema, (v) => v, 'videos')),
    watchProviders: toWatchProviders(raw['watch/providers']),
  };
}
```

- [ ] **Step 5: Acrescentar endpoints**

Em `src/lib/tmdb/movies.ts`, troque os imports por:
```ts
import 'server-only';
import type { SortOption } from '@/lib/filters/catalog-filters';
import { REVALIDATE, tmdbFetch } from './client';
import { parseOrThrow, toMovie, toMovieDetails, toPaginated, toWatchProviders } from './mappers';
import { rawMovieDetailsSchema, rawMovieSchema, rawWatchProvidersSchema } from './schemas';
import type { Movie, MovieDetails, Paginated, WatchProviders } from './types';
```
e adicione ao final:
```ts
export async function getMovieDetails(id: number): Promise<MovieDetails> {
  const raw = await tmdbFetch(`/movie/${id}`, {
    revalidate: REVALIDATE.details,
    params: {
      append_to_response: 'credits,videos,watch/providers',
      include_video_language: 'pt,en',
    },
  });
  return toMovieDetails(parseOrThrow(rawMovieDetailsSchema, raw, `movie/${id}`));
}

export async function getMovieWatchProviders(id: number): Promise<WatchProviders> {
  const raw = await tmdbFetch(`/movie/${id}/watch/providers`, { revalidate: REVALIDATE.details });
  return toWatchProviders(parseOrThrow(rawWatchProvidersSchema, raw, `movie/${id}/watch/providers`));
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npm test -- src/lib/tmdb && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/tmdb
git commit -m "feat: detalhes do filme e disponibilidade no Brasil via TMDB" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: UI base — shadcn, layout, cards, grade e paginação

**Files:**
- Create: `src/components/ui/*` (shadcn), `src/lib/format.ts`, `src/components/site-header.tsx`, `src/components/site-footer.tsx`, `src/components/movie-card.tsx`, `src/components/movie-grid.tsx`, `src/components/movie-grid-skeleton.tsx`, `src/components/pagination.tsx`
- Modify: `next.config.ts`, `src/app/layout.tsx`
- Test: `src/lib/format.test.ts`, `src/components/movie-card.test.tsx`, `src/components/movie-grid.test.tsx`, `src/components/pagination.test.tsx`, `src/components/site-footer.test.tsx`

**Interfaces:**
- Consumes: `Movie` (Task 4), `tmdbImageUrl` (Task 4).
- Produces:
  - `formatRating(value: number): string` (ex.: `8.24 → "8,2"`)
  - `<MovieCard movie={Movie} />`
  - `<MovieGrid movies={Movie[]} emptyMessage={string} emptyAction?={ReactNode} />` — `<ul aria-label="Filmes">`
  - `<MovieGridSkeleton count?={number} />`
  - `<Pagination page={number} totalPages={number} hrefForPage={(page: number) => string} />` (Server Component; não renderiza nada se `totalPages <= 1`)
  - `<SiteHeader userSlot?={ReactNode} />` com formulário GET para `/busca?q=`
  - `<SiteFooter />` com créditos TMDB/JustWatch
  - shadcn: `Button`, `buttonVariants`, `Input`, `Badge`, `Skeleton`, `Toaster` (sonner)

- [ ] **Step 1: Instalar shadcn/ui e componentes**

```bash
npx shadcn@latest init --defaults --yes
npx shadcn@latest add button input badge skeleton sonner --yes
```
Expected: `src/components/ui/{button,input,badge,skeleton,sonner}.tsx` e `src/lib/utils.ts` criados.

- [ ] **Step 2: Liberar imagens do TMDB**

`next.config.ts`:
```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'image.tmdb.org', pathname: '/t/p/**' }],
  },
};

export default nextConfig;
```

- [ ] **Step 3: Escrever os testes que falham**

`src/lib/format.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { formatRating } from './format';

describe('formatRating', () => {
  it('usa uma casa decimal com vírgula', () => {
    expect(formatRating(8.24)).toBe('8,2');
    expect(formatRating(7)).toBe('7,0');
  });
});
```

`src/components/movie-card.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MovieCard } from './movie-card';

const movie = { id: 603, title: 'Matrix', posterPath: '/matrix.jpg', releaseYear: 1999, voteAverage: 8.24, overview: '' };

describe('MovieCard', () => {
  it('liga para os detalhes e mostra pôster, ano e nota', () => {
    render(<MovieCard movie={movie} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/filme/603');
    expect(screen.getByAltText('Pôster de Matrix')).toBeInTheDocument();
    expect(screen.getByText('1999 · ★ 8,2')).toBeInTheDocument();
  });

  it('mostra placeholder sem pôster e traço sem ano', () => {
    render(<MovieCard movie={{ ...movie, posterPath: null, releaseYear: null }} />);
    expect(screen.getByText('Sem pôster')).toBeInTheDocument();
    expect(screen.getByText('— · ★ 8,2')).toBeInTheDocument();
  });
});
```

`src/components/movie-grid.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MovieGrid } from './movie-grid';

const movie = { id: 1, title: 'Filme', posterPath: null, releaseYear: 2020, voteAverage: 7, overview: '' };

describe('MovieGrid', () => {
  it('lista os filmes', () => {
    render(<MovieGrid movies={[movie, { ...movie, id: 2 }]} emptyMessage="Vazio" />);
    expect(screen.getByRole('list', { name: 'Filmes' }).children).toHaveLength(2);
  });

  it('mostra a mensagem e a ação quando não há filmes', () => {
    render(<MovieGrid movies={[]} emptyMessage="Nada aqui" emptyAction={<button>Limpar</button>} />);
    expect(screen.getByText('Nada aqui')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpar' })).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
```

`src/components/pagination.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Pagination } from './pagination';

const href = (p: number) => `/?page=${p}`;

describe('Pagination', () => {
  it('liga para as páginas vizinhas', () => {
    render(<Pagination page={2} totalPages={3} hrefForPage={href} />);
    expect(screen.getByRole('link', { name: 'Anterior' })).toHaveAttribute('href', '/?page=1');
    expect(screen.getByRole('link', { name: 'Próxima' })).toHaveAttribute('href', '/?page=3');
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
  });

  it('desativa Anterior na primeira página e Próxima na última', () => {
    const { rerender } = render(<Pagination page={1} totalPages={3} hrefForPage={href} />);
    expect(screen.queryByRole('link', { name: 'Anterior' })).not.toBeInTheDocument();
    rerender(<Pagination page={3} totalPages={3} hrefForPage={href} />);
    expect(screen.queryByRole('link', { name: 'Próxima' })).not.toBeInTheDocument();
  });

  it('não renderiza com uma página só', () => {
    const { container } = render(<Pagination page={1} totalPages={1} hrefForPage={href} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

`src/components/site-footer.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SiteFooter } from './site-footer';

describe('SiteFooter', () => {
  it('credita o TMDB e o JustWatch', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: 'TMDB' })).toHaveAttribute('href', 'https://www.themoviedb.org');
    expect(screen.getByRole('link', { name: 'JustWatch' })).toHaveAttribute('href', 'https://www.justwatch.com');
    expect(screen.getByText(/não é endossado nem certificado pelo TMDB/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `npm test -- src/components src/lib/format.test.ts`
Expected: FAIL — módulos não encontrados.

- [ ] **Step 5: Implementar**

`src/lib/format.ts`:
```ts
export function formatRating(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
```

`src/components/movie-card.tsx`:
```tsx
import Image from 'next/image';
import Link from 'next/link';
import { formatRating } from '@/lib/format';
import { tmdbImageUrl } from '@/lib/tmdb/images';
import type { Movie } from '@/lib/tmdb/types';

export function MovieCard({ movie }: { movie: Movie }) {
  const poster = tmdbImageUrl(movie.posterPath, 'w342');
  return (
    <Link href={`/filme/${movie.id}`} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-muted">
        {poster ? (
          <Image
            src={poster}
            alt={`Pôster de ${movie.title}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-2 text-center text-sm text-muted-foreground">
            Sem pôster
          </div>
        )}
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-medium">{movie.title}</h3>
      <p className="text-xs text-muted-foreground">
        {movie.releaseYear ?? '—'} · ★ {formatRating(movie.voteAverage)}
      </p>
    </Link>
  );
}
```

`src/components/movie-grid.tsx`:
```tsx
import type { ReactNode } from 'react';
import type { Movie } from '@/lib/tmdb/types';
import { MovieCard } from './movie-card';

interface MovieGridProps {
  movies: Movie[];
  emptyMessage: string;
  emptyAction?: ReactNode;
}

export function MovieGrid({ movies, emptyMessage, emptyAction }: MovieGridProps) {
  if (movies.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    );
  }
  return (
    <ul aria-label="Filmes" className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {movies.map((movie) => (
        <li key={movie.id}>
          <MovieCard movie={movie} />
        </li>
      ))}
    </ul>
  );
}
```

`src/components/movie-grid-skeleton.tsx`:
```tsx
import { Skeleton } from '@/components/ui/skeleton';

export function MovieGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <ul aria-label="Carregando filmes" className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <Skeleton className="aspect-[2/3] w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />
          <Skeleton className="mt-1 h-3 w-1/2" />
        </li>
      ))}
    </ul>
  );
}
```

`src/components/pagination.tsx`:
```tsx
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
}

const disabledClass = cn(buttonVariants({ variant: 'outline' }), 'pointer-events-none opacity-50');

export function Pagination({ page, totalPages, hrefForPage }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Paginação" className="mt-8 flex items-center justify-center gap-4">
      {page > 1 ? (
        <Link href={hrefForPage(page - 1)} className={buttonVariants({ variant: 'outline' })}>
          Anterior
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledClass}>Anterior</span>
      )}
      <span className="text-sm">
        Página {page} de {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={hrefForPage(page + 1)} className={buttonVariants({ variant: 'outline' })}>
          Próxima
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledClass}>Próxima</span>
      )}
    </nav>
  );
}
```

`src/components/site-header.tsx`:
```tsx
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
```

`src/components/site-footer.tsx`:
```tsx
export function SiteFooter() {
  return (
    <footer className="border-t py-6 text-center text-xs text-muted-foreground">
      <p>
        Dados de filmes fornecidos pelo{' '}
        <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="underline">
          TMDB
        </a>
        . Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.
      </p>
      <p className="mt-1">
        Dados de disponibilidade em streaming fornecidos pelo{' '}
        <a href="https://www.justwatch.com" target="_blank" rel="noopener noreferrer" className="underline">
          JustWatch
        </a>
        .
      </p>
    </footer>
  );
}
```

Substitua `src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  title: { default: 'Streaming Agora', template: '%s · Streaming Agora' },
  description: 'Os filmes disponíveis agora nos streamings do Brasil.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${geist.variable} flex min-h-screen flex-col font-sans antialiased`}>
        <SiteHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
        <SiteFooter />
        <Toaster richColors />
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npm test && npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: layout base, cards, grade e paginação" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Página do catálogo com filtros

**Files:**
- Create: `src/lib/catalog/resolve-providers.ts`, `src/components/filter-bar.tsx`, `src/app/loading.tsx`, `src/app/error.tsx`, `src/app/not-found.tsx`
- Modify: `src/app/page.tsx` (substituir por completo)
- Test: `src/lib/catalog/resolve-providers.test.ts`, `src/components/filter-bar.test.tsx`

**Interfaces:**
- Consumes: Tasks 2, 4, 6.
- Produces:
  - `type ProviderSource = 'url' | 'user' | 'default'`
  - `resolveProviderIds(selection: ProviderSelection, userProviderIds: number[] | null, defaultProviderIds: number[]): { ids: number[]; source: ProviderSource }`
  - `removeWatched(movies: Movie[], watchedIds: ReadonlySet<number>): Movie[]`
  - `<FilterBar filters={CatalogFilters} genres={Genre[]} providers={Provider[]} selectedProviderIds={number[]} canHideWatched={boolean} />` (Client Component; toda mudança faz `router.push(catalogHref({...filters, ...mudança, page: 1}))`; desmarcar o último provedor gera `providers: 'all'`)

- [ ] **Step 1: Escrever os testes que falham**

`src/lib/catalog/resolve-providers.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { removeWatched, resolveProviderIds } from './resolve-providers';

const DEFAULTS = [8, 119, 337];

describe('resolveProviderIds', () => {
  it('usa os ids da URL quando existem', () => {
    expect(resolveProviderIds([8], [119], DEFAULTS)).toEqual({ ids: [8], source: 'url' });
  });
  it('usa os streamings do usuário quando a URL não diz nada', () => {
    expect(resolveProviderIds(null, [119], DEFAULTS)).toEqual({ ids: [119], source: 'user' });
  });
  it('usa o padrão quando o usuário não tem streamings salvos', () => {
    expect(resolveProviderIds(null, [], DEFAULTS)).toEqual({ ids: DEFAULTS, source: 'default' });
    expect(resolveProviderIds(null, null, DEFAULTS)).toEqual({ ids: DEFAULTS, source: 'default' });
  });
  it('providers=all ignora as preferências do usuário', () => {
    expect(resolveProviderIds('all', [119], DEFAULTS)).toEqual({ ids: DEFAULTS, source: 'default' });
  });
});

describe('removeWatched', () => {
  it('remove os filmes assistidos', () => {
    const movies = [1, 2, 3].map((id) => ({ id, title: `F${id}`, posterPath: null, releaseYear: null, voteAverage: 0, overview: '' }));
    expect(removeWatched(movies, new Set([2])).map((m) => m.id)).toEqual([1, 3]);
  });
});
```

`src/components/filter-bar.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_FILTERS } from '@/lib/filters/catalog-filters';
import { FilterBar } from './filter-bar';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const providers = [
  { id: 8, name: 'Netflix', logoPath: null, displayPriority: 1 },
  { id: 119, name: 'Amazon Prime Video', logoPath: null, displayPriority: 2 },
];
const genres = [{ id: 28, name: 'Ação' }];

function renderBar(overrides: Partial<Parameters<typeof FilterBar>[0]> = {}) {
  return render(
    <FilterBar
      filters={DEFAULT_FILTERS}
      genres={genres}
      providers={providers}
      selectedProviderIds={[]}
      canHideWatched={false}
      {...overrides}
    />,
  );
}

describe('FilterBar', () => {
  beforeEach(() => push.mockClear());

  it('seleciona um streaming', async () => {
    renderBar();
    await userEvent.click(screen.getByRole('button', { name: 'Netflix' }));
    expect(push).toHaveBeenCalledWith('/?providers=8');
  });

  it('marca os selecionados e acrescenta outro', async () => {
    renderBar({ filters: { ...DEFAULT_FILTERS, providers: [8] }, selectedProviderIds: [8] });
    expect(screen.getByRole('button', { name: 'Netflix' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Amazon Prime Video' }));
    expect(push).toHaveBeenCalledWith('/?providers=8%2C119');
  });

  it('desmarcar o último vira providers=all', async () => {
    renderBar({ filters: { ...DEFAULT_FILTERS, providers: [8] }, selectedProviderIds: [8] });
    await userEvent.click(screen.getByRole('button', { name: 'Netflix' }));
    expect(push).toHaveBeenCalledWith('/?providers=all');
  });

  it('trocar o gênero volta para a página 1', async () => {
    renderBar({ filters: { ...DEFAULT_FILTERS, page: 3 } });
    await userEvent.selectOptions(screen.getByLabelText('Gênero'), '28');
    expect(push).toHaveBeenCalledWith('/?genre=28');
  });

  it('muda a ordenação e a nota mínima', async () => {
    renderBar();
    await userEvent.selectOptions(screen.getByLabelText('Ordenar por'), 'vote_average.desc');
    expect(push).toHaveBeenLastCalledWith('/?sort=vote_average.desc');
    await userEvent.selectOptions(screen.getByLabelText('Nota mínima'), '7');
    expect(push).toHaveBeenLastCalledWith('/?minRating=7');
  });

  it('só mostra "Ocultar assistidos" para quem pode usar', async () => {
    const { rerender } = renderBar();
    expect(screen.queryByLabelText('Ocultar assistidos')).not.toBeInTheDocument();
    rerender(
      <FilterBar filters={DEFAULT_FILTERS} genres={genres} providers={providers} selectedProviderIds={[]} canHideWatched />,
    );
    await userEvent.click(screen.getByLabelText('Ocultar assistidos'));
    expect(push).toHaveBeenCalledWith('/?hideWatched=1');
  });

  it('Limpar filtros volta ao início', async () => {
    renderBar({ filters: { ...DEFAULT_FILTERS, genre: 28 } });
    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(push).toHaveBeenCalledWith('/');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/lib/catalog src/components/filter-bar.test.tsx`
Expected: FAIL — módulos não encontrados.

- [ ] **Step 3: Implementar a lógica pura**

`src/lib/catalog/resolve-providers.ts`:
```ts
import type { ProviderSelection } from '@/lib/filters/catalog-filters';
import type { Movie } from '@/lib/tmdb/types';

export type ProviderSource = 'url' | 'user' | 'default';

export function resolveProviderIds(
  selection: ProviderSelection,
  userProviderIds: number[] | null,
  defaultProviderIds: number[],
): { ids: number[]; source: ProviderSource } {
  if (Array.isArray(selection)) return { ids: selection, source: 'url' };
  if (selection === null && userProviderIds && userProviderIds.length > 0) {
    return { ids: userProviderIds, source: 'user' };
  }
  return { ids: defaultProviderIds, source: 'default' };
}

export function removeWatched(movies: Movie[], watchedIds: ReadonlySet<number>): Movie[] {
  return movies.filter((movie) => !watchedIds.has(movie.id));
}
```

- [ ] **Step 4: Implementar a FilterBar**

`src/components/filter-bar.tsx`:
```tsx
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
const selectClass = 'h-9 rounded-md border bg-background px-2';

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

export function FilterBar({ filters, genres, providers, selectedProviderIds, canHideWatched }: FilterBarProps) {
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
    <section aria-label="Filtros" className="mb-6 space-y-4">
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
                'flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors',
                active ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
              )}
            >
              {logo && <Image src={logo} alt="" width={20} height={20} className="rounded" />}
              <span>{provider.name}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-4 text-sm">
        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-genero">Gênero</label>
          <select
            id="filtro-genero"
            className={selectClass}
            value={filters.genre ?? ''}
            onChange={(e) => apply({ genre: toNumberOrNull(e.target.value) })}
          >
            <option value="">Todos</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-ano">Ano</label>
          <select
            id="filtro-ano"
            className={selectClass}
            value={filters.year ?? ''}
            onChange={(e) => apply({ year: toNumberOrNull(e.target.value) })}
          >
            <option value="">Qualquer</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-nota">Nota mínima</label>
          <select
            id="filtro-nota"
            className={selectClass}
            value={filters.minRating ?? ''}
            onChange={(e) => apply({ minRating: toNumberOrNull(e.target.value) })}
          >
            <option value="">Qualquer</option>
            {RATING_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}+</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-ordem">Ordenar por</label>
          <select
            id="filtro-ordem"
            className={selectClass}
            value={filters.sort}
            onChange={(e) => apply({ sort: e.target.value as SortOption })}
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s} value={s}>{SORT_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {canHideWatched && (
          <div className="flex h-9 items-center gap-2">
            <input
              id="filtro-assistidos"
              type="checkbox"
              checked={filters.hideWatched}
              onChange={(e) => apply({ hideWatched: e.target.checked })}
            />
            <label htmlFor="filtro-assistidos">Ocultar assistidos</label>
          </div>
        )}

        <Button type="button" variant="ghost" onClick={() => router.push(catalogHref(DEFAULT_FILTERS))}>
          Limpar filtros
        </Button>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test -- src/lib/catalog src/components/filter-bar.test.tsx`
Expected: PASS.

- [ ] **Step 6: Página, loading, erro e 404**

Substitua `src/app/page.tsx`:
```tsx
import Link from 'next/link';
import { FilterBar } from '@/components/filter-bar';
import { MovieGrid } from '@/components/movie-grid';
import { Pagination } from '@/components/pagination';
import { buttonVariants } from '@/components/ui/button';
import { resolveProviderIds } from '@/lib/catalog/resolve-providers';
import { catalogHref, parseCatalogFilters, type RawSearchParams } from '@/lib/filters/catalog-filters';
import { getDefaultProviders, getGenres } from '@/lib/tmdb/catalog-meta';
import { discoverMovies } from '@/lib/tmdb/movies';

type PageProps = { searchParams: Promise<RawSearchParams> };

export default async function CatalogPage({ searchParams }: PageProps) {
  const filters = parseCatalogFilters(await searchParams);
  const [genres, defaultProviders] = await Promise.all([getGenres(), getDefaultProviders()]);
  const { ids } = resolveProviderIds(filters.providers, null, defaultProviders.map((p) => p.id));
  const result = await discoverMovies({
    providerIds: ids,
    genre: filters.genre,
    year: filters.year,
    minRating: filters.minRating,
    sort: filters.sort,
    page: filters.page,
  });

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Filmes disponíveis nos streamings</h1>
      <FilterBar
        filters={filters}
        genres={genres}
        providers={defaultProviders}
        selectedProviderIds={Array.isArray(filters.providers) ? filters.providers : []}
        canHideWatched={false}
      />
      <MovieGrid
        movies={result.results}
        emptyMessage="Nenhum filme encontrado com esses filtros."
        emptyAction={<Link href="/" className={buttonVariants({ variant: 'outline' })}>Limpar filtros</Link>}
      />
      <Pagination
        page={filters.page}
        totalPages={result.totalPages}
        hrefForPage={(page) => catalogHref({ ...filters, page })}
      />
    </>
  );
}
```

`src/app/loading.tsx`:
```tsx
import { MovieGridSkeleton } from '@/components/movie-grid-skeleton';

export default function Loading() {
  return <MovieGridSkeleton />;
}
```

`src/app/error.tsx`:
```tsx
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="py-16 text-center">
      <h2 className="text-xl font-semibold">Não foi possível carregar os filmes</h2>
      <p className="mt-2 text-muted-foreground">O serviço de filmes pode estar instável. Tente novamente em instantes.</p>
      <Button className="mt-4" onClick={() => reset()}>
        Tentar de novo
      </Button>
    </div>
  );
}
```

`src/app/not-found.tsx`:
```tsx
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h2 className="text-xl font-semibold">Página não encontrada</h2>
      <Link href="/" className={buttonVariants({ className: 'mt-4' })}>
        Voltar ao catálogo
      </Link>
    </div>
  );
}
```

- [ ] **Step 7: Verificação manual com o TMDB real**

Crie `.env.local` com `TMDB_READ_TOKEN=<seu token v4>` (Supabase ainda não é necessário). Rode `npm run dev` e abra `http://localhost:3000`.
Expected: grade de filmes; clicar em "Netflix" muda a URL para `/?providers=8` e a grade; "Próxima" leva a `page=2`; com `?genre=99999` aparece "Nenhum filme encontrado com esses filtros.".

- [ ] **Step 8: Rodar tudo**

Run: `npm test && npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: página do catálogo com filtros na URL" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Busca por título

**Files:**
- Create: `src/lib/search/normalize-query.ts`, `src/app/busca/page.tsx`, `src/app/busca/loading.tsx`
- Test: `src/lib/search/normalize-query.test.ts`

**Interfaces:**
- Consumes: `searchMovies` (Task 4), `parsePageParam` (Task 2), `MovieGrid`, `Pagination`, `MovieGridSkeleton` (Task 6).
- Produces: `MAX_QUERY_LENGTH = 100`; `normalizeQuery(raw: string | string[] | undefined): string | null`; `searchHref(query: string, page: number): string`.

- [ ] **Step 1: Escrever o teste que falha**

`src/lib/search/normalize-query.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { normalizeQuery, searchHref } from './normalize-query';

describe('normalizeQuery', () => {
  it('retorna null para vazio ou só espaços', () => {
    expect(normalizeQuery(undefined)).toBeNull();
    expect(normalizeQuery('')).toBeNull();
    expect(normalizeQuery('   ')).toBeNull();
  });
  it('apara e junta espaços repetidos', () => {
    expect(normalizeQuery('  O   Poderoso  Chefão ')).toBe('O Poderoso Chefão');
  });
  it('mantém acentos e &', () => {
    expect(normalizeQuery('Amor & Morte à Tarde')).toBe('Amor & Morte à Tarde');
  });
  it('usa o primeiro valor e limita a 100 caracteres', () => {
    expect(normalizeQuery(['a', 'b'])).toBe('a');
    expect(normalizeQuery('x'.repeat(150))).toHaveLength(100);
  });
});

describe('searchHref', () => {
  it('codifica o texto e omite a página 1', () => {
    expect(searchHref('Amor & Morte', 1)).toBe('/busca?q=Amor+%26+Morte');
    expect(searchHref('Matrix', 2)).toBe('/busca?q=Matrix&page=2');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/lib/search`
Expected: FAIL — `./normalize-query` não encontrado.

- [ ] **Step 3: Implementar**

`src/lib/search/normalize-query.ts`:
```ts
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/lib/search`
Expected: PASS.

- [ ] **Step 5: Página de busca**

`src/app/busca/page.tsx`:
```tsx
import type { Metadata } from 'next';
import { MovieGrid } from '@/components/movie-grid';
import { Pagination } from '@/components/pagination';
import { parsePageParam, type RawSearchParams } from '@/lib/filters/catalog-filters';
import { normalizeQuery, searchHref } from '@/lib/search/normalize-query';
import { searchMovies } from '@/lib/tmdb/movies';

type PageProps = { searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const query = normalizeQuery((await searchParams).q);
  return { title: query ? `Busca: ${query}` : 'Busca' };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = normalizeQuery(params.q);

  if (!query) {
    return (
      <>
        <h1 className="mb-4 text-2xl font-bold">Buscar filmes</h1>
        <p className="text-muted-foreground">Digite o nome de um filme na busca acima.</p>
      </>
    );
  }

  const page = parsePageParam(params.page);
  const result = await searchMovies(query, page);

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Resultados para “{query}”</h1>
      <MovieGrid movies={result.results} emptyMessage={`Nenhum filme encontrado para “${query}”.`} />
      <Pagination page={page} totalPages={result.totalPages} hrefForPage={(p) => searchHref(query, p)} />
    </>
  );
}
```

`src/app/busca/loading.tsx`:
```tsx
import { MovieGridSkeleton } from '@/components/movie-grid-skeleton';

export default function Loading() {
  return <MovieGridSkeleton />;
}
```

- [ ] **Step 6: Verificação manual**

Com `npm run dev`: digite "Matrix" no cabeçalho e envie.
Expected: `/busca?q=Matrix` com resultados; `/busca?q=%20%20` mostra "Digite o nome de um filme na busca acima."

- [ ] **Step 7: Rodar tudo e commit**

Run: `npm test && npm run lint && npm run typecheck` → PASS.
```bash
git add -A
git commit -m "feat: busca de filmes por título" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Página de detalhes do filme

**Files:**
- Create: `src/lib/movie-id.ts`, `src/components/watch-providers-section.tsx`, `src/app/filme/[id]/page.tsx`, `src/app/filme/[id]/loading.tsx`, `src/app/filme/[id]/not-found.tsx`
- Modify: `src/lib/format.ts`, `src/lib/format.test.ts`
- Test: `src/lib/movie-id.test.ts`, `src/components/watch-providers-section.test.tsx`

**Interfaces:**
- Consumes: `getMovieDetails`, `TmdbNotFoundError`, `MovieDetails`, `WatchProviders`, `tmdbImageUrl` (Tasks 3–5); `Badge`, `Skeleton` (Task 6).
- Produces: `parseMovieId(raw: string): number | null`; `formatRuntime(minutes: number | null): string | null`; `<WatchProvidersSection providers={WatchProviders} />`; `loadMovie(rawId)` interno à página.

- [ ] **Step 1: Escrever os testes que falham**

`src/lib/movie-id.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseMovieId } from './movie-id';

describe('parseMovieId', () => {
  it('aceita inteiros positivos', () => {
    expect(parseMovieId('603')).toBe(603);
  });
  it.each(['abc', '0', '-1', '12abc', '1.5', '', '99999999999'])('recusa "%s"', (raw) => {
    expect(parseMovieId(raw)).toBeNull();
  });
});
```

Acrescente a `src/lib/format.test.ts`:
```ts
import { formatRuntime } from './format';

describe('formatRuntime', () => {
  it('formata horas e minutos', () => {
    expect(formatRuntime(136)).toBe('2h 16min');
    expect(formatRuntime(45)).toBe('45min');
    expect(formatRuntime(120)).toBe('2h');
  });
  it('retorna null sem duração', () => {
    expect(formatRuntime(null)).toBeNull();
    expect(formatRuntime(0)).toBeNull();
  });
});
```
(junte o import de `formatRuntime` ao import existente de `./format`.)

`src/components/watch-providers-section.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WatchProvidersSection } from './watch-providers-section';

const netflix = { id: 8, name: 'Netflix', logoPath: null, displayPriority: 1 };
const apple = { id: 2, name: 'Apple TV', logoPath: null, displayPriority: 4 };

describe('WatchProvidersSection', () => {
  it('avisa quando não há disponibilidade no Brasil', () => {
    render(<WatchProvidersSection providers={{ link: null, flatrate: [], rent: [], buy: [] }} />);
    expect(screen.getByText('Indisponível em streaming no Brasil no momento.')).toBeInTheDocument();
    expect(screen.getByText('Disponibilidade fornecida pelo JustWatch.')).toBeInTheDocument();
  });

  it('mostra só as seções com provedores', () => {
    render(
      <WatchProvidersSection
        providers={{ link: 'https://www.themoviedb.org/movie/603/watch', flatrate: [netflix], rent: [apple], buy: [] }}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Incluído na assinatura' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Aluguel' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Compra' })).not.toBeInTheDocument();
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver todas as opções no TMDB' })).toHaveAttribute(
      'href',
      'https://www.themoviedb.org/movie/603/watch',
    );
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/lib/movie-id.test.ts src/lib/format.test.ts src/components/watch-providers-section.test.tsx`
Expected: FAIL — módulos/exports ausentes.

- [ ] **Step 3: Implementar**

`src/lib/movie-id.ts`:
```ts
/** Aceita apenas ids numéricos positivos de até 9 dígitos. */
export function parseMovieId(raw: string): number | null {
  if (!/^\d{1,9}$/.test(raw)) return null;
  const id = Number(raw);
  return id > 0 ? id : null;
}
```

Acrescente a `src/lib/format.ts`:
```ts
export function formatRuntime(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}
```

`src/components/watch-providers-section.tsx`:
```tsx
import Image from 'next/image';
import { tmdbImageUrl } from '@/lib/tmdb/images';
import type { Provider, WatchProviders } from '@/lib/tmdb/types';

function ProviderList({ title, items }: { title: string; items: Provider[] }) {
  return (
    <div className="mt-3">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <ul className="mt-2 flex flex-wrap gap-3">
        {items.map((p) => {
          const logo = tmdbImageUrl(p.logoPath, 'w92');
          return (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              {logo && <Image src={logo} alt="" width={32} height={32} className="rounded" />}
              <span>{p.name}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function WatchProvidersSection({ providers }: { providers: WatchProviders }) {
  const sections = [
    { title: 'Incluído na assinatura', items: providers.flatrate },
    { title: 'Aluguel', items: providers.rent },
    { title: 'Compra', items: providers.buy },
  ].filter((s) => s.items.length > 0);

  return (
    <section aria-labelledby="onde-assistir">
      <h2 id="onde-assistir" className="text-lg font-semibold">Onde assistir</h2>
      {sections.length === 0 ? (
        <p className="mt-2 text-muted-foreground">Indisponível em streaming no Brasil no momento.</p>
      ) : (
        sections.map((s) => <ProviderList key={s.title} title={s.title} items={s.items} />)
      )}
      {providers.link && sections.length > 0 && (
        <a href={providers.link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm underline">
          Ver todas as opções no TMDB
        </a>
      )}
      <p className="mt-2 text-xs text-muted-foreground">Disponibilidade fornecida pelo JustWatch.</p>
    </section>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/lib src/components/watch-providers-section.test.tsx`
Expected: PASS.

- [ ] **Step 5: Página de detalhes**

`src/app/filme/[id]/page.tsx`:
```tsx
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { WatchProvidersSection } from '@/components/watch-providers-section';
import { formatRating, formatRuntime } from '@/lib/format';
import { parseMovieId } from '@/lib/movie-id';
import { TmdbNotFoundError } from '@/lib/tmdb/client';
import { tmdbImageUrl } from '@/lib/tmdb/images';
import { getMovieDetails } from '@/lib/tmdb/movies';
import type { MovieDetails } from '@/lib/tmdb/types';

type PageProps = { params: Promise<{ id: string }> };

async function loadMovie(rawId: string): Promise<MovieDetails> {
  const id = parseMovieId(rawId);
  if (id === null) notFound();
  try {
    return await getMovieDetails(id);
  } catch (error) {
    if (error instanceof TmdbNotFoundError) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const movie = await loadMovie((await params).id);
  return { title: movie.title, description: movie.overview.slice(0, 160) };
}

export default async function MoviePage({ params }: PageProps) {
  const movie = await loadMovie((await params).id);
  const poster = tmdbImageUrl(movie.posterPath, 'w500');
  const meta = [movie.releaseYear, formatRuntime(movie.runtime), `★ ${formatRating(movie.voteAverage)}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="grid gap-8 md:grid-cols-[300px_1fr]">
      <div className="relative aspect-[2/3] w-full max-w-[300px] overflow-hidden rounded-lg bg-muted">
        {poster ? (
          <Image src={poster} alt={`Pôster de ${movie.title}`} fill priority sizes="300px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">Sem pôster</div>
        )}
      </div>

      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold">{movie.title}</h1>
          <p className="mt-1 text-muted-foreground">{meta}</p>
          {movie.tagline && <p className="mt-2 italic">{movie.tagline}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {movie.genres.map((g) => (
              <Badge key={g.id} variant="secondary">{g.name}</Badge>
            ))}
          </div>
        </header>

        <WatchProvidersSection providers={movie.watchProviders} />

        <section>
          <h2 className="text-lg font-semibold">Sinopse</h2>
          <p className="mt-2 leading-relaxed">{movie.overview || 'Sinopse indisponível.'}</p>
        </section>

        {movie.trailerKey && (
          <section>
            <h2 className="text-lg font-semibold">Trailer</h2>
            <div className="mt-2 aspect-video">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${movie.trailerKey}`}
                title={`Trailer de ${movie.title}`}
                allow="accelerometer; encrypted-media; picture-in-picture"
                allowFullScreen
                className="h-full w-full rounded-lg"
              />
            </div>
          </section>
        )}

        {movie.cast.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold">Elenco</h2>
            <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {movie.cast.map((c) => (
                <li key={c.id} className="text-sm">
                  <p className="font-medium">{c.name}</p>
                  {c.character && <p className="text-muted-foreground">{c.character}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}
```

`src/app/filme/[id]/loading.tsx`:
```tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="grid gap-8 md:grid-cols-[300px_1fr]">
      <Skeleton className="aspect-[2/3] w-full max-w-[300px]" />
      <div className="space-y-4">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
```

`src/app/filme/[id]/not-found.tsx`:
```tsx
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function MovieNotFound() {
  return (
    <div className="py-16 text-center">
      <h2 className="text-xl font-semibold">Filme não encontrado</h2>
      <Link href="/" className={buttonVariants({ className: 'mt-4' })}>
        Voltar ao catálogo
      </Link>
    </div>
  );
}
```

- [ ] **Step 6: Verificação manual**

Com `npm run dev`: abra `/filme/603`, `/filme/abc` e `/filme/999999999`.
Expected: detalhes do Matrix com "Onde assistir"; as outras duas mostram "Filme não encontrado" (status 404 no Network).

- [ ] **Step 7: Rodar tudo e commit**

Run: `npm test && npm run lint && npm run typecheck` → PASS.
```bash
git add -A
git commit -m "feat: página de detalhes com onde assistir, trailer e elenco" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Supabase — banco, RLS, tipos, clientes e sessão

**Pré-requisito:** Docker Desktop instalado e rodando.

**Files:**
- Create: `supabase/config.toml` (via CLI), `supabase/migrations/20260929120000_user_tables.sql`, `src/lib/supabase/database.types.ts` (gerado), `src/lib/supabase/config.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/proxy.ts`, `src/proxy.ts`, `vitest.db.config.mts`, `tests/db/setup.ts`, `tests/db/helpers.ts`, `tests/db/rls.test.ts`, `.env.test.local` (não versionado)
- Modify: `.env.local`

**Interfaces:**
- Produces:
  - Tabelas `public.user_providers(user_id, provider_id)` e `public.user_movies(user_id, tmdb_id, status, title, poster_path, updated_at)` com RLS
  - `type Database` em `@/lib/supabase/database.types`
  - `createSupabaseServerClient(): Promise<SupabaseClient<Database>>` (server-only, usa `cookies()`)
  - `createSupabaseBrowserClient(): SupabaseClient<Database>`
  - `updateSession(request: NextRequest): Promise<{ response: NextResponse; userId: string | null }>`
  - Helpers de teste: `createTestUser(): Promise<TestUser>`, `deleteTestUser(id)`, `createAnonClient()`, `admin`; `type TestUser = { id: string; email: string; client: SupabaseClient<Database> }`

- [ ] **Step 1: Iniciar o Supabase local**

```bash
npx supabase init
npx supabase start
npx supabase status -o env
```
(No `init`, responda **N** às perguntas sobre configurações de IDE.) Anote `API_URL`, `ANON_KEY` (ou `PUBLISHABLE_KEY`) e `SERVICE_ROLE_KEY` (ou `SECRET_KEY`).

No `supabase/config.toml`, na seção `[auth]`, ajuste:
```toml
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000/auth/callback"]
```

- [ ] **Step 2: Arquivos de ambiente**

Acrescente ao `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=<API_URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY ou PUBLISHABLE_KEY>
```

Crie `.env.test.local` (ignorado pelo git via `.env*`):
```
LOCAL_SUPABASE_URL=<API_URL>
LOCAL_SUPABASE_ANON_KEY=<ANON_KEY ou PUBLISHABLE_KEY>
LOCAL_SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY ou SECRET_KEY>
```

- [ ] **Step 3: Configuração dos testes de banco**

`vitest.db.config.mts`:
```ts
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/db/**/*.test.ts'],
    setupFiles: ['./tests/db/setup.ts'],
    fileParallelism: false,
    testTimeout: 20000,
  },
});
```

`tests/db/setup.ts`:
```ts
process.loadEnvFile('.env.test.local');
```

`tests/db/helpers.ts`:
```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Defina ${name} em .env.test.local`);
  return value;
}

const url = env('LOCAL_SUPABASE_URL');
const anonKey = env('LOCAL_SUPABASE_ANON_KEY');
const serviceKey = env('LOCAL_SUPABASE_SERVICE_ROLE_KEY');
const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

export const admin = createClient<Database>(url, serviceKey, noSession);

export function createAnonClient(): SupabaseClient<Database> {
  return createClient<Database>(url, anonKey, noSession);
}

export type TestUser = { id: string; email: string; client: SupabaseClient<Database> };

export async function createTestUser(): Promise<TestUser> {
  const email = `teste-${crypto.randomUUID()}@exemplo.com`;
  const password = 'senha-de-teste-123';
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error('Usuário não criado');
  const client = createAnonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, email, client };
}

export async function deleteTestUser(id: string): Promise<void> {
  await admin.auth.admin.deleteUser(id);
}
```

- [ ] **Step 4: Escrever o teste de RLS que falha**

`tests/db/rls.test.ts`:
```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { admin, createAnonClient, createTestUser, deleteTestUser, type TestUser } from './helpers';

let a: TestUser;
let b: TestUser;

beforeAll(async () => {
  [a, b] = await Promise.all([createTestUser(), createTestUser()]);
  const movie = await a.client
    .from('user_movies')
    .insert({ user_id: a.id, tmdb_id: 603, status: 'want', title: 'Matrix', poster_path: null });
  expect(movie.error).toBeNull();
  const provider = await a.client.from('user_providers').insert({ user_id: a.id, provider_id: 8 });
  expect(provider.error).toBeNull();
});

afterAll(async () => {
  await Promise.all([deleteTestUser(a.id), deleteTestUser(b.id)]);
});

describe('RLS', () => {
  it('o dono lê os próprios dados', async () => {
    const { data } = await a.client.from('user_movies').select('tmdb_id');
    expect(data).toEqual([{ tmdb_id: 603 }]);
  });

  it('outro usuário não enxerga os dados de A', async () => {
    const movies = await b.client.from('user_movies').select('*').eq('user_id', a.id);
    const providers = await b.client.from('user_providers').select('*').eq('user_id', a.id);
    expect(movies.data).toEqual([]);
    expect(providers.data).toEqual([]);
  });

  it('outro usuário não insere em nome de A', async () => {
    const { error } = await b.client
      .from('user_movies')
      .insert({ user_id: a.id, tmdb_id: 1, status: 'want', title: 'Invasão', poster_path: null });
    expect(error).not.toBeNull();
  });

  it('outro usuário não altera nem apaga os dados de A', async () => {
    await b.client.from('user_movies').update({ status: 'watched' }).eq('user_id', a.id);
    await b.client.from('user_movies').delete().eq('user_id', a.id);
    await b.client.from('user_providers').delete().eq('user_id', a.id);

    const movie = await admin.from('user_movies').select('status').eq('user_id', a.id).single();
    const providers = await admin.from('user_providers').select('provider_id').eq('user_id', a.id);
    expect(movie.data?.status).toBe('want');
    expect(providers.data).toHaveLength(1);
  });

  it('visitante anônimo não lê nada', async () => {
    const { data } = await createAnonClient().from('user_movies').select('*');
    expect(data ?? []).toEqual([]);
  });

  it('status inválido é recusado pelo banco', async () => {
    const { error } = await a.client
      .from('user_movies')
      .insert({ user_id: a.id, tmdb_id: 2, status: 'loved' as never, title: 'X', poster_path: null });
    expect(error).not.toBeNull();
  });
});
```

- [ ] **Step 5: Rodar e ver falhar**

Run: `npm run test:db`
Expected: FAIL — erro do PostgREST dizendo que `public.user_movies` não existe.

- [ ] **Step 6: Escrever a migração**

`supabase/migrations/20260929120000_user_tables.sql`:
```sql
create table public.user_providers (
  user_id     uuid not null references auth.users on delete cascade,
  provider_id int  not null,
  primary key (user_id, provider_id)
);

create table public.user_movies (
  user_id     uuid not null references auth.users on delete cascade,
  tmdb_id     int  not null,
  status      text not null check (status in ('want', 'watched')),
  title       text not null,
  poster_path text,
  updated_at  timestamptz not null default now(),
  primary key (user_id, tmdb_id)
);

create index user_movies_user_status_updated_idx
  on public.user_movies (user_id, status, updated_at desc);

alter table public.user_providers enable row level security;
alter table public.user_movies enable row level security;

grant select, insert, delete on public.user_providers to authenticated;
grant select, insert, update, delete on public.user_movies to authenticated;

create policy "user_providers: dono lê" on public.user_providers
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_providers: dono insere" on public.user_providers
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_providers: dono apaga" on public.user_providers
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "user_movies: dono lê" on public.user_movies
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_movies: dono insere" on public.user_movies
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_movies: dono altera" on public.user_movies
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "user_movies: dono apaga" on public.user_movies
  for delete to authenticated using ((select auth.uid()) = user_id);
```

- [ ] **Step 7: Aplicar, gerar tipos e rodar**

```bash
npx supabase db reset
npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
npm run test:db
```
Expected: PASS (6 testes). Confira que `database.types.ts` contém `user_movies` e `user_providers`.

- [ ] **Step 8: Clientes do Supabase**

`src/lib/supabase/config.ts`:
```ts
// Acesso literal para o Next embutir as variáveis no bundle do navegador.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabaseUrl: string = url;
export const supabaseAnonKey: string = anonKey;
```

`src/lib/supabase/server.ts`:
```ts
import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAnonKey, supabaseUrl } from './config';
import type { Database } from './database.types';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado de um Server Component: o proxy já renova a sessão.
        }
      },
    },
  });
}
```

`src/lib/supabase/client.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr';
import { supabaseAnonKey, supabaseUrl } from './config';
import type { Database } from './database.types';

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
```

`src/lib/supabase/proxy.ts`:
```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAnonKey, supabaseUrl } from './config';
import type { Database } from './database.types';

/** Renova a sessão (cookies) a cada requisição e informa o usuário atual. */
export async function updateSession(
  request: NextRequest,
): Promise<{ response: NextResponse; userId: string | null }> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { response, userId: user?.id ?? null };
}
```

`src/proxy.ts`:
```ts
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  const { response } = await updateSession(request);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

- [ ] **Step 9: Verificar**

Run: `npm run typecheck && npm run lint && npm test && npm run test:db`
Expected: PASS. Com `npm run dev`, o catálogo continua abrindo normalmente.

- [ ] **Step 10: Commit**

```bash
git add supabase src/lib/supabase src/proxy.ts vitest.db.config.mts tests/db
git commit -m "feat: tabelas do usuário com RLS, clientes Supabase e renovação de sessão" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Autenticação (login, Google, logout, rotas protegidas)

**Files:**
- Create: `src/lib/auth/safe-next.ts`, `src/lib/auth/error-messages.ts`, `src/lib/auth/protected-routes.ts`, `src/lib/auth/get-current-user.ts`, `src/components/login-form.tsx`, `src/components/user-menu.tsx`, `src/app/login/page.tsx`, `src/app/auth/callback/route.ts`, `src/app/auth/signout/route.ts`
- Modify: `src/proxy.ts`, `src/app/layout.tsx`
- Test: `src/lib/auth/safe-next.test.ts`, `src/lib/auth/error-messages.test.ts`, `src/lib/auth/protected-routes.test.ts`, `src/components/login-form.test.tsx`

**Interfaces:**
- Consumes: clientes Supabase e `updateSession` (Task 10).
- Produces:
  - `safeNextPath(raw: string | null | undefined, fallback?: string): string`
  - `authErrorMessage(message: string): string`
  - `PROTECTED_PATHS = ['/minha-lista', '/perfil']`; `isProtectedPath(pathname: string): boolean`; `loginRedirectPath(pathname: string, search: string): string`
  - `getCurrentUser(): Promise<User | null>` (server-only, memorizado por requisição com `cache`)
  - `<LoginForm next={string} />`, `<UserMenu />` (Server Component assíncrono)
  - Rotas `GET /auth/callback?code&next`, `POST /auth/signout`

- [ ] **Step 1: Escrever os testes que falham**

`src/lib/auth/safe-next.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { safeNextPath } from './safe-next';

describe('safeNextPath', () => {
  it('aceita caminhos internos', () => {
    expect(safeNextPath('/filme/603')).toBe('/filme/603');
    expect(safeNextPath('/minha-lista?tab=watched')).toBe('/minha-lista?tab=watched');
  });

  it.each([
    undefined,
    null,
    '',
    'filme/603',
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    '/\t/evil.com',
    '/\n/evil.com',
  ])('recusa %j e volta para /', (raw) => {
    expect(safeNextPath(raw)).toBe('/');
  });

  it('usa o fallback informado', () => {
    expect(safeNextPath('//evil.com', '/perfil')).toBe('/perfil');
  });
});
```

`src/lib/auth/error-messages.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { authErrorMessage } from './error-messages';

describe('authErrorMessage', () => {
  it('traduz erros conhecidos', () => {
    expect(authErrorMessage('Invalid login credentials')).toBe('E-mail ou senha incorretos.');
    expect(authErrorMessage('User already registered')).toBe('Este e-mail já está cadastrado.');
    expect(authErrorMessage('Password should be at least 6 characters.')).toBe('A senha precisa ter pelo menos 6 caracteres.');
    expect(authErrorMessage('Email not confirmed')).toBe('Confirme seu e-mail antes de entrar.');
  });
  it('usa mensagem genérica para o resto', () => {
    expect(authErrorMessage('boom')).toBe('Não foi possível entrar. Tente novamente.');
  });
});
```

`src/lib/auth/protected-routes.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { isProtectedPath, loginRedirectPath } from './protected-routes';

describe('isProtectedPath', () => {
  it('protege minha-lista e perfil', () => {
    expect(isProtectedPath('/minha-lista')).toBe(true);
    expect(isProtectedPath('/perfil')).toBe(true);
    expect(isProtectedPath('/perfil/editar')).toBe(true);
  });
  it('não protege o resto', () => {
    expect(isProtectedPath('/')).toBe(false);
    expect(isProtectedPath('/perfilx')).toBe(false);
    expect(isProtectedPath('/filme/603')).toBe(false);
  });
});

describe('loginRedirectPath', () => {
  it('leva o destino no next', () => {
    expect(loginRedirectPath('/minha-lista', '?tab=watched')).toBe('/login?next=%2Fminha-lista%3Ftab%3Dwatched');
  });
});
```

`src/components/login-form.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from './login-form';

const { replace, refresh, auth } = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  auth: { signInWithPassword: vi.fn(), signUp: vi.fn(), signInWithOAuth: vi.fn() },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock('@/lib/supabase/client', () => ({ createSupabaseBrowserClient: () => ({ auth }) }));

async function fillAndSubmit(button: string) {
  await userEvent.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
  await userEvent.type(screen.getByLabelText('Senha'), 'segredo123');
  await userEvent.click(screen.getByRole('button', { name: button }));
}

describe('LoginForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('entra e volta para o destino', async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ data: { session: {} }, error: null });
    render(<LoginForm next="/filme/603" />);
    await fillAndSubmit('Entrar');
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'ana@exemplo.com', password: 'segredo123' });
    expect(replace).toHaveBeenCalledWith('/filme/603');
    expect(refresh).toHaveBeenCalled();
  });

  it('mostra erro traduzido', async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ data: { session: null }, error: { message: 'Invalid login credentials' } });
    render(<LoginForm next="/" />);
    await fillAndSubmit('Entrar');
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
    expect(replace).not.toHaveBeenCalled();
  });

  it('cadastro sem sessão pede confirmação por e-mail', async () => {
    auth.signUp.mockResolvedValueOnce({ data: { session: null }, error: null });
    render(<LoginForm next="/" />);
    await userEvent.click(screen.getByRole('button', { name: 'Cadastre-se' }));
    await fillAndSubmit('Criar conta');
    expect(auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ana@exemplo.com', password: 'segredo123' }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Enviamos um link de confirmação para o seu e-mail.');
  });

  it('Google usa o callback com o destino', async () => {
    auth.signInWithOAuth.mockResolvedValueOnce({ error: null });
    render(<LoginForm next="/perfil" />);
    await userEvent.click(screen.getByRole('button', { name: 'Continuar com Google' }));
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'http://localhost:3000/auth/callback?next=%2Fperfil' },
    });
  });
});
```
(O último teste depende de `window.location.origin` ser `http://localhost:3000`, configurado no Step 2.)

- [ ] **Step 2: Configurar a URL do jsdom**

Em `vitest.config.mts`, dentro de `test`, acrescente:
```ts
    environmentOptions: { jsdom: { url: 'http://localhost:3000' } },
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test -- src/lib/auth src/components/login-form.test.tsx`
Expected: FAIL — módulos não encontrados.

- [ ] **Step 4: Implementar os utilitários**

`src/lib/auth/safe-next.ts`:
```ts
/**
 * Aceita apenas caminhos internos ("/algo"). Recusa URLs absolutas, "//host",
 * barras invertidas e caracteres de controle (o navegador remove TAB/LF e
 * "/\t/evil.com" viraria "//evil.com").
 */
export function safeNextPath(raw: string | null | undefined, fallback = '/'): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return fallback;
  return raw;
}
```

`src/lib/auth/error-messages.ts`:
```ts
const MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
  [/already registered/i, 'Este e-mail já está cadastrado.'],
  [/at least 6 characters/i, 'A senha precisa ter pelo menos 6 caracteres.'],
  [/email not confirmed/i, 'Confirme seu e-mail antes de entrar.'],
];

export function authErrorMessage(message: string): string {
  return MESSAGES.find(([pattern]) => pattern.test(message))?.[1] ?? 'Não foi possível entrar. Tente novamente.';
}
```

`src/lib/auth/protected-routes.ts`:
```ts
export const PROTECTED_PATHS = ['/minha-lista', '/perfil'];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function loginRedirectPath(pathname: string, search: string): string {
  return `/login?next=${encodeURIComponent(pathname + search)}`;
}
```

`src/lib/auth/get-current-user.ts`:
```ts
import 'server-only';
import { cache } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});
```

- [ ] **Step 5: Implementar o formulário**

`src/components/login-form.tsx`:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authErrorMessage } from '@/lib/auth/error-messages';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Mode = 'signin' | 'signup';

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function callbackUrl() {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');
    setPending(true);
    setError(null);
    setInfo(null);

    const supabase = createSupabaseBrowserClient();
    const { data, error: authError } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: callbackUrl() } });
    setPending(false);

    if (authError) {
      setError(authErrorMessage(authError.message));
      return;
    }
    if (!data.session) {
      setInfo('Enviamos um link de confirmação para o seu e-mail.');
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function handleGoogle() {
    setError(null);
    const { error: authError } = await createSupabaseBrowserClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl() },
    });
    if (authError) setError(authErrorMessage(authError.message));
  }

  function switchMode() {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(null);
    setInfo(null);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">E-mail</label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">Senha</label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {info && <p role="status" className="text-sm">{info}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {mode === 'signin' ? 'Entrar' : 'Criar conta'}
        </Button>
      </form>
      <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
        Continuar com Google
      </Button>
      <p className="text-center text-sm">
        {mode === 'signin' ? 'Ainda não tem conta? ' : 'Já tem conta? '}
        <button type="button" className="underline" onClick={switchMode}>
          {mode === 'signin' ? 'Cadastre-se' : 'Entrar'}
        </button>
      </p>
    </div>
  );
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npm test -- src/lib/auth src/components/login-form.test.tsx`
Expected: PASS.

- [ ] **Step 7: Páginas, rotas, menu e proteção**

`src/app/login/page.tsx`:
```tsx
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/login-form';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { safeNextPath } from '@/lib/auth/safe-next';
import type { RawSearchParams } from '@/lib/filters/catalog-filters';

export const metadata: Metadata = { title: 'Entrar' };

type PageProps = { searchParams: Promise<RawSearchParams> };

export default async function LoginPage({ searchParams }: PageProps) {
  const { next, erro } = await searchParams;
  const nextPath = safeNextPath(typeof next === 'string' ? next : undefined);
  if (await getCurrentUser()) redirect(nextPath);

  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="mb-6 text-2xl font-bold">Entrar</h1>
      {erro === 'callback' && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          Não foi possível concluir o login. Tente novamente.
        </p>
      )}
      <LoginForm next={nextPath} />
    </div>
  );
}
```

`src/app/auth/callback/route.ts`:
```ts
import { NextResponse, type NextRequest } from 'next/server';
import { safeNextPath } from '@/lib/auth/safe-next';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?erro=callback`);
}
```

`src/app/auth/signout/route.ts`:
```ts
import { revalidatePath } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
```

`src/components/user-menu.tsx`:
```tsx
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
```

Em `src/app/layout.tsx`, importe `UserMenu` e troque `<SiteHeader />` por:
```tsx
        <SiteHeader userSlot={<UserMenu />} />
```
com o import:
```tsx
import { UserMenu } from '@/components/user-menu';
```

Substitua `src/proxy.ts`:
```ts
import { NextResponse, type NextRequest } from 'next/server';
import { isProtectedPath, loginRedirectPath } from '@/lib/auth/protected-routes';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!userId && isProtectedPath(pathname)) {
    return NextResponse.redirect(new URL(loginRedirectPath(pathname, search), request.url));
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

- [ ] **Step 8: Verificação manual**

Com `npm run dev` (Supabase local rodando):
1. `/minha-lista` sem login → vai para `/login?next=%2Fminha-lista` (a página ainda não existe; depois do login cairá em 404, esperado até a Task 14).
2. "Cadastre-se" com um e-mail qualquer → entra direto (confirmação desativada no Supabase local) e o cabeçalho mostra "Minha lista", "Meus streamings" e "Sair".
3. "Sair" → volta para `/` com "Entrar" no cabeçalho.
4. `/login?next=//evil.com` → após entrar, vai para `/`.

- [ ] **Step 9: Rodar tudo e commit**

Run: `npm test && npm run lint && npm run typecheck` → PASS.
```bash
git add -A
git commit -m "feat: login com e-mail e Google, logout e rotas protegidas" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Dados do usuário — schemas, repositório e Server Actions

**Files:**
- Create: `src/lib/user-data/schemas.ts`, `src/lib/user-data/repository.ts`, `src/lib/user-data/server.ts`, `src/lib/user-data/actions.ts`
- Test: `src/lib/user-data/schemas.test.ts`, `src/lib/user-data/actions.test.ts`, `tests/db/user-data.test.ts`

**Interfaces:**
- Consumes: `Database`, `createSupabaseServerClient` (Task 10); `getCurrentUser` (Task 11); helpers de teste (Task 10).
- Produces:
  - `schemas.ts`: `MOVIE_STATUSES`, `type MovieStatus = 'want' | 'watched'`; `movieRefSchema` / `type MovieRef = { tmdbId: number; title: string; posterPath: string | null }`; `movieStatusSchema`; `tmdbIdSchema`; `providerIdsSchema` (dedup, máx. 50); `interface UserMovie extends MovieRef { status: MovieStatus; updatedAt: string }`; `USER_LIST_PAGE_SIZE = 20`; `parseListTab(raw: string | string[] | undefined): MovieStatus` (padrão `'want'`)
  - `repository.ts` (`type Db = SupabaseClient<Database>`): `getMovieStatus(db, userId, tmdbId): Promise<MovieStatus | null>`; `getWatchedIds(db, userId): Promise<Set<number>>`; `listUserMovies(db, userId, status, page): Promise<{ items: UserMovie[]; totalPages: number }>`; `setMovieStatus(db, userId, movie: MovieRef, status): Promise<void>`; `removeMovie(db, userId, tmdbId): Promise<void>`; `getUserProviderIds(db, userId): Promise<number[]>`; `setUserProviderIds(db, userId, ids: number[]): Promise<void>`
  - `server.ts`: `type UserDb = { db: Db; userId: string }`; `getUserDb(): Promise<UserDb | null>`
  - `actions.ts`: `type ActionResult = { ok: true } | { ok: false; error: string }`; `setMovieStatusAction(movie: MovieRef, status: MovieStatus)`; `removeMovieAction(tmdbId: number)`; `saveProvidersAction(providerIds: number[])` — todas `Promise<ActionResult>`

- [ ] **Step 1: Escrever os testes de schema que falham**

`src/lib/user-data/schemas.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { movieRefSchema, parseListTab, providerIdsSchema } from './schemas';

describe('movieRefSchema', () => {
  it('aceita um filme válido', () => {
    expect(movieRefSchema.parse({ tmdbId: 603, title: ' Matrix ', posterPath: '/abc123.jpg' })).toEqual({
      tmdbId: 603,
      title: 'Matrix',
      posterPath: '/abc123.jpg',
    });
    expect(movieRefSchema.parse({ tmdbId: 1, title: 'X', posterPath: null }).posterPath).toBeNull();
  });

  it.each([
    { tmdbId: 0, title: 'X', posterPath: null },
    { tmdbId: 1.5, title: 'X', posterPath: null },
    { tmdbId: 1, title: '   ', posterPath: null },
    { tmdbId: 1, title: 'x'.repeat(301), posterPath: null },
    { tmdbId: 1, title: 'X', posterPath: 'https://evil.com/a.jpg' },
  ])('recusa %j', (input) => {
    expect(movieRefSchema.safeParse(input).success).toBe(false);
  });
});

describe('providerIdsSchema', () => {
  it('remove duplicados', () => {
    expect(providerIdsSchema.parse([8, 8, 119])).toEqual([8, 119]);
  });
  it('recusa ids inválidos e listas enormes', () => {
    expect(providerIdsSchema.safeParse([-1]).success).toBe(false);
    expect(providerIdsSchema.safeParse(Array.from({ length: 51 }, (_, i) => i + 1)).success).toBe(false);
  });
});

describe('parseListTab', () => {
  it('lê a aba e usa want como padrão', () => {
    expect(parseListTab('watched')).toBe('watched');
    expect(parseListTab('want')).toBe('want');
    expect(parseListTab('xpto')).toBe('want');
    expect(parseListTab(undefined)).toBe('want');
  });
});
```

- [ ] **Step 2: Rodar, ver falhar, implementar e ver passar**

Run: `npm test -- src/lib/user-data/schemas.test.ts` → FAIL (módulo ausente).

`src/lib/user-data/schemas.ts`:
```ts
import { z } from 'zod';

export const MOVIE_STATUSES = ['want', 'watched'] as const;
export type MovieStatus = (typeof MOVIE_STATUSES)[number];
export const movieStatusSchema = z.enum(MOVIE_STATUSES);

export const tmdbIdSchema = z.number().int().positive();

export const movieRefSchema = z.object({
  tmdbId: tmdbIdSchema,
  title: z.string().trim().min(1).max(300),
  posterPath: z.string().regex(/^\/[\w.-]+$/).nullable(),
});
export type MovieRef = z.infer<typeof movieRefSchema>;

export const providerIdsSchema = z
  .array(z.number().int().positive())
  .max(50)
  .transform((ids) => [...new Set(ids)]);

export interface UserMovie extends MovieRef {
  status: MovieStatus;
  updatedAt: string;
}

export const USER_LIST_PAGE_SIZE = 20;

export function parseListTab(raw: string | string[] | undefined): MovieStatus {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === 'watched' ? 'watched' : 'want';
}
```

Run: `npm test -- src/lib/user-data/schemas.test.ts` → PASS.

- [ ] **Step 3: Escrever os testes de repositório (banco) que falham**

`tests/db/user-data.test.ts`:
```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  getMovieStatus,
  getUserProviderIds,
  getWatchedIds,
  listUserMovies,
  removeMovie,
  setMovieStatus,
  setUserProviderIds,
} from '@/lib/user-data/repository';
import { createTestUser, deleteTestUser, type TestUser } from './helpers';

let user: TestUser;
const matrix = { tmdbId: 603, title: 'Matrix', posterPath: '/matrix.jpg' };

beforeAll(async () => {
  user = await createTestUser();
});
afterAll(async () => {
  await deleteTestUser(user.id);
});

describe('status dos filmes', () => {
  it('want → watched mantém uma única linha', async () => {
    await setMovieStatus(user.client, user.id, matrix, 'want');
    expect(await getMovieStatus(user.client, user.id, 603)).toBe('want');

    await setMovieStatus(user.client, user.id, matrix, 'watched');
    expect(await getMovieStatus(user.client, user.id, 603)).toBe('watched');

    const want = await listUserMovies(user.client, user.id, 'want', 1);
    expect(want.items.find((m) => m.tmdbId === 603)).toBeUndefined();
    expect(await getWatchedIds(user.client, user.id)).toEqual(new Set([603]));
  });

  it('remover apaga o filme', async () => {
    await removeMovie(user.client, user.id, 603);
    expect(await getMovieStatus(user.client, user.id, 603)).toBeNull();
  });
});

describe('listUserMovies', () => {
  it('pagina de 20 em 20, mais recentes primeiro', async () => {
    for (let i = 1; i <= 21; i++) {
      await setMovieStatus(user.client, user.id, { tmdbId: 1000 + i, title: `Filme ${i}`, posterPath: null }, 'want');
    }
    const p1 = await listUserMovies(user.client, user.id, 'want', 1);
    expect(p1.items).toHaveLength(20);
    expect(p1.totalPages).toBe(2);
    expect(p1.items[0]).toMatchObject({ tmdbId: 1021, title: 'Filme 21', posterPath: null, status: 'want' });

    const p2 = await listUserMovies(user.client, user.id, 'want', 2);
    expect(p2.items.map((m) => m.tmdbId)).toEqual([1001]);
  });

  it('página além do fim volta vazia, sem erro', async () => {
    const result = await listUserMovies(user.client, user.id, 'want', 99);
    expect(result.items).toEqual([]);
  });
});

describe('streamings do usuário', () => {
  it('substitui a seleção e aceita lista vazia', async () => {
    await setUserProviderIds(user.client, user.id, [8, 119]);
    expect(await getUserProviderIds(user.client, user.id)).toEqual([8, 119]);

    await setUserProviderIds(user.client, user.id, [119, 337]);
    expect(await getUserProviderIds(user.client, user.id)).toEqual([119, 337]);

    await setUserProviderIds(user.client, user.id, []);
    expect(await getUserProviderIds(user.client, user.id)).toEqual([]);
  });
});
```

Run: `npm run test:db` → FAIL (`@/lib/user-data/repository` ausente).

- [ ] **Step 4: Implementar o repositório**

`src/lib/user-data/repository.ts`:
```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { USER_LIST_PAGE_SIZE, type MovieRef, type MovieStatus, type UserMovie } from './schemas';

export type Db = SupabaseClient<Database>;

/** PostgREST responde PGRST103 quando o offset passa do total de linhas. */
const RANGE_NOT_SATISFIABLE = 'PGRST103';

export async function getMovieStatus(db: Db, userId: string, tmdbId: number): Promise<MovieStatus | null> {
  const { data, error } = await db
    .from('user_movies')
    .select('status')
    .eq('user_id', userId)
    .eq('tmdb_id', tmdbId)
    .maybeSingle();
  if (error) throw error;
  return (data?.status as MovieStatus | undefined) ?? null;
}

export async function getWatchedIds(db: Db, userId: string): Promise<Set<number>> {
  const { data, error } = await db
    .from('user_movies')
    .select('tmdb_id')
    .eq('user_id', userId)
    .eq('status', 'watched');
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.tmdb_id));
}

export async function listUserMovies(
  db: Db,
  userId: string,
  status: MovieStatus,
  page: number,
): Promise<{ items: UserMovie[]; totalPages: number }> {
  const from = (page - 1) * USER_LIST_PAGE_SIZE;
  const { data, error, count } = await db
    .from('user_movies')
    .select('tmdb_id, title, poster_path, status, updated_at', { count: 'exact' })
    .eq('user_id', userId)
    .eq('status', status)
    .order('updated_at', { ascending: false })
    .range(from, from + USER_LIST_PAGE_SIZE - 1);

  if (error?.code === RANGE_NOT_SATISFIABLE) return { items: [], totalPages: 1 };
  if (error) throw error;

  return {
    items: (data ?? []).map((row) => ({
      tmdbId: row.tmdb_id,
      title: row.title,
      posterPath: row.poster_path,
      status: row.status as MovieStatus,
      updatedAt: row.updated_at,
    })),
    totalPages: Math.max(1, Math.ceil((count ?? 0) / USER_LIST_PAGE_SIZE)),
  };
}

export async function setMovieStatus(db: Db, userId: string, movie: MovieRef, status: MovieStatus): Promise<void> {
  const { error } = await db.from('user_movies').upsert(
    {
      user_id: userId,
      tmdb_id: movie.tmdbId,
      title: movie.title,
      poster_path: movie.posterPath,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,tmdb_id' },
  );
  if (error) throw error;
}

export async function removeMovie(db: Db, userId: string, tmdbId: number): Promise<void> {
  const { error } = await db.from('user_movies').delete().eq('user_id', userId).eq('tmdb_id', tmdbId);
  if (error) throw error;
}

export async function getUserProviderIds(db: Db, userId: string): Promise<number[]> {
  const { data, error } = await db
    .from('user_providers')
    .select('provider_id')
    .eq('user_id', userId)
    .order('provider_id');
  if (error) throw error;
  return (data ?? []).map((row) => row.provider_id);
}

export async function setUserProviderIds(db: Db, userId: string, ids: number[]): Promise<void> {
  const removal = db.from('user_providers').delete().eq('user_id', userId);
  const { error: deleteError } =
    ids.length > 0 ? await removal.not('provider_id', 'in', `(${ids.join(',')})`) : await removal;
  if (deleteError) throw deleteError;

  if (ids.length === 0) return;
  const { error } = await db
    .from('user_providers')
    .upsert(
      ids.map((provider_id) => ({ user_id: userId, provider_id })),
      { onConflict: 'user_id,provider_id', ignoreDuplicates: true },
    );
  if (error) throw error;
}
```

- [ ] **Step 5: Rodar os testes de banco**

Run: `npm run test:db`
Expected: PASS (RLS + user-data). Se o teste "página além do fim" falhar com um código diferente de `PGRST103`, ajuste `RANGE_NOT_SATISFIABLE` para o código mostrado no erro.

- [ ] **Step 6: Escrever os testes das actions que falham**

`src/lib/user-data/actions.test.ts`:
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { removeMovieAction, saveProvidersAction, setMovieStatusAction } from './actions';

const mocks = vi.hoisted(() => ({
  getUserDb: vi.fn(),
  setMovieStatus: vi.fn(),
  removeMovie: vi.fn(),
  setUserProviderIds: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock('./server', () => ({ getUserDb: mocks.getUserDb }));
vi.mock('./repository', () => ({
  setMovieStatus: mocks.setMovieStatus,
  removeMovie: mocks.removeMovie,
  setUserProviderIds: mocks.setUserProviderIds,
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

const ctx = { db: {} as never, userId: 'user-1' };
const movie = { tmdbId: 603, title: 'Matrix', posterPath: '/matrix.jpg' };

describe('setMovieStatusAction', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('recusa dados inválidos sem consultar o usuário', async () => {
    expect(await setMovieStatusAction({ ...movie, tmdbId: -1 }, 'want')).toEqual({ ok: false, error: 'Dados inválidos.' });
    expect(await setMovieStatusAction(movie, 'loved' as never)).toEqual({ ok: false, error: 'Dados inválidos.' });
    expect(mocks.getUserDb).not.toHaveBeenCalled();
  });

  it('recusa quando não há usuário logado', async () => {
    mocks.getUserDb.mockResolvedValueOnce(null);
    expect(await setMovieStatusAction(movie, 'want')).toEqual({ ok: false, error: 'Você precisa entrar para fazer isso.' });
    expect(mocks.setMovieStatus).not.toHaveBeenCalled();
  });

  it('salva e revalida as páginas afetadas', async () => {
    mocks.getUserDb.mockResolvedValueOnce(ctx);
    mocks.setMovieStatus.mockResolvedValueOnce(undefined);
    expect(await setMovieStatusAction(movie, 'watched')).toEqual({ ok: true });
    expect(mocks.setMovieStatus).toHaveBeenCalledWith(ctx.db, 'user-1', movie, 'watched');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/filme/603');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/minha-lista');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/');
  });

  it('transforma erro do banco em mensagem amigável', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.getUserDb.mockResolvedValueOnce(ctx);
    mocks.setMovieStatus.mockRejectedValueOnce(new Error('boom'));
    expect(await setMovieStatusAction(movie, 'want')).toEqual({ ok: false, error: 'Não foi possível salvar. Tente novamente.' });
  });
});

describe('removeMovieAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('valida o id e remove', async () => {
    expect(await removeMovieAction(0)).toEqual({ ok: false, error: 'Dados inválidos.' });
    mocks.getUserDb.mockResolvedValueOnce(ctx);
    mocks.removeMovie.mockResolvedValueOnce(undefined);
    expect(await removeMovieAction(603)).toEqual({ ok: true });
    expect(mocks.removeMovie).toHaveBeenCalledWith(ctx.db, 'user-1', 603);
  });
});

describe('saveProvidersAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('salva sem duplicados e revalida perfil e catálogo', async () => {
    mocks.getUserDb.mockResolvedValueOnce(ctx);
    mocks.setUserProviderIds.mockResolvedValueOnce(undefined);
    expect(await saveProvidersAction([8, 8, 119])).toEqual({ ok: true });
    expect(mocks.setUserProviderIds).toHaveBeenCalledWith(ctx.db, 'user-1', [8, 119]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/perfil');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/');
  });
});
```

Run: `npm test -- src/lib/user-data/actions.test.ts` → FAIL (`./actions` ausente).

- [ ] **Step 7: Implementar `server.ts` e as actions**

`src/lib/user-data/server.ts`:
```ts
import 'server-only';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Db } from './repository';

export type UserDb = { db: Db; userId: string };

export async function getUserDb(): Promise<UserDb | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return { db: await createSupabaseServerClient(), userId: user.id };
}
```

`src/lib/user-data/actions.ts`:
```ts
'use server';

import { revalidatePath } from 'next/cache';
import { removeMovie, setMovieStatus, setUserProviderIds } from './repository';
import {
  movieRefSchema,
  movieStatusSchema,
  providerIdsSchema,
  tmdbIdSchema,
  type MovieRef,
  type MovieStatus,
} from './schemas';
import { getUserDb, type UserDb } from './server';

export type ActionResult = { ok: true } | { ok: false; error: string };

const INVALID: ActionResult = { ok: false, error: 'Dados inválidos.' };
const NOT_LOGGED_IN: ActionResult = { ok: false, error: 'Você precisa entrar para fazer isso.' };
const SAVE_FAILED: ActionResult = { ok: false, error: 'Não foi possível salvar. Tente novamente.' };

async function run(work: (ctx: UserDb) => Promise<void>, paths: string[]): Promise<ActionResult> {
  const ctx = await getUserDb();
  if (!ctx) return NOT_LOGGED_IN;
  try {
    await work(ctx);
  } catch (error) {
    console.error('[user-data]', error);
    return SAVE_FAILED;
  }
  paths.forEach((path) => revalidatePath(path));
  return { ok: true };
}

const moviePaths = (tmdbId: number) => [`/filme/${tmdbId}`, '/minha-lista', '/'];

export async function setMovieStatusAction(movie: MovieRef, status: MovieStatus): Promise<ActionResult> {
  const parsedMovie = movieRefSchema.safeParse(movie);
  const parsedStatus = movieStatusSchema.safeParse(status);
  if (!parsedMovie.success || !parsedStatus.success) return INVALID;
  return run(
    ({ db, userId }) => setMovieStatus(db, userId, parsedMovie.data, parsedStatus.data),
    moviePaths(parsedMovie.data.tmdbId),
  );
}

export async function removeMovieAction(tmdbId: number): Promise<ActionResult> {
  const parsed = tmdbIdSchema.safeParse(tmdbId);
  if (!parsed.success) return INVALID;
  return run(({ db, userId }) => removeMovie(db, userId, parsed.data), moviePaths(parsed.data));
}

export async function saveProvidersAction(providerIds: number[]): Promise<ActionResult> {
  const parsed = providerIdsSchema.safeParse(providerIds);
  if (!parsed.success) return INVALID;
  return run(({ db, userId }) => setUserProviderIds(db, userId, parsed.data), ['/perfil', '/']);
}
```

- [ ] **Step 8: Rodar tudo**

Run: `npm test && npm run test:db && npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/user-data tests/db
git commit -m "feat: repositório e Server Actions dos dados do usuário" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Botões "Quero assistir" / "Assistido" na página de detalhes

**Files:**
- Create: `src/components/list-buttons.tsx`
- Modify: `src/app/filme/[id]/page.tsx`
- Test: `src/components/list-buttons.test.tsx`

**Interfaces:**
- Consumes: `setMovieStatusAction`, `removeMovieAction`, `ActionResult` (Task 12); `MovieRef`, `MovieStatus` (Task 12); `getUserDb`, `getMovieStatus` (Task 12).
- Produces: `<ListButtons movie={MovieRef} initialStatus={MovieStatus | null} isLoggedIn={boolean} />` — atualização otimista; em falha, `toast.error(mensagem)` e estado revertido; sem login, `router.push('/login?next=<pathname>')`.

- [ ] **Step 1: Escrever os testes que falham**

`src/components/list-buttons.test.tsx`:
```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ListButtons } from './list-buttons';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  setMovieStatusAction: vi.fn(),
  removeMovieAction: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }), usePathname: () => '/filme/603' }));
vi.mock('@/lib/user-data/actions', () => ({
  setMovieStatusAction: mocks.setMovieStatusAction,
  removeMovieAction: mocks.removeMovieAction,
}));
vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: vi.fn() } }));

const movie = { tmdbId: 603, title: 'Matrix', posterPath: '/matrix.jpg' };

describe('ListButtons', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sem login, manda para o login com o destino', async () => {
    render(<ListButtons movie={movie} initialStatus={null} isLoggedIn={false} />);
    await userEvent.click(screen.getByRole('button', { name: '+ Quero assistir' }));
    expect(mocks.push).toHaveBeenCalledWith('/login?next=%2Ffilme%2F603');
    expect(mocks.setMovieStatusAction).not.toHaveBeenCalled();
  });

  it('adiciona à lista', async () => {
    mocks.setMovieStatusAction.mockResolvedValueOnce({ ok: true });
    render(<ListButtons movie={movie} initialStatus={null} isLoggedIn />);
    await userEvent.click(screen.getByRole('button', { name: '+ Quero assistir' }));
    expect(await screen.findByRole('button', { name: '✓ Na lista' })).toHaveAttribute('aria-pressed', 'true');
    expect(mocks.setMovieStatusAction).toHaveBeenCalledWith(movie, 'want');
  });

  it('clicar de novo remove da lista', async () => {
    mocks.removeMovieAction.mockResolvedValueOnce({ ok: true });
    render(<ListButtons movie={movie} initialStatus="want" isLoggedIn />);
    await userEvent.click(screen.getByRole('button', { name: '✓ Na lista' }));
    expect(await screen.findByRole('button', { name: '+ Quero assistir' })).toBeInTheDocument();
    expect(mocks.removeMovieAction).toHaveBeenCalledWith(603);
  });

  it('marca como assistido', async () => {
    mocks.setMovieStatusAction.mockResolvedValueOnce({ ok: true });
    render(<ListButtons movie={movie} initialStatus="want" isLoggedIn />);
    await userEvent.click(screen.getByRole('button', { name: 'Marcar como assistido' }));
    expect(await screen.findByRole('button', { name: '✓ Assistido' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Quero assistir' })).toBeInTheDocument();
  });

  it('em caso de erro, avisa e desfaz', async () => {
    mocks.setMovieStatusAction.mockResolvedValueOnce({ ok: false, error: 'Não foi possível salvar. Tente novamente.' });
    render(<ListButtons movie={movie} initialStatus={null} isLoggedIn />);
    await userEvent.click(screen.getByRole('button', { name: '+ Quero assistir' }));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('Não foi possível salvar. Tente novamente.'));
    expect(await screen.findByRole('button', { name: '+ Quero assistir' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/components/list-buttons.test.tsx`
Expected: FAIL — `./list-buttons` ausente.

- [ ] **Step 3: Implementar**

`src/components/list-buttons.tsx`:
```tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useOptimistic, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { removeMovieAction, setMovieStatusAction } from '@/lib/user-data/actions';
import type { MovieRef, MovieStatus } from '@/lib/user-data/schemas';

interface ListButtonsProps {
  movie: MovieRef;
  initialStatus: MovieStatus | null;
  isLoggedIn: boolean;
}

export function ListButtons({ movie, initialStatus, isLoggedIn }: ListButtonsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<MovieStatus | null>(initialStatus);
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);
  const [isPending, startTransition] = useTransition();

  function change(next: MovieStatus | null) {
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    startTransition(async () => {
      setOptimisticStatus(next);
      const result = next === null ? await removeMovieAction(movie.tmdbId) : await setMovieStatusAction(movie, next);
      if (result.ok) setStatus(next);
      else toast.error(result.error);
    });
  }

  const isWant = optimisticStatus === 'want';
  const isWatched = optimisticStatus === 'watched';

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={isWant ? 'default' : 'outline'}
        aria-pressed={isWant}
        disabled={isPending}
        onClick={() => change(isWant ? null : 'want')}
      >
        {isWant ? '✓ Na lista' : '+ Quero assistir'}
      </Button>
      <Button
        variant={isWatched ? 'default' : 'outline'}
        aria-pressed={isWatched}
        disabled={isPending}
        onClick={() => change(isWatched ? null : 'watched')}
      >
        {isWatched ? '✓ Assistido' : 'Marcar como assistido'}
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/components/list-buttons.test.tsx`
Expected: PASS.

- [ ] **Step 5: Ligar na página de detalhes**

Em `src/app/filme/[id]/page.tsx`, acrescente os imports:
```tsx
import { ListButtons } from '@/components/list-buttons';
import { getMovieStatus } from '@/lib/user-data/repository';
import { getUserDb } from '@/lib/user-data/server';
```
No início de `MoviePage`, logo após `const movie = await loadMovie(...)`, acrescente:
```tsx
  const ctx = await getUserDb();
  const status = ctx ? await getMovieStatus(ctx.db, ctx.userId, movie.id) : null;
```
E logo após o `</header>` (antes de `<WatchProvidersSection …/>`), insira:
```tsx
        <ListButtons
          movie={{ tmdbId: movie.id, title: movie.title, posterPath: movie.posterPath }}
          initialStatus={status}
          isLoggedIn={ctx !== null}
        />
```

- [ ] **Step 6: Verificação manual**

Com `npm run dev`: deslogado, clicar "+ Quero assistir" em `/filme/603` leva ao login e, após entrar, volta ao filme. Logado, os botões alternam e o estado persiste ao recarregar.

- [ ] **Step 7: Rodar tudo e commit**

Run: `npm test && npm run lint && npm run typecheck` → PASS.
```bash
git add -A
git commit -m "feat: botões Quero assistir e Assistido com atualização otimista" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Página "Minha lista"

**Files:**
- Create: `src/lib/catalog/load-availability.ts`, `src/components/user-movie-item.tsx`, `src/app/minha-lista/page.tsx`
- Test: `src/lib/catalog/load-availability.test.ts`, `src/components/user-movie-item.test.tsx`

**Interfaces:**
- Consumes: `getMovieWatchProviders` (Task 5); `listUserMovies`, `parseListTab`, `getUserDb`, `UserMovie` (Task 12); `ListButtons` (Task 13); `Pagination` (Task 6); `parsePageParam` (Task 2).
- Produces:
  - `type Availability = { status: 'ok'; providers: Provider[] } | { status: 'error' }`
  - `loadAvailability(ids: number[], fetcher: (id: number) => Promise<WatchProviders>): Promise<Map<number, Availability>>`
  - `<UserMovieItem movie={UserMovie} availability={Availability | undefined} />` (renderiza um `<li>`)

- [ ] **Step 1: Escrever os testes que falham**

`src/lib/catalog/load-availability.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { loadAvailability } from './load-availability';

const netflix = { id: 8, name: 'Netflix', logoPath: null, displayPriority: 1 };

describe('loadAvailability', () => {
  it('uma falha não derruba os outros filmes', async () => {
    const fetcher = async (id: number) => {
      if (id === 2) throw new Error('TMDB fora do ar');
      return { link: null, flatrate: id === 1 ? [netflix] : [], rent: [], buy: [] };
    };
    const result = await loadAvailability([1, 2, 3], fetcher);
    expect(result.get(1)).toEqual({ status: 'ok', providers: [netflix] });
    expect(result.get(2)).toEqual({ status: 'error' });
    expect(result.get(3)).toEqual({ status: 'ok', providers: [] });
  });

  it('lista vazia não chama o fetcher', async () => {
    const result = await loadAvailability([], async () => {
      throw new Error('não deveria chamar');
    });
    expect(result.size).toBe(0);
  });
});
```

`src/components/user-movie-item.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UserMovieItem } from './user-movie-item';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/minha-lista' }));
vi.mock('@/lib/user-data/actions', () => ({ setMovieStatusAction: vi.fn(), removeMovieAction: vi.fn() }));

const movie = { tmdbId: 603, title: 'Matrix', posterPath: null, status: 'want' as const, updatedAt: '2026-09-29T00:00:00Z' };
const netflix = { id: 8, name: 'Netflix', logoPath: null, displayPriority: 1 };

function renderItem(availability: Parameters<typeof UserMovieItem>[0]['availability']) {
  return render(
    <ul>
      <UserMovieItem movie={movie} availability={availability} />
    </ul>,
  );
}

describe('UserMovieItem', () => {
  it('mostra título com link e onde está disponível', () => {
    renderItem({ status: 'ok', providers: [netflix] });
    expect(screen.getByRole('link', { name: 'Matrix' })).toHaveAttribute('href', '/filme/603');
    expect(screen.getByText('Disponível em: Netflix')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '✓ Na lista' })).toBeInTheDocument();
  });

  it('avisa quando não está em nenhuma assinatura', () => {
    renderItem({ status: 'ok', providers: [] });
    expect(screen.getByText('Não está disponível por assinatura no momento.')).toBeInTheDocument();
  });

  it('avisa quando a consulta falhou', () => {
    renderItem({ status: 'error' });
    expect(screen.getByText('Não foi possível verificar a disponibilidade agora.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/lib/catalog/load-availability.test.ts src/components/user-movie-item.test.tsx`
Expected: FAIL — módulos ausentes.

- [ ] **Step 3: Implementar**

`src/lib/catalog/load-availability.ts`:
```ts
import type { Provider, WatchProviders } from '@/lib/tmdb/types';

export type Availability = { status: 'ok'; providers: Provider[] } | { status: 'error' };

/** Busca a disponibilidade de vários filmes em paralelo; falhas viram { status: 'error' }. */
export async function loadAvailability(
  ids: number[],
  fetcher: (id: number) => Promise<WatchProviders>,
): Promise<Map<number, Availability>> {
  const results = await Promise.allSettled(ids.map((id) => fetcher(id)));
  return new Map(
    ids.map((id, i): [number, Availability] => {
      const result = results[i];
      return [id, result.status === 'fulfilled' ? { status: 'ok', providers: result.value.flatrate } : { status: 'error' }];
    }),
  );
}
```

`src/components/user-movie-item.tsx`:
```tsx
import Image from 'next/image';
import Link from 'next/link';
import type { Availability } from '@/lib/catalog/load-availability';
import { tmdbImageUrl } from '@/lib/tmdb/images';
import type { UserMovie } from '@/lib/user-data/schemas';
import { ListButtons } from './list-buttons';

function AvailabilityLine({ availability }: { availability: Availability | undefined }) {
  if (!availability || availability.status === 'error') {
    return <p className="text-sm text-muted-foreground">Não foi possível verificar a disponibilidade agora.</p>;
  }
  if (availability.providers.length === 0) {
    return <p className="text-sm text-muted-foreground">Não está disponível por assinatura no momento.</p>;
  }
  return <p className="text-sm">Disponível em: {availability.providers.map((p) => p.name).join(', ')}</p>;
}

export function UserMovieItem({ movie, availability }: { movie: UserMovie; availability: Availability | undefined }) {
  const poster = tmdbImageUrl(movie.posterPath, 'w185');
  const href = `/filme/${movie.tmdbId}`;
  return (
    <li className="flex gap-4 rounded-lg border p-3">
      <Link href={href} aria-hidden tabIndex={-1} className="relative h-36 w-24 shrink-0 overflow-hidden rounded bg-muted">
        {poster && <Image src={poster} alt="" fill sizes="96px" className="object-cover" />}
      </Link>
      <div className="flex flex-1 flex-col gap-2">
        <Link href={href} className="font-medium hover:underline">
          {movie.title}
        </Link>
        <AvailabilityLine availability={availability} />
        <ListButtons
          movie={{ tmdbId: movie.tmdbId, title: movie.title, posterPath: movie.posterPath }}
          initialStatus={movie.status}
          isLoggedIn
        />
      </div>
    </li>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/lib/catalog src/components/user-movie-item.test.tsx`
Expected: PASS.

- [ ] **Step 5: Página**

`src/app/minha-lista/page.tsx`:
```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Pagination } from '@/components/pagination';
import { buttonVariants } from '@/components/ui/button';
import { UserMovieItem } from '@/components/user-movie-item';
import { loadAvailability } from '@/lib/catalog/load-availability';
import { parsePageParam, type RawSearchParams } from '@/lib/filters/catalog-filters';
import { getMovieWatchProviders } from '@/lib/tmdb/movies';
import { listUserMovies } from '@/lib/user-data/repository';
import { parseListTab, type MovieStatus } from '@/lib/user-data/schemas';
import { getUserDb } from '@/lib/user-data/server';

export const metadata: Metadata = { title: 'Minha lista' };

const TABS: { status: MovieStatus; label: string; empty: string }[] = [
  { status: 'want', label: 'Quero assistir', empty: 'Sua lista está vazia. Explore o catálogo e adicione filmes.' },
  { status: 'watched', label: 'Assistidos', empty: 'Nenhum filme marcado como assistido.' },
];

type PageProps = { searchParams: Promise<RawSearchParams> };

function tabHref(status: MovieStatus, page = 1): string {
  return `/minha-lista?tab=${status}${page > 1 ? `&page=${page}` : ''}`;
}

export default async function MyListPage({ searchParams }: PageProps) {
  const ctx = await getUserDb();
  if (!ctx) redirect('/login?next=%2Fminha-lista');

  const params = await searchParams;
  const tab = parseListTab(params.tab);
  const page = parsePageParam(params.page);
  const { items, totalPages } = await listUserMovies(ctx.db, ctx.userId, tab, page);
  const availability = await loadAvailability(items.map((m) => m.tmdbId), getMovieWatchProviders);
  const current = TABS.find((t) => t.status === tab)!;

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Minha lista</h1>
      <nav aria-label="Abas da lista" className="mb-6 flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.status}
            href={tabHref(t.status)}
            aria-current={t.status === tab ? 'page' : undefined}
            className={buttonVariants({ variant: t.status === tab ? 'default' : 'outline' })}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {items.length === 0 ? (
        <p className="py-8 text-muted-foreground">{current.empty}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((movie) => (
            <UserMovieItem key={movie.tmdbId} movie={movie} availability={availability.get(movie.tmdbId)} />
          ))}
        </ul>
      )}
      <Pagination page={page} totalPages={totalPages} hrefForPage={(p) => tabHref(tab, p)} />
    </>
  );
}
```

- [ ] **Step 6: Verificação manual**

Logado: adicione dois filmes em "Quero assistir" e marque um como assistido. `/minha-lista` mostra a aba certa com a disponibilidade; `/minha-lista?page=99` mostra a mensagem de lista vazia sem erro.

- [ ] **Step 7: Rodar tudo e commit**

Run: `npm test && npm run lint && npm run typecheck` → PASS.
```bash
git add -A
git commit -m "feat: página Minha lista com disponibilidade atual" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: "Meus streamings" (perfil)

**Files:**
- Create: `src/lib/catalog/provider-options.ts`, `src/components/provider-picker.tsx`, `src/app/perfil/page.tsx`
- Test: `src/lib/catalog/provider-options.test.ts`, `src/components/provider-picker.test.tsx`

**Interfaces:**
- Consumes: `getBrProviders` (Task 4); `saveProvidersAction` (Task 12); `getUserProviderIds`, `getUserDb` (Task 12).
- Produces:
  - `withSelectedProviders(base: Provider[], all: Provider[], selectedIds: number[]): Provider[]` — `base` + os selecionados que estão em `all` mas não em `base`, sem duplicar, na ordem de prioridade
  - `<ProviderPicker providers={Provider[]} initialSelected={number[]} />`

- [ ] **Step 1: Escrever os testes que falham**

`src/lib/catalog/provider-options.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { withSelectedProviders } from './provider-options';

const p = (id: number, displayPriority: number) => ({ id, name: `P${id}`, logoPath: null, displayPriority });
const all = [p(8, 1), p(119, 2), p(337, 3), p(999, 40)];

describe('withSelectedProviders', () => {
  it('acrescenta selecionados fora da lista base, mantendo a prioridade', () => {
    expect(withSelectedProviders(all.slice(0, 2), all, [999, 8]).map((x) => x.id)).toEqual([8, 119, 999]);
  });
  it('ignora ids desconhecidos e não duplica', () => {
    expect(withSelectedProviders(all.slice(0, 2), all, [8, 12345]).map((x) => x.id)).toEqual([8, 119]);
  });
});
```

`src/components/provider-picker.test.tsx`:
```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProviderPicker } from './provider-picker';

const mocks = vi.hoisted(() => ({ saveProvidersAction: vi.fn(), toastSuccess: vi.fn(), toastError: vi.fn() }));
vi.mock('@/lib/user-data/actions', () => ({ saveProvidersAction: mocks.saveProvidersAction }));
vi.mock('sonner', () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }));

const providers = [
  { id: 8, name: 'Netflix', logoPath: null, displayPriority: 1 },
  { id: 119, name: 'Amazon Prime Video', logoPath: null, displayPriority: 2 },
  { id: 337, name: 'Disney Plus', logoPath: null, displayPriority: 3 },
];

describe('ProviderPicker', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marca os já escolhidos e salva a nova seleção ordenada', async () => {
    mocks.saveProvidersAction.mockResolvedValueOnce({ ok: true });
    render(<ProviderPicker providers={providers} initialSelected={[119]} />);
    expect(screen.getByLabelText('Amazon Prime Video')).toBeChecked();

    await userEvent.click(screen.getByLabelText('Disney Plus'));
    await userEvent.click(screen.getByLabelText('Netflix'));
    await userEvent.click(screen.getByLabelText('Amazon Prime Video'));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(mocks.saveProvidersAction).toHaveBeenCalledWith([8, 337]);
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith('Streamings salvos!'));
  });

  it('mostra o erro quando salvar falha', async () => {
    mocks.saveProvidersAction.mockResolvedValueOnce({ ok: false, error: 'Não foi possível salvar. Tente novamente.' });
    render(<ProviderPicker providers={providers} initialSelected={[]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('Não foi possível salvar. Tente novamente.'));
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/lib/catalog/provider-options.test.ts src/components/provider-picker.test.tsx`
Expected: FAIL — módulos ausentes.

- [ ] **Step 3: Implementar**

`src/lib/catalog/provider-options.ts`:
```ts
import type { Provider } from '@/lib/tmdb/types';

/** Lista base + provedores selecionados que ficaram de fora, ordenados por prioridade. */
export function withSelectedProviders(base: Provider[], all: Provider[], selectedIds: number[]): Provider[] {
  const baseIds = new Set(base.map((p) => p.id));
  const extras = all.filter((p) => selectedIds.includes(p.id) && !baseIds.has(p.id));
  return [...base, ...extras].sort((a, b) => a.displayPriority - b.displayPriority);
}
```

`src/components/provider-picker.tsx`:
```tsx
'use client';

import Image from 'next/image';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { tmdbImageUrl } from '@/lib/tmdb/images';
import type { Provider } from '@/lib/tmdb/types';
import { saveProvidersAction } from '@/lib/user-data/actions';

export function ProviderPicker({ providers, initialSelected }: { providers: Provider[]; initialSelected: number[] }) {
  const [selected, setSelected] = useState(() => new Set(initialSelected));
  const [isPending, startTransition] = useTransition();

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      const result = await saveProvidersAction([...selected].sort((a, b) => a - b));
      if (result.ok) toast.success('Streamings salvos!');
      else toast.error(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => {
          const logo = tmdbImageUrl(provider.logoPath, 'w92');
          const id = `provider-${provider.id}`;
          return (
            <li key={provider.id} className="flex items-center gap-3 rounded-md border p-2">
              <input id={id} type="checkbox" checked={selected.has(provider.id)} onChange={() => toggle(provider.id)} />
              {logo && <Image src={logo} alt="" width={28} height={28} className="rounded" />}
              <label htmlFor={id} className="flex-1 cursor-pointer text-sm">{provider.name}</label>
            </li>
          );
        })}
      </ul>
      <Button onClick={save} disabled={isPending}>
        Salvar
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/lib/catalog src/components/provider-picker.test.tsx`
Expected: PASS.

- [ ] **Step 5: Página**

`src/app/perfil/page.tsx`:
```tsx
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ProviderPicker } from '@/components/provider-picker';
import { withSelectedProviders } from '@/lib/catalog/provider-options';
import { getBrProviders } from '@/lib/tmdb/catalog-meta';
import { getUserProviderIds } from '@/lib/user-data/repository';
import { getUserDb } from '@/lib/user-data/server';

export const metadata: Metadata = { title: 'Meus streamings' };

const PROFILE_PROVIDER_COUNT = 40;

export default async function ProfilePage() {
  const ctx = await getUserDb();
  if (!ctx) redirect('/login?next=%2Fperfil');

  const [allProviders, selected] = await Promise.all([getBrProviders(), getUserProviderIds(ctx.db, ctx.userId)]);
  const providers = withSelectedProviders(allProviders.slice(0, PROFILE_PROVIDER_COUNT), allProviders, selected);

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">Meus streamings</h1>
      <p className="mb-6 text-muted-foreground">
        Escolha os serviços que você assina. O catálogo vai abrir filtrado por eles.
      </p>
      <ProviderPicker providers={providers} initialSelected={selected} />
    </>
  );
}
```

- [ ] **Step 6: Verificação manual**

Logado: em `/perfil`, marque Netflix e Disney Plus, salve (toast "Streamings salvos!") e recarregue — seleção mantida.

- [ ] **Step 7: Rodar tudo e commit**

Run: `npm test && npm run lint && npm run typecheck` → PASS.
```bash
git add -A
git commit -m "feat: seleção de Meus streamings no perfil" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Catálogo personalizado (streamings do usuário e ocultar assistidos)

**Files:**
- Create: `src/components/user-providers-chip.tsx`
- Modify: `src/app/page.tsx` (substituir por completo)
- Test: `src/components/user-providers-chip.test.tsx`

**Interfaces:**
- Consumes: `resolveProviderIds`, `removeWatched` (Task 7); `withSelectedProviders` (Task 15); `getUserDb`, `getUserProviderIds`, `getWatchedIds` (Task 12); `getBrProviders`, `DEFAULT_PROVIDER_COUNT` (Task 4).
- Produces: `<UserProvidersChip clearHref={string} />`.

- [ ] **Step 1: Escrever o teste que falha**

`src/components/user-providers-chip.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UserProvidersChip } from './user-providers-chip';

describe('UserProvidersChip', () => {
  it('avisa do filtro e oferece ver todos', () => {
    render(<UserProvidersChip clearHref="/?providers=all" />);
    expect(screen.getByText('Filtrando pelos seus streamings')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver todos' })).toHaveAttribute('href', '/?providers=all');
  });
});
```

- [ ] **Step 2: Rodar, ver falhar, implementar e ver passar**

Run: `npm test -- src/components/user-providers-chip.test.tsx` → FAIL.

`src/components/user-providers-chip.tsx`:
```tsx
import Link from 'next/link';

export function UserProvidersChip({ clearHref }: { clearHref: string }) {
  return (
    <p className="mb-4 inline-flex items-center gap-3 rounded-full bg-muted px-4 py-1 text-sm">
      <span>Filtrando pelos seus streamings</span>
      <Link href={clearHref} className="font-medium underline">
        Ver todos
      </Link>
    </p>
  );
}
```

Run: `npm test -- src/components/user-providers-chip.test.tsx` → PASS.

- [ ] **Step 3: Atualizar a página do catálogo**

Substitua `src/app/page.tsx`:
```tsx
import Link from 'next/link';
import { FilterBar } from '@/components/filter-bar';
import { MovieGrid } from '@/components/movie-grid';
import { Pagination } from '@/components/pagination';
import { buttonVariants } from '@/components/ui/button';
import { UserProvidersChip } from '@/components/user-providers-chip';
import { withSelectedProviders } from '@/lib/catalog/provider-options';
import { removeWatched, resolveProviderIds } from '@/lib/catalog/resolve-providers';
import { catalogHref, parseCatalogFilters, type RawSearchParams } from '@/lib/filters/catalog-filters';
import { DEFAULT_PROVIDER_COUNT, getBrProviders, getGenres } from '@/lib/tmdb/catalog-meta';
import { discoverMovies } from '@/lib/tmdb/movies';
import { getUserProviderIds, getWatchedIds } from '@/lib/user-data/repository';
import { getUserDb } from '@/lib/user-data/server';

type PageProps = { searchParams: Promise<RawSearchParams> };

export default async function CatalogPage({ searchParams }: PageProps) {
  const filters = parseCatalogFilters(await searchParams);
  const ctx = await getUserDb();

  const [genres, allProviders, userProviderIds, watchedIds] = await Promise.all([
    getGenres(),
    getBrProviders(),
    ctx ? getUserProviderIds(ctx.db, ctx.userId) : Promise.resolve(null),
    ctx && filters.hideWatched ? getWatchedIds(ctx.db, ctx.userId) : Promise.resolve(new Set<number>()),
  ]);
  const defaultProviders = allProviders.slice(0, DEFAULT_PROVIDER_COUNT);
  const { ids, source } = resolveProviderIds(filters.providers, userProviderIds, defaultProviders.map((p) => p.id));
  const selectedProviderIds = source === 'default' ? [] : ids;

  const result = await discoverMovies({
    providerIds: ids,
    genre: filters.genre,
    year: filters.year,
    minRating: filters.minRating,
    sort: filters.sort,
    page: filters.page,
  });
  // Limitação aceita no MVP: com "ocultar assistidos" a página pode ter menos de 20 filmes.
  const movies = removeWatched(result.results, watchedIds);

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Filmes disponíveis nos streamings</h1>
      {source === 'user' && <UserProvidersChip clearHref={catalogHref({ ...filters, providers: 'all', page: 1 })} />}
      <FilterBar
        filters={filters}
        genres={genres}
        providers={withSelectedProviders(defaultProviders, allProviders, selectedProviderIds)}
        selectedProviderIds={selectedProviderIds}
        canHideWatched={ctx !== null}
      />
      <MovieGrid
        movies={movies}
        emptyMessage="Nenhum filme encontrado com esses filtros."
        emptyAction={<Link href="/?providers=all" className={buttonVariants({ variant: 'outline' })}>Limpar filtros</Link>}
      />
      <Pagination
        page={filters.page}
        totalPages={result.totalPages}
        hrefForPage={(page) => catalogHref({ ...filters, page })}
      />
    </>
  );
}
```

- [ ] **Step 4: Verificação manual**

Logado com "Meus streamings" = Netflix e Disney Plus:
1. `/` mostra o chip, Netflix e Disney Plus marcados e só filmes desses serviços.
2. "Ver todos" → `/?providers=all`, sem chip e sem nenhum marcado.
3. Marque um filme da grade como assistido; com "Ocultar assistidos", ele some.
4. Deslogado, `/` não mostra chip nem "Ocultar assistidos".

- [ ] **Step 5: Rodar tudo e commit**

Run: `npm test && npm run lint && npm run typecheck` → PASS.
```bash
git add -A
git commit -m "feat: catálogo filtrado pelos streamings do usuário e ocultar assistidos" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Testes E2E (Playwright)

**Pré-requisitos:** Supabase local rodando, `.env.local` com `TMDB_READ_TOKEN` real, `.env.test.local` preenchido. Os E2E usam o TMDB de verdade e **não** rodam no CI.

**Files:**
- Create: `playwright.config.ts`, `e2e/test-user.ts`, `e2e/global-setup.ts`, `e2e/catalog.spec.ts`, `e2e/search.spec.ts`, `e2e/my-list.spec.ts`

**Interfaces:**
- Consumes: todas as telas; `MovieGrid` com `aria-label="Filmes"`; botões de provedor com nome acessível igual ao nome do serviço; formulário de login com rótulos "E-mail"/"Senha".
- Produces: `TEST_USER = { email: 'e2e@exemplo.com', password: 'senha-e2e-123' }`.

- [ ] **Step 1: Instalar o navegador e configurar**

```bash
npx playwright install chromium
```

`playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  globalSetup: './e2e/global-setup.ts',
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

`e2e/test-user.ts`:
```ts
export const TEST_USER = { email: 'e2e@exemplo.com', password: 'senha-e2e-123' };
```

`e2e/global-setup.ts`:
```ts
import { createClient } from '@supabase/supabase-js';
import { TEST_USER } from './test-user';

/** Garante o usuário de teste e zera a lista dele antes da suíte. */
export default async function globalSetup() {
  process.loadEnvFile('.env.test.local');
  const admin = createClient(process.env.LOCAL_SUPABASE_URL!, process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const created = await admin.auth.admin.createUser({ ...TEST_USER, email_confirm: true });
  let userId = created.data.user?.id;
  if (!userId) {
    const { data } = await admin.auth.admin.listUsers();
    userId = data.users.find((u) => u.email === TEST_USER.email)?.id;
  }
  if (!userId) throw new Error('Não foi possível preparar o usuário de E2E');

  await admin.from('user_movies').delete().eq('user_id', userId);
  await admin.from('user_providers').delete().eq('user_id', userId);
}
```

- [ ] **Step 2: Escrever os E2E**

`e2e/catalog.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

test('filtra por streaming e abre os detalhes', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Filmes disponíveis nos streamings' })).toBeVisible();

  const netflix = page.getByRole('button', { name: 'Netflix', exact: true });
  await netflix.click();
  await expect(page).toHaveURL(/[?&]providers=8(&|$)/);
  await expect(netflix).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('list', { name: 'Filmes' }).getByRole('link').first().click();
  await expect(page).toHaveURL(/\/filme\/\d+$/);
  await expect(page.getByRole('heading', { name: 'Onde assistir' })).toBeVisible();
});
```

`e2e/search.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

test('busca um filme pelo título', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('searchbox', { name: 'Buscar filme por título' });
  await search.fill('Matrix');
  await search.press('Enter');

  await expect(page).toHaveURL(/\/busca\?q=Matrix/);
  await expect(page.getByRole('list', { name: 'Filmes' }).getByRole('link', { name: /Matrix/ }).first()).toBeVisible();
});

test('busca vazia mostra orientação', async ({ page }) => {
  await page.goto('/busca?q=%20%20');
  await expect(page.getByText('Digite o nome de um filme na busca acima.')).toBeVisible();
});
```

`e2e/my-list.spec.ts`:
```ts
import { expect, test } from '@playwright/test';
import { TEST_USER } from './test-user';

test('login, adicionar à lista e ver em Minha lista', async ({ page }) => {
  await page.goto('/minha-lista');
  await expect(page).toHaveURL(/\/login\?next=%2Fminha-lista/);

  await page.getByLabel('E-mail').fill(TEST_USER.email);
  await page.getByLabel('Senha').fill(TEST_USER.password);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/minha-lista$/);
  await expect(page.getByText('Sua lista está vazia. Explore o catálogo e adicione filmes.')).toBeVisible();

  await page.goto('/filme/603');
  await page.getByRole('button', { name: '+ Quero assistir' }).click();
  await expect(page.getByRole('button', { name: '✓ Na lista' })).toBeVisible();

  await page.goto('/minha-lista');
  await expect(page.getByRole('link', { name: 'Matrix' })).toBeVisible();
});
```

- [ ] **Step 3: Rodar**

Run: `npm run test:e2e`
Expected: 4 testes PASS. Se algum falhar, abra o relatório com `npx playwright show-report` e corrija o código (não o teste), exceto se o dado do TMDB tiver mudado (por exemplo, Netflix com outro id).

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts e2e
git commit -m "test: fluxos E2E de catálogo, busca e Minha lista" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: README de portfólio e deploy

**Files:**
- Create: `README.md` (substitui o gerado pelo create-next-app)

**Interfaces:**
- Consumes: todo o projeto.
- Produces: documentação e app publicado.

- [ ] **Step 1: Escrever o README**

`README.md`:
````markdown
# 🎬 Streaming Agora

Catálogo dos filmes disponíveis **agora** nos streamings por assinatura no Brasil, com filtros por serviço, gênero, ano e nota, busca por título e página de detalhes com onde assistir. Usuários logados montam sua lista "Quero assistir", marcam filmes como assistidos e salvam os streamings que assinam.

> Projeto de estudo/portfólio.

## Stack

Next.js (App Router, Server Components, Server Actions) · TypeScript · Tailwind CSS + shadcn/ui · Supabase (Postgres, Auth, RLS) · Zod · Vitest + Testing Library + MSW · Playwright · GitHub Actions · Vercel

## Arquitetura

```
Navegador ──► Next.js (Vercel)
               ├─ Server Components ──► API do TMDB   (token só no servidor, cache 1h–24h)
               ├─ Server Actions   ──► Supabase Postgres (RLS: cada usuário só vê o que é seu)
               └─ proxy.ts         ──► Supabase Auth (renova a sessão, protege /minha-lista e /perfil)
```

- Filtros ficam na URL (`/?providers=8,119&genre=28&page=2`), então qualquer busca pode ser compartilhada.
- O banco guarda só dados do usuário (`user_movies`, `user_providers`), referenciando filmes pelo id do TMDB.
- Respostas do TMDB são validadas com Zod e convertidas para tipos próprios do app.

## Rodando localmente

Pré-requisitos: Node 22+, Docker Desktop e um token de leitura (v4) do TMDB.

```bash
npm install
npx supabase start                 # sobe Postgres + Auth locais
npx supabase status -o env         # copie API_URL e ANON_KEY
cp .env.example .env.local         # preencha TMDB_READ_TOKEN e as variáveis do Supabase
npm run dev
```

## Testes

```bash
npm test            # unitários e de componentes (sem rede)
npm run test:db     # repositório e RLS contra o Supabase local (requer .env.test.local)
npm run test:e2e    # Playwright contra o app local e o TMDB real
```

## Créditos

Dados de filmes: [TMDB](https://www.themoviedb.org). Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB. Disponibilidade em streaming: [JustWatch](https://www.justwatch.com).
````

- [ ] **Step 2: Commit do README**

```bash
git add README.md
git commit -m "docs: README de portfólio" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 3: Deploy (passos manuais, feitos pelo dono do projeto)**

1. **Supabase:** criar um projeto no plano gratuito; depois:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-do-projeto>
   npx supabase db push
   ```
2. **Auth no painel do Supabase:** Authentication → URL Configuration: `Site URL = https://<seu-app>.vercel.app`; em Redirect URLs adicionar `https://<seu-app>.vercel.app/auth/callback` e `https://*-<seu-usuario>.vercel.app/auth/callback` (previews).
3. **Google:** criar credenciais OAuth no Google Cloud Console com o redirect `https://<ref>.supabase.co/auth/v1/callback`; em Authentication → Providers → Google, colar Client ID e Secret.
4. **GitHub:** criar o repositório e fazer push da branch `main`.
5. **Vercel:** importar o repositório; definir `TMDB_READ_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (valores do projeto em produção); fazer o deploy.
6. **Conferir em produção:** catálogo, busca, detalhes, cadastro por e-mail, login com Google, lista e perfil.
7. Tirar prints das telas, salvar em `docs/screenshots/` e referenciá-los no README; commit.
