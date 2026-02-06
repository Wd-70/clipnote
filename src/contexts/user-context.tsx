'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';

export interface UserData {
  id: string;
  email: string;
  name: string;
  image: string;
  points: number;
  role: 'FREE' | 'PRO';
}

interface UserContextState {
  user: UserData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const UserContext = createContext<UserContextState | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    if (status === 'loading') return;

    if (!session?.user) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/user/me');

      if (!res.ok) {
        if (res.status === 404) {
          // User not found in DB yet - use session data with defaults
          setUser({
            id: session.user.id || '',
            email: session.user.email || '',
            name: session.user.name || '',
            image: session.user.image || '',
            points: 0,
            role: 'FREE',
          });
          return;
        }
        throw new Error('Failed to fetch user');
      }

      const data = await res.json();
      setUser(data.data);
    } catch (err) {
      console.error('[UserContext] Failed to fetch user:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Fallback to session data
      if (session?.user) {
        setUser({
          id: session.user.id || '',
          email: session.user.email || '',
          name: session.user.name || '',
          image: session.user.image || '',
          points: 0,
          role: 'FREE',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [session, status]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        error,
        refetch: fetchUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}
