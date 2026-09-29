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
