import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';

// Create the i18n middleware
const intlMiddleware = createMiddleware(routing);

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/projects', '/points', '/settings'];
const authRoutes = ['/login'];

// Session cookie names
const SESSION_COOKIE_NAMES = ['authjs.session-token', '__Secure-authjs.session-token'];

// Check if real OAuth is configured (same logic as auth.ts)
const hasGoogleAuth = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
const useMockAuth = process.env.NODE_ENV === 'development' && !hasGoogleAuth;

/**
 * Clear invalid session cookies from the response
 */
function clearSessionCookies(response: NextResponse): NextResponse {
  for (const cookieName of SESSION_COOKIE_NAMES) {
    response.cookies.delete(cookieName);
  }
  return response;
}

/**
 * Check if the session token appears to be a valid JWT structure
 * This is a quick check - actual validation happens server-side
 */
function isValidJwtStructure(token: string): boolean {
  // JWT should have 3 parts separated by dots
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  // Each part should be base64url encoded (non-empty)
  return parts.every(part => part.length > 0);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip i18n for API routes and static files
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Apply i18n middleware first
  const response = intlMiddleware(request);

  // Extract locale from the response or pathname
  const pathnameLocale = pathname.split('/')[1];
  const locale = ['ko', 'en', 'ja', 'zh'].includes(pathnameLocale)
    ? pathnameLocale
    : 'ko';

  // Get the pathname without locale prefix
  const pathnameWithoutLocale = pathname.replace(`/${locale}`, '') || '/';

  // MOCK AUTH MODE: Auto-login bypass (only when OAuth not configured)
  if (useMockAuth) {
    // Redirect from /login to /dashboard in mock auth mode
    if (authRoutes.some((route) => pathnameWithoutLocale.startsWith(route))) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/dashboard`;
      return NextResponse.redirect(url);
    }
    return response;
  }

  // REAL AUTH MODE: Check authentication
  let sessionToken: string | undefined;
  let sessionCookieName: string | undefined;

  for (const cookieName of SESSION_COOKIE_NAMES) {
    const token = request.cookies.get(cookieName)?.value;
    if (token) {
      sessionToken = token;
      sessionCookieName = cookieName;
      break;
    }
  }

  // Check if session token exists and has valid structure
  let isLoggedIn = false;
  let shouldClearCookie = false;

  if (sessionToken) {
    if (isValidJwtStructure(sessionToken)) {
      isLoggedIn = true;
    } else {
      // Token exists but has invalid structure - should be cleared
      shouldClearCookie = true;
      console.log('[middleware] Invalid session token structure detected, will clear cookie');
    }
  }

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathnameWithoutLocale.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) =>
    pathnameWithoutLocale.startsWith(route)
  );

  // Clear invalid cookie and redirect to login if on protected route
  if (shouldClearCookie) {
    if (isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/login`;
      url.searchParams.set('callbackUrl', pathname);
      const redirectResponse = NextResponse.redirect(url);
      return clearSessionCookies(redirectResponse);
    }
    // For non-protected routes, just clear the cookie
    return clearSessionCookies(response);
  }

  // Redirect logged-in users away from auth pages
  if (isAuthRoute && isLoggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    return NextResponse.redirect(url);
  }

  // Redirect non-logged-in users to login
  if (isProtectedRoute && !isLoggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Match all pathnames except for
  // - API routes
  // - Static files (including _next)
  // - Favicon and other root files
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
