import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

// Only import MongoDB in production
let adapter: any = undefined;

if (process.env.NODE_ENV === 'production' && process.env.MONGODB_URI) {
  // Dynamic import is not possible here, so MongoDB adapter
  // will be set up separately in production
  // For now, we use JWT sessions without adapter
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter,
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
  callbacks: {
    async jwt({ token, user, account }) {
      // DEVELOPMENT MODE: Mock user
      if (process.env.NODE_ENV === 'development' && !token.id) {
        token.id = 'dev-user-id';
        token.email = 'dev@clipnote.local';
        token.name = 'Development User';
      }

      if (user) {
        token.id = user.id;
      }
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      // DEVELOPMENT MODE: Mock session
      if (process.env.NODE_ENV === 'development') {
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

// Development mode helper: Always return a mock session
export async function getDevSession() {
  if (process.env.NODE_ENV === 'development') {
    return {
      user: {
        id: 'dev-user-id',
        email: 'dev@clipnote.local',
        name: 'Development User',
        image: null,
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };
  }
  return null;
}
