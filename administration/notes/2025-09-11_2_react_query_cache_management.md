# React Query: Cache Management and Performance Optimization

This guide covers advanced caching strategies, performance optimizations, and common pitfalls based on our codebase implementation patterns.

## 1. Cache Invalidation Strategies

### Selective Invalidation (Recommended)

```typescript
// ✅ GOOD: Selective invalidation using query key hierarchy
export function useCreateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberData: MemberFormData) => {
      const response = await api.post('/members', memberData);
      return response.data.data;
    },
    onSuccess: (newMember) => {
      // Only invalidate member lists, not individual member details
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
      
      // Optimistically add new member to cache
      queryClient.setQueryData(memberKeys.detail(newMember.id), newMember);
    },
  });
}
```

**Benefits:**
- Only refetches affected data
- Preserves unrelated cached data
- Better performance and user experience

### Broad Invalidation (Use Sparingly)

```typescript
// ⚠️ CAUTION: Broad invalidation - use only when necessary
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventData: UpdateEventRequest) => {
      const response = await api.put(`/events/${eventData.id}`, eventData);
      return response.data;
    },
    onSuccess: () => {
      // Invalidates ALL event-related queries
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}
```

**When to Use:**
- When changes affect multiple related entities
- When the scope of impact is unclear
- For bulk operations that touch many records

### Targeted Invalidation Patterns

```typescript
// Pattern 1: Invalidate specific related queries
onSuccess: (updatedMember) => {
  // Update the specific member
  queryClient.setQueryData(memberKeys.detail(updatedMember.id), updatedMember);
  
  // Invalidate lists that might include this member
  queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
  
  // If member flags changed, invalidate flag-related queries
  queryClient.invalidateQueries({ queryKey: ['member-flags', updatedMember.email] });
},

// Pattern 2: Cross-entity invalidation
onSuccess: (_, { flagId, userId }) => {
  // Invalidate both sides of the relationship
  queryClient.invalidateQueries({ queryKey: ['member-flags', userId] });
  queryClient.invalidateQueries({ queryKey: ['flag-members', flagId] });
},
```

## 2. Optimistic Updates

### Simple Optimistic Update

```typescript
export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...memberData }: MemberFormData & { id: number }) => {
      const response = await api.put(`/members/${id}`, { id, ...memberData });
      return response.data;
    },
    onSuccess: (updatedMember) => {
      // Immediately update cache with server response
      queryClient.setQueryData(memberKeys.detail(updatedMember.id), updatedMember);
      
      // Invalidate related data that might have changed
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}
```

### Advanced Optimistic Updates with Rollback

```typescript
export function useOptimisticUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updateData: MemberUpdate) => {
      const response = await api.put(`/members/${updateData.id}`, updateData);
      return response.data;
    },
    // Optimistically update before sending request
    onMutate: async (updateData) => {
      await queryClient.cancelQueries({ queryKey: memberKeys.detail(updateData.id) });
      
      const previousMember = queryClient.getQueryData(memberKeys.detail(updateData.id));
      
      // Optimistically update the cache
      queryClient.setQueryData(memberKeys.detail(updateData.id), (old: Member) => ({
        ...old,
        ...updateData,
      }));
      
      return { previousMember };
    },
    onError: (err, updateData, context) => {
      // Rollback on error
      if (context?.previousMember) {
        queryClient.setQueryData(memberKeys.detail(updateData.id), context.previousMember);
      }
    },
    onSettled: (data, error, updateData) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: memberKeys.detail(updateData.id) });
    },
  });
}
```

## 3. Prefetching Strategies

### Link Hover Prefetching

```typescript
export function usePrefetchMember() {
  const queryClient = useQueryClient();

  return (id: number) => {
    queryClient.prefetchQuery({
      queryKey: memberKeys.detail(id),
      queryFn: async (): Promise<Member> => {
        const response = await api.get(`/members/${id}`);
        return response.data;
      },
      staleTime: 5 * 60 * 1000,
    });
  };
}

// Usage in component
function MemberListItem({ member }: { member: Member }) {
  const prefetchMember = usePrefetchMember();
  
  return (
    <Link
      to={`/members/${member.id}`}
      onMouseEnter={() => prefetchMember(member.id)}
    >
      {member.name}
    </Link>
  );
}
```

### Pagination Prefetching

```typescript
export function useMembers(params: GetMembersParams = {}) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: memberKeys.list(params),
    queryFn: async () => {
      const response = await api.get('/members', { params });
      return response.data;
    },
    select: (data) => ({
      members: data.data,
      pagination: data.pagination,
    }),
  });

  // Prefetch next page if available
  useEffect(() => {
    if (query.data?.pagination) {
      const { page, totalPages } = query.data.pagination;
      if (page < totalPages) {
        const nextPageParams = { ...params, page: page + 1 };
        queryClient.prefetchQuery({
          queryKey: memberKeys.list(nextPageParams),
          queryFn: async () => {
            const response = await api.get('/members', { params: nextPageParams });
            return response.data;
          },
        });
      }
    }
  }, [query.data, params, queryClient]);

  return query;
}
```

## 4. Cache Time and Stale Time Optimization

### Entity-Specific Timing

```typescript
// Frequently changing data - shorter stale time
export function useAuditLogs() {
  return useQuery({
    queryKey: ['audit-logs'],
    queryFn: fetchAuditLogs,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Stable reference data - longer stale time
export function useFlags() {
  return useQuery({
    queryKey: ['flags'],
    queryFn: fetchFlags,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Real-time data - very short stale time
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    staleTime: 0, // Always stale, always refetch
    refetchInterval: 30 * 1000, // Poll every 30 seconds
  });
}
```

### Performance Configuration by Context

```typescript
// Admin dashboard - aggressive caching for better UX
const adminQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Real-time monitoring - minimal caching
const monitoringQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Always refetch
      gcTime: 1 * 60 * 1000, // 1 minute
      refetchInterval: 5 * 1000, // Poll every 5 seconds
    },
  },
});
```

## 5. Memory Management and Performance Pitfalls

### Pitfall 1: Memory Leaks from Unconstrained Caching

```typescript
// ❌ BAD: Unbounded query keys can cause memory leaks
export function useSearchResults(searchTerm: string) {
  return useQuery({
    queryKey: ['search', searchTerm], // Every search term creates new cache entry
    queryFn: () => api.get('/search', { params: { q: searchTerm } }),
  });
}

// ✅ GOOD: Bounded caching with debouncing
export function useSearchResults(searchTerm: string) {
  const debouncedTerm = useDebounce(searchTerm, 300);
  
  return useQuery({
    queryKey: ['search', debouncedTerm],
    queryFn: () => api.get('/search', { params: { q: debouncedTerm } }),
    enabled: debouncedTerm.length >= 3, // Only search with meaningful terms
    gcTime: 2 * 60 * 1000, // Shorter cache time for search results
  });
}
```

### Pitfall 2: Excessive Invalidation

```typescript
// ❌ BAD: Over-invalidation hurts performance
export function useUpdateMember() {
  return useMutation({
    onSuccess: () => {
      // This invalidates ALL queries, causing unnecessary refetches
      queryClient.invalidateQueries();
    },
  });
}

// ✅ GOOD: Targeted invalidation
export function useUpdateMember() {
  return useMutation({
    onSuccess: (updatedMember) => {
      // Only invalidate what's actually affected
      queryClient.setQueryData(memberKeys.detail(updatedMember.id), updatedMember);
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}
```

### Pitfall 3: Missing Query Key Dependencies

```typescript
// ❌ BAD: Query key doesn't include all dependencies
export function useFilteredMembers(filters: MemberFilters) {
  return useQuery({
    queryKey: ['members'], // Missing filter parameters!
    queryFn: () => api.get('/members', { params: filters }),
  });
}

// ✅ GOOD: Complete query key includes all dependencies
export function useFilteredMembers(filters: MemberFilters) {
  return useQuery({
    queryKey: memberKeys.list(filters), // Includes all filter parameters
    queryFn: () => api.get('/members', { params: filters }),
  });
}
```

## 6. Advanced Performance Patterns

### Query Deduplication

```typescript
// React Query automatically deduplicates identical queries
// These will share the same network request
function ComponentA() {
  const { data } = useMembers({ page: 1 });
  return <div>{/* ... */}</div>;
}

function ComponentB() {
  const { data } = useMembers({ page: 1 }); // Same query, shared request
  return <div>{/* ... */}</div>;
}
```

### Intelligent Background Refetching

```typescript
export function useSmartMembers(params: GetMembersParams) {
  return useQuery({
    queryKey: memberKeys.list(params),
    queryFn: () => api.get('/members', { params }),
    staleTime: 5 * 60 * 1000,
    
    // Refetch when window regains focus, but only if data is stale
    refetchOnWindowFocus: 'always',
    
    // Refetch when reconnecting to internet
    refetchOnReconnect: 'always',
    
    // Don't refetch on mount if data exists and is fresh
    refetchOnMount: false,
  });
}
```
