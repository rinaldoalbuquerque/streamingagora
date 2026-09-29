import { describe, expect, it } from 'vitest';
import { isProtectedPath, loginRedirectPath } from './protected-routes';

describe('isProtectedPath', () => {
  it('protege minha-lista e perfil', () => {
    expect(isProtectedPath('/minha-lista')).toBe(true);
    expect(isProtectedPath('/perfil')).toBe(true);
    expect(isProtectedPath('/perfil/editar')).toBe(true);
  });
  it('não protege o resto', () => {
    expect(isProtectedPath('/')).toBe(false);
    expect(isProtectedPath('/perfilx')).toBe(false);
    expect(isProtectedPath('/filme/603')).toBe(false);
  });
});

describe('loginRedirectPath', () => {
  it('leva o destino no next', () => {
    expect(loginRedirectPath('/minha-lista', '?tab=watched')).toBe('/login?next=%2Fminha-lista%3Ftab%3Dwatched');
  });
});
