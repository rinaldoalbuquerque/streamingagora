# Catálogo de Filmes em Streaming — Design

**Data:** 2026-09-29
**Status:** Aprovado em conversa; aguardando revisão da spec escrita

## 1. Objetivo e contexto

Aplicativo web que mostra os filmes disponíveis **agora** nos serviços de streaming por assinatura no **Brasil**, usando a API do TMDB (dados de disponibilidade fornecidos pelo JustWatch).

- **Propósito:** projeto de estudo/portfólio. Sucesso = app publicado (Vercel), código limpo, tipado e testado, com README apresentável. Não há requisito de escala.
- **Idioma/região:** somente pt-BR e `watch_region=BR`.
- **Público:** visitantes anônimos navegam o catálogo; usuários logados gerenciam listas e preferências.

## 2. Escopo

### Incluído no MVP

1. Catálogo de filmes disponíveis por assinatura (monetização `flatrate`, `free`, `ads`).
2. Filtro por streaming (múltipla escolha, lógica OU).
3. Filtros extras: gênero, ano de lançamento, nota mínima; ordenação por popularidade, nota ou data de lançamento.
4. Busca por título (retorna qualquer filme; a disponibilidade aparece nos detalhes).
5. Página de detalhes: sinopse, elenco, trailer, nota e onde assistir (assinatura, aluguel, compra — ou "indisponível em streaming").
6. Login (e-mail/senha e Google) via Supabase Auth.
7. Usuário logado:
   - Lista "Quero assistir".
   - Marcar como "Assistido" (com opção de ocultar assistidos do catálogo).
   - "Meus streamings": serviços que assina; o catálogo abre filtrado por eles.

### Fora do escopo

Séries, outras regiões, avaliações/comentários próprios, recomendações personalizadas, PWA, app mobile.

## 3. Stack

- Next.js (App Router) + TypeScript estrito
- Tailwind CSS + shadcn/ui
- Supabase (Postgres + Auth), com `@supabase/ssr`
- Zod (validação das respostas do TMDB)
- Vitest + Testing Library + MSW; Playwright para E2E
- ESLint + Prettier; GitHub Actions; deploy na Vercel

## 4. Arquitetura

Abordagem escolhida: **TMDB consultado sob demanda no servidor, com cache do Next.js**. O Supabase armazena apenas dados do usuário, referenciando filmes pelo `tmdb_id`. Não há cópia do catálogo do TMDB no banco.

### 4.1 Rotas

| Rota | Tela | Observações |
|---|---|---|
| `/` | Catálogo: grade de pôsteres, barra de filtros, paginação | Server Component; filtros na URL |
| `/busca?q=` | Resultados da busca por título | Server Component |
| `/filme/[id]` | Detalhes + onde assistir + botões de lista | Server Component; botões são Client Components |
| `/minha-lista` | Abas "Quero assistir" e "Assistidos", com disponibilidade atual | Protegida |
| `/perfil` | Seleção de "Meus streamings" | Protegida |
| `/login` | E-mail/senha + Google; aceita `?next=` para retorno | Client |

Formato dos filtros na URL do catálogo:
`/?providers=8,119&genre=28&year=2024&minRating=7&sort=popularity.desc&hideWatched=1&page=2`

### 4.2 Organização do código

```
src/
  app/            rotas e layouts (apenas composição)
  lib/tmdb/       cliente TMDB: fetch tipado, cache, retry, schemas Zod, mapeamento p/ tipos do app
  lib/supabase/   clientes server/browser e middleware de sessão
  lib/user-data/  único ponto de acesso às tabelas do usuário (+ Server Actions)
  lib/filters/    filtros <-> query string (funções puras)
  components/     MovieCard, MovieGrid, FilterBar, ProviderPicker, WatchProviders, ListButtons…
supabase/migrations/  migrações SQL versionadas
```

Regras de fronteira:
- Somente `lib/tmdb` lê `TMDB_READ_TOKEN`; o token nunca chega ao navegador.
- O restante do app consome apenas os tipos do app (`Movie`, `MovieDetails`, `WatchProviders`, `Genre`, `Provider`), nunca o formato bruto do TMDB.
- Somente `lib/user-data` acessa `user_movies` e `user_providers`.

### 4.3 Comportamentos-chave

- **Filtro padrão do usuário logado:** se `providers` estiver ausente da URL, o catálogo usa os "Meus streamings" do usuário e mostra um chip "Filtrando pelos seus streamings" com ação de limpar. Se o usuário não tiver streamings salvos (ou for anônimo), usa a lista padrão (ver 6.2).
- **Ocultar assistidos:** com `hideWatched=1` (somente logado), filmes assistidos são removidos da página retornada pelo TMDB. Limitação aceita no MVP: a página pode exibir menos de 20 itens.
- **Mutações:** via Server Actions com atualização otimista na UI e `revalidatePath` das rotas afetadas.
- **Atribuição:** rodapé com créditos ao TMDB e ao JustWatch (exigência de uso dos dados).

## 5. Modelo de dados (Supabase)

```sql
create table user_providers (
  user_id     uuid not null references auth.users on delete cascade,
  provider_id int  not null,
  primary key (user_id, provider_id)
);

create table user_movies (
  user_id     uuid not null references auth.users on delete cascade,
  tmdb_id     int  not null,
  status      text not null check (status in ('want', 'watched')),
  title       text not null,
  poster_path text,
  updated_at  timestamptz not null default now(),
  primary key (user_id, tmdb_id)
);
```

- RLS habilitado em ambas; políticas de `select/insert/update/delete` restritas a `user_id = auth.uid()`.
- Um status por filme por usuário. Marcar "assistido" faz upsert com `status = 'watched'` (sai de "Quero assistir"). Remover apaga a linha.
- `title` e `poster_path` são cópias para renderizar a lista sem chamar o TMDB.
- Tipos TypeScript gerados a partir do schema.

## 6. Integração com o TMDB

### 6.1 Endpoints

Autenticação: header `Authorization: Bearer <TMDB_READ_TOKEN>`. Parâmetros comuns: `language=pt-BR`.

| Uso | Endpoint e parâmetros | Revalidação |
|---|---|---|
| Catálogo | `/discover/movie` com `watch_region=BR`, `with_watch_providers` (ids separados por `\|`), `with_watch_monetization_types=flatrate\|free\|ads`, `with_genres`, `primary_release_year`, `vote_average.gte`, `vote_count.gte=50`, `sort_by`, `page` | 6h |
| Busca | `/search/movie?query=&region=BR&page=` | 1h |
| Detalhes | `/movie/{id}?append_to_response=credits,videos,watch/providers` | 6h |
| Disponibilidade (Minha lista) | `/movie/{id}/watch/providers` (resultado `BR`) | 6h |
| Gêneros | `/genre/movie/list` | 24h |
| Provedores BR | `/watch/providers/movie?watch_region=BR` | 24h |

### 6.2 Regras

- **Catálogo sem provedor selecionado:** envia os 15 principais provedores BR ordenados por `display_priority`, garantindo que o resultado seja sempre "disponível por assinatura".
- **Paginação:** limitada a 500 páginas (limite do TMDB).
- **Ordenações suportadas:** `popularity.desc` (padrão), `vote_average.desc`, `primary_release_date.desc`.
- **Minha lista:** paginada em 20 itens; disponibilidade buscada em paralelo por filme, com cache.
- **Imagens:** `image.tmdb.org` liberado em `next/image`; placeholder quando não houver pôster.
- **Trailer:** primeiro vídeo `site = YouTube` e `type = Trailer`, preferindo pt-BR; ausente se não houver.

## 7. Tratamento de erros

| Situação | Comportamento |
|---|---|
| TMDB indisponível / timeout (8s) | `error.tsx` com mensagem e botão "Tentar de novo"; cache existente continua servindo |
| HTTP 429 | Uma nova tentativa respeitando `Retry-After`; se falhar, erro acima |
| Filme inexistente | `notFound()` → página 404 |
| Item fora do schema Zod | Log no servidor; item descartado; restante da página renderiza |
| Filtros inválidos na URL | `lib/filters` descarta valores inválidos e limita `page` a 1..500 |
| Nenhum resultado | Estado vazio com botão "Limpar filtros" |
| Anônimo aciona ação de lista | Redireciona para `/login?next=<rota atual>` |
| Falha em Server Action | Toast com erro e reversão da atualização otimista |
| Carregamento | `loading.tsx` com skeletons |

## 8. Testes

Desenvolvimento em TDD.

- **Unitários (Vitest):**
  - `lib/filters`: parse/serialize, validação, defaults.
  - `lib/tmdb`: construção de URLs, mapeamento Zod, retry em 429, timeout — `fetch` mockado com MSW (nunca chama o TMDB real).
  - `lib/user-data`: transições de status e regras de upsert.
- **Componentes (Testing Library):** FilterBar, ProviderPicker, ListButtons.
- **RLS:** teste garantindo que um usuário não lê nem altera dados de outro.
- **E2E (Playwright):** (1) filtrar por streaming e abrir detalhes; (2) buscar por título; (3) login → adicionar à lista → ver em `/minha-lista`.

## 9. Qualidade, CI e deploy

- ESLint, Prettier, `tsc --noEmit`.
- GitHub Actions em PRs: lint, typecheck e testes unitários/componentes.
- Vercel com preview por PR.
- Variáveis de ambiente: `TMDB_READ_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Supabase: projeto novo (plano gratuito); provedor Google configurado no painel.
- README de portfólio: prints, diagrama de arquitetura, como rodar localmente, créditos TMDB/JustWatch.
