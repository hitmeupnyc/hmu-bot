import { useNavigate } from 'react-router-dom';

interface LoadingStatesProps {
  isLoading: boolean;
  error: any;
}

export function LoadingStates({ isLoading, error }: LoadingStatesProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-gray-500">Loading member details...</div>
      </div>
    );
  }

  if (error) {
    // Check if it's a 403 Unauthorized error
    const is403Error =
      error &&
      typeof error === 'object' &&
      'response' in error &&
      (error as any).response?.status === 403;

    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          {is403Error
            ? "You don't have permission to access this member's details"
            : 'Failed to load member details'}
        </div>
        <div className="space-x-4">
          <button
            onClick={() => navigate(is403Error ? '/dashboard' : '/members')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            data-testid="back-to-members-btn"
          >
            {is403Error ? 'Go to Dashboard' : 'Back to Members'}
          </button>
          {!is403Error && (
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
