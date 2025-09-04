/**
 * Flags API Module
 * 
 * Provides endpoints for flag management including:
 * - Listing available flags
 * - Managing member flag assignments
 * - Bulk operations
 * - Processing expired flags
 */

export { flagsGroup } from './endpoints';
export { FlagsApiLive } from './handlers';