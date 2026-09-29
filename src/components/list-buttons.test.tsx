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
