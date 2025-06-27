// Mock KV Namespace for testing
export const createMockKVNamespace = () => {
  const store = new Map<string, { value: string; expiry?: number }>();
  
  return {
    put: async (key: string, value: string, options?: { expirationTtl?: number }) => {
      const expiry = options?.expirationTtl 
        ? Date.now() + (options.expirationTtl * 1000)
        : undefined;
      store.set(key, { value, expiry });
    },
    
    get: async (key: string): Promise<string | null> => {
      const item = store.get(key);
      if (!item) return null;
      
      // Check expiry
      if (item.expiry && Date.now() > item.expiry) {
        store.delete(key);
        return null;
      }
      
      return item.value;
    },
    
    delete: async (key: string) => {
      store.delete(key);
    },
    
    // Helper methods for testing
    clear: () => store.clear(),
    size: () => store.size,
    keys: () => Array.from(store.keys())
  };
};