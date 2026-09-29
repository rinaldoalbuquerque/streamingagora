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
