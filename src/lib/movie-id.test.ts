import { describe, expect, it } from 'vitest';
import { parseMovieId } from './movie-id';

describe('parseMovieId', () => {
  it('aceita inteiros positivos', () => {
    expect(parseMovieId('603')).toBe(603);
  });
  it.each(['abc', '0', '-1', '12abc', '1.5', '', '99999999999'])('recusa "%s"', (raw) => {
    expect(parseMovieId(raw)).toBeNull();
  });
});
