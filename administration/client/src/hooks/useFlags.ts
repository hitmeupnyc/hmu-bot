import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface Flag {
  id: string;
  name: string;
  description?: string;
  category?: 'verification' | 'subscription' | 'feature' | 'compliance' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface MemberFlag {
  id: string;
  name: string;
  description?: string;
  category?: string;
  grantedAt: string;
  expiresAt?: string;
  grantedBy: string;
  expired: boolean;
  metadata?: Record<string, any>;
}

export interface FlagMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  granted_at: string;
  granted_by: string;
  expires_at?: string;
}

export interface GrantFlagData {
  email: string;
  flagId: string;
  expiresAt?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface RevokeFlagData {
  email: string;
  flagId: string;
  reason?: string;
}

// Fetch all flags
export function useFlags() {
  return useQuery<Flag[]>({
    queryKey: ['flags'],
    queryFn: async () => {
      const response = await fetch('/api/flags', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch flags');
      }
      return response.json();
    },
  });
}

// Fetch flags by category
export function useFlagsByCategory(category: string) {
  return useQuery<Flag[]>({
    queryKey: ['flags', 'category', category],
    queryFn: async () => {
      const response = await fetch(`/api/flags/categories/${category}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch flags by category');
      }
      return response.json();
    },
    enabled: !!category,
  });
}

// Fetch member's flags
export function useMemberFlags(email: string) {
  return useQuery<MemberFlag[]>({
    queryKey: ['member-flags', email],
    queryFn: async () => {
      const response = await fetch(`/api/members/${email}/flags`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch member flags');
      }
      return response.json();
    },
    enabled: !!email,
  });
}

// Fetch members with a specific flag
export function useFlagMembers(flagId: string) {
  return useQuery<FlagMember[]>({
    queryKey: ['flag-members', flagId],
    queryFn: async () => {
      const response = await fetch(`/api/flags/${flagId}/members`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch flag members');
      }
      return response.json();
    },
    enabled: !!flagId,
  });
}

// Grant flag mutation
export function useGrantFlag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: GrantFlagData) => {
      const response = await fetch(`/api/members/${data.email}/flags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          flag_id: data.flagId,
          expires_at: data.expiresAt,
          reason: data.reason,
          metadata: data.metadata,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to grant flag');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast.success(`Flag ${variables.flagId} granted to ${variables.email}`);
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['member-flags', variables.email] });
      queryClient.invalidateQueries({ queryKey: ['flag-members', variables.flagId] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Revoke flag mutation
export function useRevokeFlag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: RevokeFlagData) => {
      const response = await fetch(`/api/members/${data.email}/flags/${data.flagId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          reason: data.reason,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to revoke flag');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast.success(`Flag ${variables.flagId} revoked from ${variables.email}`);
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['member-flags', variables.email] });
      queryClient.invalidateQueries({ queryKey: ['flag-members', variables.flagId] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Bulk grant flags mutation
export function useBulkGrantFlags() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (operations: Array<{
      email: string;
      flag_id: string;
      expires_at?: string;
      reason?: string;
      metadata?: Record<string, any>;
    }>) => {
      const response = await fetch('/api/flags/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ operations }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process bulk operations');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast.success(`Processed ${variables.length} flag operations`);
      // Invalidate all flag-related queries
      queryClient.invalidateQueries({ queryKey: ['member-flags'] });
      queryClient.invalidateQueries({ queryKey: ['flag-members'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Process expired flags mutation
export function useProcessExpiredFlags() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/flags/expire', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process expired flags');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`Processed ${data.processed} expired flags`);
      // Invalidate all flag-related queries
      queryClient.invalidateQueries({ queryKey: ['member-flags'] });
      queryClient.invalidateQueries({ queryKey: ['flag-members'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Check member permissions
export function useMemberPermissions(
  email: string,
  resourceType?: string,
  resourceId?: string,
  permission?: string
) {
  return useQuery({
    queryKey: ['member-permissions', email, resourceType, resourceId, permission],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (resourceType) params.append('resource_type', resourceType);
      if (resourceId) params.append('resource_id', resourceId);
      if (permission) params.append('permission', permission);
      
      const response = await fetch(`/api/members/${email}/permissions?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to check permissions');
      }
      
      return response.json();
    },
    enabled: !!email,
  });
}

// Custom hook to check if current user has specific flags
export function useHasFlags(...flagIds: string[]) {
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
      });
      if (!response.ok) return null;
      return response.json();
    },
  });
  
  const { data: permissions } = useMemberPermissions(session?.user?.email || '');
  
  if (!permissions?.flags) return false;
  
  const userFlagIds = permissions.flags.map((f: MemberFlag) => f.id);
  return flagIds.every(flagId => userFlagIds.includes(flagId));
}

// Hook to check if current user is superuser
export function useIsSuperuser() {
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
      });
      if (!response.ok) return null;
      return response.json();
    },
  });
  
  return session?.user?.email === 'software@hitmeupnyc.com';
}