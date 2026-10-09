interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const CACHE_DURATION = 30 * 60 * 1000;

const cache = new Map<string, CacheEntry>();

function getCacheKey(prefix: string, ...args: unknown[]): string {
  return `${prefix}:${JSON.stringify(args)}`;
}

function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored) as CacheEntry;
        cache.set(key, parsed);
        return parsed.data as T;
      }
    } catch {
      return null;
    }
    return null;
  }
  
  if (Date.now() - entry.timestamp > CACHE_DURATION) {
    cache.delete(key);
    localStorage.removeItem(key);
    return null;
  }
  
  return entry.data as T;
}

function setCache(key: string, data: unknown): void {
  const entry: CacheEntry = {
    data,
    timestamp: Date.now(),
  };
  cache.set(key, entry);
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    console.warn('localStorage quota exceeded, cache not saved');
  }
}

function clearCache(): void {
  cache.clear();
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('gaokao_cache:')) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    console.warn('Failed to clear localStorage cache');
  }
}

function clearAllLocalStorage(): void {
  cache.clear();
  try {
    Object.keys(localStorage).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch {
    console.warn('Failed to clear all localStorage');
  }
}

function clearCacheByPrefix(prefix: string): void {
  const keysToRemove: string[] = [];
  cache.forEach((_, key) => {
    if (key.startsWith(`gaokao_cache:${prefix}:`)) {
      keysToRemove.push(key);
    }
  });
  keysToRemove.forEach(key => cache.delete(key));
  
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(`gaokao_cache:${prefix}:`)) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    console.warn('Failed to clear localStorage cache');
  }
}

export const cacheService = {
  async get<T>(prefix: string, fetcher: () => Promise<T>, ...args: unknown[]): Promise<T> {
    const key = `gaokao_cache:${getCacheKey(prefix, ...args)}`;
    const cached = getFromCache<T>(key);
    
    if (cached !== null) {
      return cached;
    }
    
    const data = await fetcher();
    setCache(key, data);
    return data;
  },
  
  invalidate(prefix: string, ...args: unknown[]): void {
    const key = `gaokao_cache:${getCacheKey(prefix, ...args)}`;
    cache.delete(key);
    localStorage.removeItem(key);
  },
  
  clear: clearCache,
  
  clearAll: clearAllLocalStorage,
  
  clearByPrefix: clearCacheByPrefix,
  
  getStats(): { size: number; memorySize: number } {
    return {
      size: cache.size,
      memorySize: JSON.stringify(Array.from(cache.entries())).length,
    };
  },
};