import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface AuditLogEntry {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  user_session_id: string;
  user_ip: string;
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

interface AuditResponse {
  success: boolean;
  data: AuditLogEntry[];
}

/**
 * Hook to fetch audit log entries for a member
 */
export function useMemberAuditLog(memberId: number, enabled = true) {
  return useQuery({
    queryKey: ['audit', 'member', memberId],
    queryFn: async (): Promise<AuditLogEntry[]> => {
      const response = await api.get<AuditResponse>(`/audit/member/${memberId}`);
      return response.data.data;
    },
    enabled: enabled && !!memberId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

