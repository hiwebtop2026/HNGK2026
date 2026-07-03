interface CacheEntry {
  data: any;
  timestamp: number;
}

const CACHE_DURATION = 30 * 60 * 1000;

const cache = new Map<string, CacheEntry>();

function getCacheKey(prefix: string, ...args: any[]): string {
  return `${prefix}:${JSON.stringify(args)}`;
}

function getFromCache(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        cache.set(key, parsed);
        return parsed.data;
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
  
  return entry.data;
}

function setCache(key: string, data: any): void {
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
  async get<T>(prefix: string, fetcher: () => Promise<T>, ...args: any[]): Promise<T> {
    const key = `gaokao_cache:${getCacheKey(prefix, ...args)}`;
    const cached = getFromCache(key);
    
    if (cached !== null) {
      return cached;
    }
    
    const data = await fetcher();
    setCache(key, data);
    return data;
  },
  
  invalidate(prefix: string, ...args: any[]): void {
    const key = `gaokao_cache:${getCacheKey(prefix, ...args)}`;
    cache.delete(key);
    localStorage.removeItem(key);
  },
  
  clear: clearCache,
  
  clearByPrefix: clearCacheByPrefix,
  
  getStats(): { size: number; memorySize: number } {
    return {
      size: cache.size,
      memorySize: JSON.stringify(Array.from(cache.entries())).length,
    };
  },
};