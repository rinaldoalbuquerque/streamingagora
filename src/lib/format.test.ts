import { describe, expect, it } from 'vitest';
import { formatRating } from './format';

describe('formatRating', () => {
  it('usa uma casa decimal com vírgula', () => {
    expect(formatRating(8.24)).toBe('8,2');
    expect(formatRating(7)).toBe('7,0');
  });
});
