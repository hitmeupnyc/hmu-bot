/**
 * Response Formatters
 *
 * Centralized utilities for formatting API responses consistently across all controllers.
 * These helpers ensure a uniform response structure throughout the API.
 */

/**
 * Standard success response structure
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T = any> extends SuccessResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const createSuccessResponse = <T>(
  data: T,
  message?: string
): SuccessResponse<T> => ({ success: true, data, message });

export const createPaginatedResponse = <T>(
  data: T,
  pagination: PaginatedResponse['pagination']
): PaginatedResponse<T> => ({ success: true, data, pagination });
