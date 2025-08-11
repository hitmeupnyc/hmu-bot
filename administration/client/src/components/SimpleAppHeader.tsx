import { signOut } from '../lib/auth-client';
import { useAuth } from '../contexts/AuthContext';

export function SimpleAppHeader() {
  const { session, isLoading } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.href = '/login';
          },
        },
      });
    } catch (error) {
      console.error('Sign out error:', error);
      // Force redirect even if sign out fails
      window.location.href = '/login';
    }
  };

  if (isLoading || !session?.user) {
    return null;
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-900">
            HMU Administration
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>👤</span>
            <span>{session.user.name || session.user.email}</span>
            {!session.user.emailVerified && (
              <span className="text-amber-600 text-xs">(unverified)</span>
            )}
          </div>
          
          <button
            onClick={handleSignOut}
            className="flex items-center space-x-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded"
          >
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}