import { describe, expect, it } from 'vitest';
import { withSelectedProviders } from './provider-options';

const p = (id: number, displayPriority: number) => ({ id, name: `P${id}`, logoPath: null, displayPriority });
const all = [p(8, 1), p(119, 2), p(337, 3), p(999, 40)];

describe('withSelectedProviders', () => {
  it('acrescenta selecionados fora da lista base, mantendo a prioridade', () => {
    expect(withSelectedProviders(all.slice(0, 2), all, [999, 8]).map((x) => x.id)).toEqual([8, 119, 999]);
  });
  it('ignora ids desconhecidos e não duplica', () => {
    expect(withSelectedProviders(all.slice(0, 2), all, [8, 12345]).map((x) => x.id)).toEqual([8, 119]);
  });
});
