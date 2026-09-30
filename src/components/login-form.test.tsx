import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from './login-form';

const { replace, refresh, auth } = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  auth: { signInWithPassword: vi.fn(), signUp: vi.fn() },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock('@/lib/supabase/client', () => ({ createSupabaseBrowserClient: () => ({ auth }) }));

async function fillAndSubmit(button: string) {
  await userEvent.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
  await userEvent.type(screen.getByLabelText('Senha'), 'segredo123');
  await userEvent.click(screen.getByRole('button', { name: button }));
}

describe('LoginForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('entra e volta para o destino', async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ data: { session: {} }, error: null });
    render(<LoginForm next="/filme/603" />);
    await fillAndSubmit('Entrar');
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'ana@exemplo.com', password: 'segredo123' });
    expect(replace).toHaveBeenCalledWith('/filme/603');
    expect(refresh).toHaveBeenCalled();
  });

  it('mostra erro traduzido', async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ data: { session: null }, error: { message: 'Invalid login credentials' } });
    render(<LoginForm next="/" />);
    await fillAndSubmit('Entrar');
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
    expect(replace).not.toHaveBeenCalled();
  });

  it('cadastro sem sessão pede confirmação por e-mail', async () => {
    auth.signUp.mockResolvedValueOnce({ data: { session: null }, error: null });
    render(<LoginForm next="/" />);
    await userEvent.click(screen.getByRole('button', { name: 'Cadastre-se' }));
    await fillAndSubmit('Criar conta');
    expect(auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ana@exemplo.com', password: 'segredo123' }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Enviamos um link de confirmação para o seu e-mail.');
  });

  it('não oferece login com Google', () => {
    render(<LoginForm next="/" />);
    expect(screen.queryByRole('button', { name: /google/i })).not.toBeInTheDocument();
  });
});
