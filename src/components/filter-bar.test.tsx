import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_FILTERS } from '@/lib/filters/catalog-filters';
import { FilterBar } from './filter-bar';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const providers = [
  { id: 8, name: 'Netflix', logoPath: null, displayPriority: 1 },
  { id: 119, name: 'Amazon Prime Video', logoPath: null, displayPriority: 2 },
];
const genres = [{ id: 28, name: 'Ação' }];

function renderBar(overrides: Partial<Parameters<typeof FilterBar>[0]> = {}) {
  return render(
    <FilterBar
      filters={DEFAULT_FILTERS}
      genres={genres}
      providers={providers}
      selectedProviderIds={[]}
      canHideWatched={false}
      {...overrides}
    />,
  );
}

describe('FilterBar', () => {
  beforeEach(() => push.mockClear());

  it('seleciona um streaming', async () => {
    renderBar();
    await userEvent.click(screen.getByRole('button', { name: 'Netflix' }));
    expect(push).toHaveBeenCalledWith('/?providers=8');
  });

  it('marca os selecionados e acrescenta outro', async () => {
    renderBar({ filters: { ...DEFAULT_FILTERS, providers: [8] }, selectedProviderIds: [8] });
    expect(screen.getByRole('button', { name: 'Netflix' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Amazon Prime Video' }));
    expect(push).toHaveBeenCalledWith('/?providers=8%2C119');
  });

  it('desmarcar o último vira providers=all', async () => {
    renderBar({ filters: { ...DEFAULT_FILTERS, providers: [8] }, selectedProviderIds: [8] });
    await userEvent.click(screen.getByRole('button', { name: 'Netflix' }));
    expect(push).toHaveBeenCalledWith('/?providers=all');
  });

  it('trocar o gênero volta para a página 1', async () => {
    renderBar({ filters: { ...DEFAULT_FILTERS, page: 3 } });
    await userEvent.selectOptions(screen.getByLabelText('Gênero'), '28');
    expect(push).toHaveBeenCalledWith('/?genre=28');
  });

  it('muda a ordenação e a nota mínima', async () => {
    renderBar();
    await userEvent.selectOptions(screen.getByLabelText('Ordenar por'), 'vote_average.desc');
    expect(push).toHaveBeenLastCalledWith('/?sort=vote_average.desc');
    await userEvent.selectOptions(screen.getByLabelText('Nota mínima'), '7');
    expect(push).toHaveBeenLastCalledWith('/?minRating=7');
  });

  it('só mostra "Ocultar assistidos" para quem pode usar', async () => {
    const { rerender } = renderBar();
    expect(screen.queryByLabelText('Ocultar assistidos')).not.toBeInTheDocument();
    rerender(
      <FilterBar filters={DEFAULT_FILTERS} genres={genres} providers={providers} selectedProviderIds={[]} canHideWatched />,
    );
    await userEvent.click(screen.getByLabelText('Ocultar assistidos'));
    expect(push).toHaveBeenCalledWith('/?hideWatched=1');
  });

  it('Limpar filtros volta ao início', async () => {
    renderBar({ filters: { ...DEFAULT_FILTERS, genre: 28 } });
    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(push).toHaveBeenCalledWith('/');
  });
});
