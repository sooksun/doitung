// Simple in-memory cache for performance optimization
// In production, consider using Redis or similar

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class SimpleCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map()

  set<T>(key: string, data: T, ttl: number = 300000): void {
    // Default TTL: 5 minutes (300000ms)
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) return null

    // Check if cache is expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Delete all cache entries matching a pattern
  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern)
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }
}

// Global cache instance
const globalCache = new SimpleCache()

export default globalCache

// Cache helper functions
export function getCacheKey(prefix: string, ...params: (string | number)[]): string {
  return `${prefix}:${params.join(':')}`
}

// Invalidate cache patterns
export function invalidateAssessmentCache(assessmentId: string): void {
  globalCache.deletePattern(`assessment:${assessmentId}`)
  globalCache.deletePattern('dashboard:')
  globalCache.deletePattern('assessments:list')
}

export function invalidateUserCache(userId: string): void {
  globalCache.deletePattern(`user:${userId}`)
  globalCache.delete('users:list')
}

export function invalidateDashboardCache(): void {
  globalCache.deletePattern('dashboard:')
}
