import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Pagination } from './pagination';

const href = (p: number) => `/?page=${p}`;

describe('Pagination', () => {
  it('liga para as páginas vizinhas', () => {
    render(<Pagination page={2} totalPages={3} hrefForPage={href} />);
    expect(screen.getByRole('link', { name: 'Anterior' })).toHaveAttribute('href', '/?page=1');
    expect(screen.getByRole('link', { name: 'Próxima' })).toHaveAttribute('href', '/?page=3');
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
  });

  it('desativa Anterior na primeira página e Próxima na última', () => {
    const { rerender } = render(<Pagination page={1} totalPages={3} hrefForPage={href} />);
    expect(screen.queryByRole('link', { name: 'Anterior' })).not.toBeInTheDocument();
    rerender(<Pagination page={3} totalPages={3} hrefForPage={href} />);
    expect(screen.queryByRole('link', { name: 'Próxima' })).not.toBeInTheDocument();
  });

  it('não renderiza com uma página só', () => {
    const { container } = render(<Pagination page={1} totalPages={1} hrefForPage={href} />);
    expect(container).toBeEmptyDOMElement();
  });
});
