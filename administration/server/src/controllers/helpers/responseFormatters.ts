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

/**
 * Create a standard success response with data
 */
export const createSuccessResponse = <T>(data: T): SuccessResponse<T> => ({
  success: true,
  data,
});

/**
 * Create a success response with data and a message
 */
export const createSuccessResponseWithMessage = <T>(
  data: T,
  message: string
): SuccessResponse<T> => ({
  success: true,
  data,
  message,
});

/**
 * Create a success response with just a message (no data)
 */
export const createMessageResponse = (message: string): SuccessResponse<null> => ({
  success: true,
  data: null,
  message,
});

/**
 * Create a paginated response
 */
export const createPaginatedResponse = <T>(
  data: T,
  pagination: PaginatedResponse['pagination']
): PaginatedResponse<T> => ({
  success: true,
  data,
  pagination,
});

/**
 * Type guard to check if a response includes pagination
 */
export const isPaginatedResponse = (
  response: SuccessResponse | PaginatedResponse
): response is PaginatedResponse => {
  return 'pagination' in response;
};