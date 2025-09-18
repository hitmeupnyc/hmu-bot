# React Query: Project Initialization and Query Design Practices

This guide covers best practices for setting up React Query in your project and designing effective query patterns, based on the implementation in our administration codebase.

## 1. Query Client Configuration

### Core Setup (`client/src/lib/queryClient.ts`)

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
```

**Key Configuration Decisions:**
- **staleTime: 5 minutes** - Data is considered fresh for 5 minutes, preventing unnecessary refetches
- **gcTime: 10 minutes** - Cached data is garbage collected after 10 minutes of inactivity
- **Smart retry logic** - Don't retry 4xx errors (client errors), but retry network/server errors up to 3 times
- **refetchOnWindowFocus: false** - Prevents aggressive refetching when switching browser tabs
- **mutations.retry: false** - Mutations should not auto-retry to prevent duplicate operations

### Provider Integration (`client/src/main.tsx`)

```typescript
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
```

**Best Practices:**
- Place `QueryClientProvider` at the top level but inside `React.StrictMode`
- Include `ReactQueryDevtools` for debugging (automatically disabled in production)
- Position other context providers (Auth, Router) inside the QueryClientProvider

## 2. Query Key Factory Pattern

### Hierarchical Query Keys (`client/src/hooks/useMembers.ts`)

```typescript
// Query key factory for consistent cache management
const memberKeys = {
  all: ['members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (params: GetMembersParams) => [...memberKeys.lists(), params] as const,
  details: () => [...memberKeys.all, 'detail'] as const,
  detail: (id: number) => [...memberKeys.details(), id] as const,
};
```

**Benefits:**
- **Consistent naming** - All member-related queries follow the same pattern
- **Hierarchical invalidation** - Can invalidate all member queries or specific subsets
- **Type safety** - TypeScript ensures correct key structures
- **Scalable** - Easy to add new query types while maintaining consistency

### Query Key Examples by Entity Type

Using the same pattern across all entities, with types extracted from the SDK:

```typescript
// Events - types from SDK
type GetEventsParams = Parameters<typeof sdk.events.list>[0];

const eventKeys = {
  all: ['events'] as const,
  list: (params: GetEventsParams) => [...eventKeys.all, 'list', params] as const,
};

// Flags - types from SDK  
type GetFlagsParams = Parameters<typeof sdk.flags.list>[0];

const flagKeys = {
  all: ['flags'] as const,
  list: (params: GetFlagsParams) => [...flagKeys.all, 'list', params] as const,
};
```

## 3. Query Hook Design Patterns

### SDK-Based Query Implementation (`client/src/hooks/useMembers.ts`)

```typescript
import { useQuery } from '@tanstack/react-query';
import { sdk } from 'api-server/types';

// Type extracted directly from SDK - complete type safety!
type GetMembersParams = Parameters<typeof members.list<true>>[0];

// Query key factory for consistent cache management
const memberKeys = {
  all: ['members'] as const,
  list: (params: GetMembersParams) =>
    [...memberKeys.all, 'list', params] as const,
  detail: (id: number) => [...memberKeys.all, 'detail', id] as const,
};

const { members } = sdk;

export function useMembers(params: GetMembersParams) {
  return useQuery({
    queryKey: memberKeys.list(params),
    queryFn: () => sdk.members.list(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: ([data]) => ({
      members: data.data,
      pagination: {
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: data.totalPages,
      },
    }),
  });
}
```

**Key Pattern Elements:**
- **SDK Type Extraction** - `Parameters<typeof members.list<true>>[0]` extracts exact parameter types from SDK
- **Complete Type Safety** - No manual interface definitions needed, types come from the API schema
- **Tuple Response** - SDK returns `[data]` tuple, destructured in `select` function
- **Direct SDK Integration** - Clean, simple API calls with full TypeScript support
- **Automatic Validation** - Compile-time parameter validation through SDK types

## 4. API Integration with Type-Safe SDK

### SDK-Based API Client (`server/src/sdk/index.ts`)

Our project uses a type-safe SDK client that provides complete TypeScript safety for all API operations.

### Understanding the Tuple Response Pattern

The SDK returns responses as tuples that need to be destructured in the `select` function:

```typescript
export function useEvents() {
  type EventsParams = Parameters<typeof sdk.events.list>[0];
  
  return useQuery({
    queryKey: ['events', 'list', params],
    queryFn: () => sdk.events.list(params),
    select: ([data]) => ({
      // SDK returns [data] tuple - destructure the first element
      events: data.data,
      pagination: {
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: data.totalPages,
      },
    }),
  });
}
```

### SDK-Based Mutation Examples

All mutations follow the same pattern - extract types from SDK and use promisified methods:

```typescript
export function useCreateEvent() {
  const queryClient = useQueryClient();
  type CreateEventParams = Parameters<typeof sdk.events.create>[0];

  return useMutation({
    mutationFn: (eventData: CreateEventParams) => 
      sdk.events.create(eventData),
    onSuccess: ([newEvent]) => {
      // Handle tuple response in success callback too
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.setQueryData(['events', 'detail', newEvent.id], newEvent);
    },
  });
}
```

### Advantages of SDK Integration

- **Complete Type Safety**: No manual interface definitions needed
- **IntelliSense Support**: Full autocomplete for all API methods and parameters
- **Compile-Time Safety**: TypeScript catches parameter mismatches at build time
- **Consistent Error Handling**: Built-in HTTP status filtering and error transformation
- **Effect Integration**: Leverages Effect-TS ecosystem for robust async operations
- **Promise-Based**: Seamlessly integrates with React Query's Promise-based API
