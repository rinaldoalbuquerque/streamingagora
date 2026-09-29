import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SiteFooter } from './site-footer';

describe('SiteFooter', () => {
  it('credita o TMDB e o JustWatch', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: 'TMDB' })).toHaveAttribute('href', 'https://www.themoviedb.org');
    expect(screen.getByRole('link', { name: 'JustWatch' })).toHaveAttribute('href', 'https://www.justwatch.com');
    expect(screen.getByText(/não é endossado nem certificado pelo TMDB/)).toBeInTheDocument();
  });
});
