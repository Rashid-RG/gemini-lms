/**
 * Simple in-memory cache with TTL support
 * For production at scale, consider Redis
 */

class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.cleanupInterval = null;
    this.startCleanup();
  }

  /**
   * Set a value in cache with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlMs - Time to live in milliseconds (default 5 minutes)
   */
  set(key, value, ttlMs = 5 * 60 * 1000) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null if expired/not found
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Delete a specific key
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Delete all keys matching a pattern
   * @param {string} pattern - Pattern to match (supports * wildcard)
   */
  deletePattern(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached data
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  stats() {
    let validCount = 0;
    let expiredCount = 0;
    const now = Date.now();
    
    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expiredCount++;
      } else {
        validCount++;
      }
    }
    
    return {
      total: this.cache.size,
      valid: validCount,
      expired: expiredCount
    };
  }

  /**
   * Periodic cleanup of expired entries
   */
  startCleanup() {
    if (this.cleanupInterval) return;
    
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
        }
      }
    }, 60 * 1000); // Cleanup every minute
  }
}

// Singleton instance
const cache = new MemoryCache();

// Cache TTL presets
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000,      // 1 minute
  MEDIUM: 5 * 60 * 1000,     // 5 minutes  
  LONG: 15 * 60 * 1000,      // 15 minutes
  HOUR: 60 * 60 * 1000,      // 1 hour
  DAY: 24 * 60 * 60 * 1000   // 24 hours
};

/**
 * Cache wrapper for async functions
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to fetch data if not cached
 * @param {number} ttlMs - Time to live
 * @returns {Promise<any>}
 */
export async function withCache(key, fetchFn, ttlMs = CACHE_TTL.MEDIUM) {
  const cached = cache.get(key);
  if (cached !== null) {
    return cached;
  }
  
  const result = await fetchFn();
  cache.set(key, result, ttlMs);
  return result;
}

/**
 * Invalidate cache for user-specific data
 * @param {string} userEmail - User email
 */
export function invalidateUserCache(userEmail) {
  cache.deletePattern(`user:${userEmail}:*`);
}

/**
 * Invalidate cache for course-specific data
 * @param {string} courseId - Course ID
 */
export function invalidateCourseCache(courseId) {
  cache.deletePattern(`course:${courseId}:*`);
}

export default cache;
