import { describe, expect, it } from 'vitest';
import { tmdbImageUrl } from './images';

describe('tmdbImageUrl', () => {
  it('monta a URL da imagem no tamanho pedido', () => {
    expect(tmdbImageUrl('/matrix.jpg', 'w342')).toBe('https://image.tmdb.org/t/p/w342/matrix.jpg');
  });
  it('retorna null sem caminho', () => {
    expect(tmdbImageUrl(null, 'w342')).toBeNull();
  });
});
