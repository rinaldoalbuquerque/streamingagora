import { describe, expect, it } from 'vitest';
import { normalizeQuery, searchHref } from './normalize-query';

describe('normalizeQuery', () => {
  it('retorna null para vazio ou só espaços', () => {
    expect(normalizeQuery(undefined)).toBeNull();
    expect(normalizeQuery('')).toBeNull();
    expect(normalizeQuery('   ')).toBeNull();
  });
  it('apara e junta espaços repetidos', () => {
    expect(normalizeQuery('  O   Poderoso  Chefão ')).toBe('O Poderoso Chefão');
  });
  it('mantém acentos e &', () => {
    expect(normalizeQuery('Amor & Morte à Tarde')).toBe('Amor & Morte à Tarde');
  });
  it('usa o primeiro valor e limita a 100 caracteres', () => {
    expect(normalizeQuery(['a', 'b'])).toBe('a');
    expect(normalizeQuery('x'.repeat(150))).toHaveLength(100);
  });
});

describe('searchHref', () => {
  it('codifica o texto e omite a página 1', () => {
    expect(searchHref('Amor & Morte', 1)).toBe('/busca?q=Amor+%26+Morte');
    expect(searchHref('Matrix', 2)).toBe('/busca?q=Matrix&page=2');
  });
});
