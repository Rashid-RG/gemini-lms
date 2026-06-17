/**
 * API Response Caching Middleware
 * Caches GET request responses to reduce redundant database queries
 */

const responseCache = new Map();
const CACHE_DURATIONS = {
  '/api/courses': 30 * 1000,           // 30 seconds
  '/api/user-streak': 5 * 60 * 1000,   // 5 minutes
  '/api/notifications': 2 * 60 * 1000, // 2 minutes
  '/api/student-progress': 60 * 1000,  // 1 minute
  '/api/dashboard-data': 30 * 1000,    // 30 seconds
  DEFAULT: 5 * 60 * 1000               // 5 minutes default
};

/**
 * Middleware wrapper for GET endpoints
 * Usage:
 * export const GET = withResponseCache(async (req) => {
 *   // Your handler logic
 * });
 */
export function withResponseCache(handler, cacheDuration = null) {
  return async (req, ...args) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return handler(req, ...args);
    }

    const cacheKey = `${req.method}:${req.nextUrl.pathname}:${req.nextUrl.search}`;
    const cached = responseCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < (cacheDuration || CACHE_DURATIONS[req.nextUrl.pathname] || CACHE_DURATIONS.DEFAULT)) {
      return new Response(cached.body, {
        ...cached.init,
        headers: {
          ...cached.init.headers,
          'X-Cache': 'HIT',
          'X-Cache-Age': Math.round((Date.now() - cached.timestamp) / 1000)
        }
      });
    }

    // Call the actual handler
    let response = await handler(req, ...args);

    // Clone response to cache it
    if (response.ok && response.status === 200) {
      const body = await response.clone().text();
      responseCache.set(cacheKey, {
        body,
        init: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        },
        timestamp: Date.now()
      });

      // Add cache headers to response
      const headers = new Headers(response.headers);
      headers.set('X-Cache', 'MISS');
      response = new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }

    return response;
  };
}

/**
 * Clear cache for a specific endpoint or pattern
 */
export function clearResponseCache(pattern = null) {
  if (!pattern) {
    responseCache.clear();
    return;
  }

  const regex = new RegExp(pattern);
  for (const key of responseCache.keys()) {
    if (regex.test(key)) {
      responseCache.delete(key);
    }
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  let totalSize = 0;
  for (const entry of responseCache.values()) {
    totalSize += entry.body.length;
  }

  return {
    cacheSize: responseCache.size,
    totalBytes: totalSize,
    entries: Array.from(responseCache.entries()).map(([key, value]) => ({
      key,
      size: value.body.length,
      age: Date.now() - value.timestamp
    }))
  };
}
