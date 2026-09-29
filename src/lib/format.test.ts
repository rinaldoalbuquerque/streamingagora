import { describe, expect, it } from 'vitest';
import { formatRating, formatRuntime } from './format';

describe('formatRating', () => {
  it('usa uma casa decimal com vírgula', () => {
    expect(formatRating(8.24)).toBe('8,2');
    expect(formatRating(7)).toBe('7,0');
  });
});

describe('formatRuntime', () => {
  it('formata horas e minutos', () => {
    expect(formatRuntime(136)).toBe('2h 16min');
    expect(formatRuntime(45)).toBe('45min');
    expect(formatRuntime(120)).toBe('2h');
  });
  it('retorna null sem duração', () => {
    expect(formatRuntime(null)).toBeNull();
    expect(formatRuntime(0)).toBeNull();
  });
});
