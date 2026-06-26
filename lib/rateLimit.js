/**
 * Simple in-memory rate limiter for API routes
 * For production, use Redis-based rate limiting
 */

// Store for tracking requests: { identifier: { count, resetTime } }
const requestStore = new Map();

// Clean up expired entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  for (const [key, value] of requestStore.entries()) {
    if (value.resetTime < now) {
      requestStore.delete(key);
    }
  }
  lastCleanup = now;
}

/**
 * Rate limit configuration per endpoint type
 */
export const RATE_LIMITS = {
  // Course generation - expensive AI operation
  'course-generation': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5, // 5 courses per hour per user
    message: 'Too many course generation requests. Please wait before creating another course.'
  },
  // Study content generation (flashcards, quiz, etc.)
  'study-content': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 20, // 20 requests per 15 min
    message: 'Too many content generation requests. Please wait a few minutes.'
  },
  // General API calls
  'general': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    message: 'Too many requests. Please slow down.'
  },
  // AI Chat
  'ai-chat': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 messages per minute per user
    message: 'Too many chat messages. Please wait a moment before sending more.'
  },
  // YouTube search (external API)
  'youtube-search': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 searches per minute
    message: 'Too many video search requests. Please wait a moment.'
  },
  // Assignment submission
  'assignment': {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10, // 10 submissions per 5 min
    message: 'Too many assignment submissions. Please wait a few minutes.'
  }
};

/**
 * Check if request should be rate limited
 * @param {string} identifier - User email or IP address
 * @param {string} limitType - Type of rate limit to apply
 * @returns {{ limited: boolean, remaining: number, resetIn: number, message?: string }}
 */
export function checkRateLimit(identifier, limitType = 'general') {
  cleanup();
  
  const config = RATE_LIMITS[limitType] || RATE_LIMITS.general;
  const key = `${limitType}:${identifier}`;
  const now = Date.now();
  
  const record = requestStore.get(key);
  
  if (!record || record.resetTime < now) {
    // First request or window expired - reset
    requestStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    });
    return {
      limited: false,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs
    };
  }
  
  // Check if over limit
  if (record.count >= config.maxRequests) {
    return {
      limited: true,
      remaining: 0,
      resetIn: record.resetTime - now,
      message: config.message
    };
  }
  
  // Increment count
  record.count++;
  requestStore.set(key, record);
  
  return {
    limited: false,
    remaining: config.maxRequests - record.count,
    resetIn: record.resetTime - now
  };
}

/**
 * Get rate limit headers for response
 * @param {string} identifier 
 * @param {string} limitType 
 * @returns {Object} Headers object
 */
export function getRateLimitHeaders(identifier, limitType = 'general') {
  const result = checkRateLimit(identifier, limitType);
  const config = RATE_LIMITS[limitType] || RATE_LIMITS.general;
  
  return {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetIn / 1000).toString()
  };
}

// Re-export safeJsonParse from canonical module for backward compatibility
// All existing imports like `import { safeJsonParse } from "@/lib/rateLimit"` continue to work
export { safeJsonParse } from "@/lib/jsonUtils";

/**
 * Retry function with exponential backoff
 * Improved to handle Gemini API errors, timeouts, and rate limits
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise<any>}
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 4,
    baseDelayMs = 2000,
    maxDelayMs = 60000,
    onRetry = null
  } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const errorMessage = error?.message?.toLowerCase() || '';
      const errorStatus = error?.status || error?.code;
      
      // Comprehensive check for retryable errors
      const isRateLimit = errorStatus === 429 || 
                          errorMessage.includes('429') ||
                          errorMessage.includes('quota') ||
                          errorMessage.includes('rate limit') ||
                          errorMessage.includes('resource exhausted');
      
      const isOverloaded = errorStatus === 503 || 
                           errorMessage.includes('503') ||
                           errorMessage.includes('overloaded') ||
                           errorMessage.includes('service unavailable') ||
                           errorMessage.includes('model is overloaded');
      
      const isTimeout = errorMessage.includes('timeout') ||
                        errorMessage.includes('timed out') ||
                        errorMessage.includes('fetch failed') ||
                        errorMessage.includes('econnreset') ||
                        errorMessage.includes('socket hang up');
      
      const isTemporary = errorStatus === 500 ||
                          errorStatus === 502 ||
                          errorMessage.includes('internal error') ||
                          errorMessage.includes('bad gateway');
      
      const isRetryable = isRateLimit || isOverloaded || isTimeout || isTemporary;
      
      // Last attempt - throw regardless
      if (attempt >= maxRetries - 1) {
        throw error;
      }
      
      if (isRetryable) {
        // Calculate delay with exponential backoff
        // Use longer delays for rate limits and overload errors
        let multiplier = 2;
        if (isRateLimit) multiplier = 3;
        if (isOverloaded) multiplier = 2.5;
        
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 1000;
        const delay = Math.min(baseDelayMs * Math.pow(multiplier, attempt) + jitter, maxDelayMs);
        
        if (onRetry) {
          onRetry(attempt + 1, maxRetries, Math.round(delay), error);
        } else {
          const errorType = isRateLimit ? 'RATE_LIMIT' : isOverloaded ? 'OVERLOADED' : isTimeout ? 'TIMEOUT' : 'TEMPORARY';
          console.log(`[${errorType}] Retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms. Error: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Non-retryable error, throw immediately
        throw error;
      }
    }
  }
  
  throw lastError;
}
