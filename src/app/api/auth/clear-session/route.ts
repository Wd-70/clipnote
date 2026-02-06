import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * API route to clear invalid session cookies
 * Called when client detects a session error (e.g., JWTSessionError)
 */
export async function POST() {
  const cookieStore = await cookies();

  // Clear all possible session cookie names
  const sessionCookieNames = [
    'authjs.session-token',
    '__Secure-authjs.session-token',
    'authjs.callback-url',
    '__Secure-authjs.callback-url',
    'authjs.csrf-token',
    '__Secure-authjs.csrf-token',
  ];

  for (const cookieName of sessionCookieNames) {
    cookieStore.delete(cookieName);
  }

  console.log('[auth] Session cookies cleared via API');

  return NextResponse.json({ success: true, message: 'Session cleared' });
}
