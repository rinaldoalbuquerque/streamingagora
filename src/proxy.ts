import { NextResponse, type NextRequest } from 'next/server';
import { isProtectedPath, loginRedirectPath } from '@/lib/auth/protected-routes';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!userId && isProtectedPath(pathname)) {
    return NextResponse.redirect(new URL(loginRedirectPath(pathname, search), request.url));
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
