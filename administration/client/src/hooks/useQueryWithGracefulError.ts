import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { AxiosError } from 'axios';

interface GracefulQueryResult<T> extends Omit<UseQueryResult<T>, 'error'> {
  error: Error | null;
  isFeatureUnavailable: boolean;
}

export function useQueryWithGracefulError<T>(
  options: UseQueryOptions<T>
): GracefulQueryResult<T> {
  const result = useQuery(options);

  // Check if error is a 404 or network error that indicates feature unavailability
  const isFeatureUnavailable = result.error && (
    (result.error as AxiosError)?.response?.status === 404 ||
    (result.error as AxiosError)?.code === 'ECONNREFUSED' ||
    result.error.message.includes('not found') ||
    result.error.message.includes('Failed to fetch')
  );

  return {
    ...result,
    error: isFeatureUnavailable ? null : result.error,
    isFeatureUnavailable: !!isFeatureUnavailable,
  };
}