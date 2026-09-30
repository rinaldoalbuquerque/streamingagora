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
