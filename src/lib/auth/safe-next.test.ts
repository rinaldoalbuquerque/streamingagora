import { describe, expect, it } from 'vitest';
import { safeNextPath } from './safe-next';

describe('safeNextPath', () => {
  it('aceita caminhos internos', () => {
    expect(safeNextPath('/filme/603')).toBe('/filme/603');
    expect(safeNextPath('/minha-lista?tab=watched')).toBe('/minha-lista?tab=watched');
  });

  it.each([
    undefined,
    null,
    '',
    'filme/603',
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    '/\t/evil.com',
    '/\n/evil.com',
  ])('recusa %j e volta para /', (raw) => {
    expect(safeNextPath(raw)).toBe('/');
  });

  it('usa o fallback informado', () => {
    expect(safeNextPath('//evil.com', '/perfil')).toBe('/perfil');
  });
});
