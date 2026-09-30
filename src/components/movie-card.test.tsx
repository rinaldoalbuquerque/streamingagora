import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MovieCard } from './movie-card';

const movie = {
  id: 603,
  title: 'Matrix',
  backdropPath: null,
  posterPath: '/matrix.jpg',
  releaseYear: 1999,
  voteAverage: 8.24,
  overview: '',
};

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
