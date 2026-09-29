import { describe, expect, it } from 'vitest';
import { movieRefSchema, parseListTab, providerIdsSchema } from './schemas';

describe('movieRefSchema', () => {
  it('aceita um filme válido', () => {
    expect(movieRefSchema.parse({ tmdbId: 603, title: ' Matrix ', posterPath: '/abc123.jpg' })).toEqual({
      tmdbId: 603,
      title: 'Matrix',
      posterPath: '/abc123.jpg',
    });
    expect(movieRefSchema.parse({ tmdbId: 1, title: 'X', posterPath: null }).posterPath).toBeNull();
  });

  it.each([
    { tmdbId: 0, title: 'X', posterPath: null },
    { tmdbId: 1.5, title: 'X', posterPath: null },
    { tmdbId: 1, title: '   ', posterPath: null },
    { tmdbId: 1, title: 'x'.repeat(301), posterPath: null },
    { tmdbId: 1, title: 'X', posterPath: 'https://evil.com/a.jpg' },
  ])('recusa %j', (input) => {
    expect(movieRefSchema.safeParse(input).success).toBe(false);
  });
});

describe('providerIdsSchema', () => {
  it('remove duplicados', () => {
    expect(providerIdsSchema.parse([8, 8, 119])).toEqual([8, 119]);
  });
  it('recusa ids inválidos e listas enormes', () => {
    expect(providerIdsSchema.safeParse([-1]).success).toBe(false);
    expect(providerIdsSchema.safeParse(Array.from({ length: 51 }, (_, i) => i + 1)).success).toBe(false);
  });
});

describe('parseListTab', () => {
  it('lê a aba e usa want como padrão', () => {
    expect(parseListTab('watched')).toBe('watched');
    expect(parseListTab('want')).toBe('want');
    expect(parseListTab('xpto')).toBe('want');
    expect(parseListTab(undefined)).toBe('want');
  });
});
