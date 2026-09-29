export const PROTECTED_PATHS = ['/minha-lista', '/perfil'];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function loginRedirectPath(pathname: string, search: string): string {
  return `/login?next=${encodeURIComponent(pathname + search)}`;
}
