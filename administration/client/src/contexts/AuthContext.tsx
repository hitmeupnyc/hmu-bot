import { createContext, useContext, useEffect } from 'react';
import { useSession } from '../lib/auth-client';

interface AuthContextType {
  session: any | null; // Using any for now to avoid complex types
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  refetchSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    data: session,
    isPending: isLoading,
    error,
    refetch: refetchSession,
  } = useSession();

  const isAuthenticated = !!session?.user;

  // Redirect to login if not authenticated and trying to access protected route
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !window.location.pathname.startsWith('/login')) {
      const currentPath = window.location.pathname + window.location.search;
      const loginUrl = `/login?from=${encodeURIComponent(currentPath)}`;
      window.location.href = loginUrl;
    }
  }, [isLoading, isAuthenticated]);

  const value: AuthContextType = {
    session,
    isLoading,
    error,
    isAuthenticated,
    refetchSession: () => refetchSession(),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}