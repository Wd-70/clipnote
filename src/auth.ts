import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { getDB } from '@/lib/db/adapter';

// Check if real OAuth is configured
const hasGoogleAuth = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

// Use mock auth only in development when OAuth is not configured
const useMockAuth = process.env.NODE_ENV === 'development' && !hasGoogleAuth;

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Adapter is undefined - using JWT sessions only
  // For MongoDB adapter, see auth.mongodb.ts.bak
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || '',
      clientSecret: process.env.AUTH_GOOGLE_SECRET || '',
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  // Suppress noisy JWT errors in console (invalid tokens are handled gracefully)
  logger: {
    error(code, ...message) {
      // Suppress JWTSessionError - these are expected when AUTH_SECRET changes
      if (code instanceof Error && code.name === 'JWTSessionError') {
        console.log('[auth] Invalid session detected, user will be logged out');
        return;
      }
      console.error('[auth][error]', code, ...message);
    },
    warn(code, ...message) {
      console.warn('[auth][warn]', code, ...message);
    },
    debug(code, ...message) {
      // Uncomment for debugging: console.log('[auth][debug]', code, ...message);
    },
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Mock auth: auto-assign dev user when no real auth
      if (useMockAuth && !token.id) {
        token.id = 'dev-user-id';
        token.email = 'dev@clipnote.local';
        token.name = 'Development User';
      }

      // First login - user object is present
      if (user && user.email) {
        token.id = user.id;

        // Auto-create user in database if not exists (use email as identifier)
        try {
          const db = await getDB();
          const existingUser = await db.User.findOne({ email: user.email });
          if (!existingUser) {
            const newUser = await db.User.create({
              email: user.email,
              name: user.name || '',
              image: user.image || '',
              points: 0, // Initial points
              role: 'FREE',
              savedChannels: [],
            });
            // Use the DB-generated ID as the user ID for consistency
            token.id = String(newUser._id);
            console.log('[auth] New user created:', user.email);
          } else {
            // Use existing user's ID
            token.id = String(existingUser._id);
          }
        } catch (error) {
          console.error('[auth] Failed to create/find user:', error);
        }
      }

      // Ensure token.id is synced with DB (handles DB switch scenarios)
      if (!user && token.email && token.id) {
        try {
          const db = await getDB();
          const dbUser = await db.User.findOne({ email: token.email });
          if (dbUser) {
            token.id = String(dbUser._id);
          }
        } catch {
          // Silently ignore — will retry on next request
        }
      }
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      // Mock auth: return mock session when no real auth
      if (useMockAuth) {
        return {
          ...session,
          user: {
            ...session.user,
            id: token.id as string || 'dev-user-id',
          },
        };
      }

      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // After sign in, redirect to dashboard
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {
        // Invalid URL, fall through to default
      }
      return `${baseUrl}/dashboard`;
    },
  },
});

// Development mode helper: Returns mock session only when mock auth is enabled
export async function getDevSession() {
  if (useMockAuth) {
    return {
      user: {
        id: 'dev-user-id',
        email: 'dev@clipnote.local',
        name: 'Development User',
        image: null,
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }
  return null;
}
