import NextAuth from 'next-auth';
import type { Adapter } from 'next-auth/adapters';
import Google from 'next-auth/providers/google';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { MongoClient, ServerApiVersion } from 'mongodb';

// MongoDB client for NextAuth adapter
const uri = process.env.MONGODB_URI;

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

let clientPromise: Promise<MongoClient> | undefined;

// Only initialize MongoDB client if URI is provided
if (uri) {
  let client: MongoClient;

  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Type assertion needed due to @auth/core version mismatch between next-auth and @auth/mongodb-adapter
  adapter: clientPromise ? (MongoDBAdapter(clientPromise) as Adapter) : undefined,
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
