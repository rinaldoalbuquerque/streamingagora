/**
 * Aceita apenas caminhos internos ("/algo"). Recusa URLs absolutas, "//host",
 * barras invertidas e caracteres de controle (o navegador remove TAB/LF e
 * "/\t/evil.com" viraria "//evil.com").
 */
export function safeNextPath(raw: string | null | undefined, fallback = '/'): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return fallback;
  return raw;
}
