import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export interface AuditLogEntry {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  user_session_id?: string;
  user_ip: string;
  user_email: string;
  user_id: string;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  created_at: string;
}

interface AuditResponse {
  success: boolean;
  data: AuditLogEntry[];
}

/**
 * Hook to fetch audit log entries for a member
 */
export function useAuditLog(
  entityType: string,
  entityId: number,
  enabled = true
) {
  return useQuery({
    queryKey: ['audit', entityType, entityId],
    queryFn: async (): Promise<AuditLogEntry[]> => {
      try {
        const response = await api.get<AuditResponse>(`/audit`, {
          params: {
            entity_type: entityType,
            entity_id: entityId,
          },
        });
        return response.data.data;
      } catch (error: any) {
        // If audit API is not available (404), return empty array instead of throwing
        if (error?.response?.status === 404) {
          console.warn('Audit API not available, returning empty audit log');
          return [];
        }
        throw error;
      }
    },
    enabled: enabled && !!entityId,
    staleTime: 30 * 1000, // 30 seconds
  });
}
