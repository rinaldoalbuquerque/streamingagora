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
