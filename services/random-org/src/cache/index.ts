const cache = new Map<string, { data: any; timestamp: number }>();

export function cacheGet(key: string) {
  return cache.get(key);
}

export function cacheSet(key: string, data: any, ttl: number = 5000) {
  cache.set(key, { data, timestamp: Date.now() });

  setTimeout(() => {
    cache.delete(key);
  }, ttl);
}