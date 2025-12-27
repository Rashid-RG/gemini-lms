/**
 * Rate Limiting Middleware for Next.js API Routes
 * Provides easy-to-use wrappers for protecting API endpoints
 * 
 * @module rateLimitMiddleware
 */

import { NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from './rateLimit';
import { logger } from './logger';

/**
 * Extract client identifier from request
 * Uses authenticated user email if available, otherwise IP address
 * 
 * @param {Request} req - Next.js request object
 * @returns {string} Client identifier
 */
export function getClientIdentifier(req) {
  // Check for authenticated user (Clerk sets this header)
  const userId = req.headers.get('x-clerk-user-id');
  if (userId) return `user:${userId}`;
  
  // Check for user email in auth context
  const userEmail = req.headers.get('x-user-email');
  if (userEmail) return `email:${userEmail}`;
  
  // Fall back to IP address
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 
             req.headers.get('x-real-ip') || 
             'unknown';
  
  return `ip:${ip}`;
}

/**
 * Create a rate-limited API handler wrapper
 * 
 * @param {Function} handler - The API route handler function
 * @param {Object} options - Rate limiting options
 * @param {string} options.limitType - Type of rate limit ('general', 'course-generation', etc.)
 * @param {Function} options.getIdentifier - Custom function to extract identifier from request
 * @returns {Function} Wrapped handler with rate limiting
 * 
 * @example
 * // In your API route
 * export const POST = withRateLimit(async (req) => {
 *   // Your handler logic
 * }, { limitType: 'course-generation' });
 */
export function withRateLimit(handler, options = {}) {
  const { 
    limitType = 'general',
    getIdentifier = getClientIdentifier
  } = options;

  return async function rateLimitedHandler(req, context) {
    const identifier = getIdentifier(req);
    const result = checkRateLimit(identifier, limitType);
    
    // Add rate limit headers to all responses
    const headers = getRateLimitHeaders(identifier, limitType);
    
    if (result.limited) {
      // Log rate limit hit
      logger.warn('Rate limit exceeded', {
        identifier,
        limitType,
        resetIn: result.resetIn,
        endpoint: req.url
      });
      
      return NextResponse.json(
        { 
          error: result.message || 'Too many requests',
          code: 'RATE_LIMITED',
          retryAfter: Math.ceil(result.resetIn / 1000)
        },
        { 
          status: 429,
          headers: {
            ...headers,
            'Retry-After': Math.ceil(result.resetIn / 1000).toString()
          }
        }
      );
    }
    
    try {
      // Call the original handler
      const response = await handler(req, context);
      
      // If response is NextResponse, add headers
      if (response instanceof NextResponse) {
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }
      
      // If handler returned a plain object, wrap it
      return NextResponse.json(response, { headers });
    } catch (error) {
      logger.error('API handler error', {
        error: error.message,
        stack: error.stack,
        endpoint: req.url
      });
      throw error;
    }
  };
}

/**
 * Rate limit configurations for specific public endpoints
 * Stricter limits for unauthenticated requests
 */
export const PUBLIC_RATE_LIMITS = {
  // Public course listing
  'public-courses': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    message: 'Too many requests. Please wait a moment.'
  },
  // Certificate verification (public)
  'certificate-verify': {
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: 'Too many verification requests.'
  },
  // Course preview (unauthenticated)
  'course-preview': {
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: 'Too many preview requests.'
  },
  // Auth endpoints
  'auth': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    message: 'Too many authentication attempts. Please try again later.'
  },
  // API health check
  'health': {
    windowMs: 60 * 1000,
    maxRequests: 60,
    message: 'Too many health check requests.'
  }
};

// Merge public limits with existing limits
Object.assign(RATE_LIMITS, PUBLIC_RATE_LIMITS);

/**
 * Middleware function for API route protection
 * Can be used in middleware.js for route-level protection
 * 
 * @param {Request} req - Request object
 * @param {string} limitType - Rate limit type
 * @returns {{ allowed: boolean, response?: NextResponse }} 
 */
export function checkApiRateLimit(req, limitType = 'general') {
  const identifier = getClientIdentifier(req);
  const result = checkRateLimit(identifier, limitType);
  
  if (result.limited) {
    const headers = getRateLimitHeaders(identifier, limitType);
    return {
      allowed: false,
      response: NextResponse.json(
        { 
          error: result.message,
          code: 'RATE_LIMITED',
          retryAfter: Math.ceil(result.resetIn / 1000)
        },
        { 
          status: 429,
          headers: {
            ...headers,
            'Retry-After': Math.ceil(result.resetIn / 1000).toString()
          }
        }
      )
    };
  }
  
  return { allowed: true };
}

/**
 * IP-based rate limiting for DDoS protection
 * Tracks requests per IP across all endpoints
 */
const globalIpStore = new Map();
const GLOBAL_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 200 // 200 total requests per minute per IP
};

/**
 * Check global IP rate limit
 * Use this for DDoS protection at the edge
 * 
 * @param {string} ip - Client IP address
 * @returns {{ allowed: boolean, remaining: number }}
 */
export function checkGlobalIpLimit(ip) {
  const now = Date.now();
  const record = globalIpStore.get(ip);
  
  // Cleanup old entries periodically
  if (globalIpStore.size > 10000) {
    for (const [key, value] of globalIpStore.entries()) {
      if (value.resetTime < now) {
        globalIpStore.delete(key);
      }
    }
  }
  
  if (!record || record.resetTime < now) {
    globalIpStore.set(ip, {
      count: 1,
      resetTime: now + GLOBAL_LIMIT.windowMs
    });
    return { allowed: true, remaining: GLOBAL_LIMIT.maxRequests - 1 };
  }
  
  if (record.count >= GLOBAL_LIMIT.maxRequests) {
    logger.warn('Global IP limit exceeded', { ip, count: record.count });
    return { allowed: false, remaining: 0 };
  }
  
  record.count++;
  globalIpStore.set(ip, record);
  
  return { 
    allowed: true, 
    remaining: GLOBAL_LIMIT.maxRequests - record.count 
  };
}

/**
 * Sliding window rate limiter for more accurate rate limiting
 * Uses token bucket algorithm
 */
class SlidingWindowLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000;
    this.maxRequests = options.maxRequests || 60;
    this.store = new Map();
  }
  
  /**
   * Check if request is allowed
   * @param {string} identifier - Client identifier
   * @returns {{ allowed: boolean, remaining: number, resetIn: number }}
   */
  check(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    let record = this.store.get(identifier) || { requests: [] };
    
    // Remove old requests outside the window
    record.requests = record.requests.filter(time => time > windowStart);
    
    if (record.requests.length >= this.maxRequests) {
      const oldestInWindow = record.requests[0];
      return {
        allowed: false,
        remaining: 0,
        resetIn: oldestInWindow + this.windowMs - now
      };
    }
    
    // Add current request
    record.requests.push(now);
    this.store.set(identifier, record);
    
    return {
      allowed: true,
      remaining: this.maxRequests - record.requests.length,
      resetIn: this.windowMs
    };
  }
  
  /**
   * Clean up old entries
   */
  cleanup() {
    const windowStart = Date.now() - this.windowMs;
    for (const [key, record] of this.store.entries()) {
      record.requests = record.requests.filter(time => time > windowStart);
      if (record.requests.length === 0) {
        this.store.delete(key);
      }
    }
  }
}

// Pre-configured sliding window limiters for critical endpoints
export const slidingLimiters = {
  aiGeneration: new SlidingWindowLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10 // 10 AI generation requests per hour
  }),
  assignmentSubmit: new SlidingWindowLimiter({
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 5 // 5 submissions per 10 min
  }),
  quizSubmit: new SlidingWindowLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10 // 10 quiz submissions per 5 min
  })
};

// Cleanup sliding limiters every 5 minutes
setInterval(() => {
  Object.values(slidingLimiters).forEach(limiter => limiter.cleanup());
}, 5 * 60 * 1000);

/**
 * Apply rate limiting based on endpoint pattern
 * Automatically determines the appropriate limit type
 * 
 * @param {Request} req - Request object
 * @returns {{ limitType: string, identifier: string }}
 */
export function detectLimitType(req) {
  const url = new URL(req.url);
  const path = url.pathname;
  const identifier = getClientIdentifier(req);
  
  // Match endpoints to limit types
  if (path.includes('/generate-course-outline') || 
      path.includes('/study-type-content')) {
    return { limitType: 'course-generation', identifier };
  }
  
  if (path.includes('/submit-assignment')) {
    return { limitType: 'assignment', identifier };
  }
  
  if (path.includes('/study-type') || 
      path.includes('/flashcard') || 
      path.includes('/quiz')) {
    return { limitType: 'study-content', identifier };
  }
  
  if (path.includes('/public-courses') || 
      path.includes('/explore')) {
    return { limitType: 'public-courses', identifier };
  }
  
  if (path.includes('/verify-certificate')) {
    return { limitType: 'certificate-verify', identifier };
  }
  
  if (path.includes('/health')) {
    return { limitType: 'health', identifier };
  }
  
  return { limitType: 'general', identifier };
}

export default {
  withRateLimit,
  checkApiRateLimit,
  checkGlobalIpLimit,
  getClientIdentifier,
  detectLimitType,
  slidingLimiters,
  PUBLIC_RATE_LIMITS
};
