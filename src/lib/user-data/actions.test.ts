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
