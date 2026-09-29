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
