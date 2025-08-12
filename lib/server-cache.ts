import Redis from 'ioredis';

// Simple adaptive cache abstraction: uses Redis if REDIS_URL provided, else in-memory Map.
// Provides get/set with TTL (seconds). For in-memory, purges lazily on get.

interface CacheEntry<T> { value: T; expiresAt: number; }

const memoryStore = new Map<string, CacheEntry<any>>();
let redis: Redis | null = null;

if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
    });
    redis.on('error', (e: any) => {
      console.warn('Redis error, falling back to memory cache:', e?.message);
      redis = null;
    });
  } catch (e: any) {
    console.warn('Failed to init Redis, using memory cache', e.message);
    redis = null;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (redis) {
    const raw = await redis.get(key);
    if (!raw) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
  }
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value as T;
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  if (redis) {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    return;
  }
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export function cacheKey(parts: (string | number | undefined | null)[]): string {
  return parts.filter(p => p !== undefined && p !== null && p !== '').join(':');
}
