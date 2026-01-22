import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard', '/projects'];
const authRoutes = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // DEVELOPMENT MODE: Auto-login bypass
  // Remove this block when you want to enable real authentication
  if (process.env.NODE_ENV === 'development') {
    // Redirect from /login to /dashboard in dev mode
    if (authRoutes.some((route) => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // Allow all protected routes in dev mode
    return NextResponse.next();
  }

  // PRODUCTION MODE: Real authentication
  const sessionToken = request.cookies.get('authjs.session-token')?.value 
    || request.cookies.get('__Secure-authjs.session-token')?.value;
  
  const isLoggedIn = !!sessionToken;

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Redirect logged-in users away from auth pages
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect non-logged-in users to login
  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
