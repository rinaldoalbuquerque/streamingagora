import { afterEach, describe, expect, it, vi } from 'vitest';
import { requireEnv } from './env';

describe('requireEnv', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('retorna o valor quando a variável existe', () => {
    vi.stubEnv('EXEMPLO_TESTE', 'abc');
    expect(requireEnv('EXEMPLO_TESTE')).toBe('abc');
  });

  it('lança erro citando o nome quando a variável está vazia', () => {
    vi.stubEnv('EXEMPLO_TESTE', '');
    expect(() => requireEnv('EXEMPLO_TESTE')).toThrow('EXEMPLO_TESTE');
  });
});
