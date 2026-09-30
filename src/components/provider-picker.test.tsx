import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProviderPicker } from './provider-picker';

const mocks = vi.hoisted(() => ({ saveProvidersAction: vi.fn(), toastSuccess: vi.fn(), toastError: vi.fn() }));
vi.mock('@/lib/user-data/actions', () => ({ saveProvidersAction: mocks.saveProvidersAction }));
vi.mock('sonner', () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }));

const providers = [
  { id: 8, name: 'Netflix', logoPath: null, displayPriority: 1 },
  { id: 119, name: 'Amazon Prime Video', logoPath: null, displayPriority: 2 },
  { id: 337, name: 'Disney Plus', logoPath: null, displayPriority: 3 },
];

describe('ProviderPicker', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marca os já escolhidos e salva a nova seleção ordenada', async () => {
    mocks.saveProvidersAction.mockResolvedValueOnce({ ok: true });
    render(<ProviderPicker providers={providers} initialSelected={[119]} />);
    expect(screen.getByLabelText('Amazon Prime Video')).toBeChecked();

    await userEvent.click(screen.getByLabelText('Disney Plus'));
    await userEvent.click(screen.getByLabelText('Netflix'));
    await userEvent.click(screen.getByLabelText('Amazon Prime Video'));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(mocks.saveProvidersAction).toHaveBeenCalledWith([8, 337]);
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith('Streamings salvos!'));
  });

  it('mostra o erro quando salvar falha', async () => {
    mocks.saveProvidersAction.mockResolvedValueOnce({ ok: false, error: 'Não foi possível salvar. Tente novamente.' });
    render(<ProviderPicker providers={providers} initialSelected={[]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('Não foi possível salvar. Tente novamente.'));
  });
});
