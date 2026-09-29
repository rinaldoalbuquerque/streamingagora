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
