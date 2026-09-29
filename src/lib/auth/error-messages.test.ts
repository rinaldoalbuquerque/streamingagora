import { describe, expect, it } from 'vitest';
import { authErrorMessage } from './error-messages';

describe('authErrorMessage', () => {
  it('traduz erros conhecidos', () => {
    expect(authErrorMessage('Invalid login credentials')).toBe('E-mail ou senha incorretos.');
    expect(authErrorMessage('User already registered')).toBe('Este e-mail já está cadastrado.');
    expect(authErrorMessage('Password should be at least 6 characters.')).toBe('A senha precisa ter pelo menos 6 caracteres.');
    expect(authErrorMessage('Email not confirmed')).toBe('Confirme seu e-mail antes de entrar.');
  });
  it('usa mensagem genérica para o resto', () => {
    expect(authErrorMessage('boom')).toBe('Não foi possível entrar. Tente novamente.');
  });
});
