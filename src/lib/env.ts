/**
 * Lê uma variável de ambiente obrigatória. Use apenas no servidor:
 * no navegador, só `process.env.NEXT_PUBLIC_*` escrito literalmente é embutido.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${name}`);
  }
  return value;
}
