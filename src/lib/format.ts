export function formatRating(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatRuntime(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}
