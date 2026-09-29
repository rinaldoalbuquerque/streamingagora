/** Aceita apenas ids numéricos positivos de até 9 dígitos. */
export function parseMovieId(raw: string): number | null {
  if (!/^\d{1,9}$/.test(raw)) return null;
  const id = Number(raw);
  return id > 0 ? id : null;
}
