/**
 * Error Monitoring and Analytics
 * Lightweight wrapper that can be extended with Sentry, LogRocket, etc.
 */

// Error severity levels
export const SEVERITY = {
  DEBUG: 'debug',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// Track errors for analytics
const errorCounts = new Map();
const errorSamples = [];
const MAX_SAMPLES = 100;

/**
 * Log an error with context
 * @param {Error|string} error - Error object or message
 * @param {Object} context - Additional context
 * @param {string} severity - Error severity
 */
export function captureError(error, context = {}, severity = SEVERITY.ERROR) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : null;
  
  const errorData = {
    message: errorMessage,
    stack: errorStack,
    severity,
    context,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : 'server',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server'
  };

  // Count errors by type
  const errorKey = `${severity}:${errorMessage.substring(0, 50)}`;
  errorCounts.set(errorKey, (errorCounts.get(errorKey) || 0) + 1);

  // Store sample for debugging
  if (errorSamples.length < MAX_SAMPLES) {
    errorSamples.push(errorData);
  }

  // Console logging with color coding
  const colors = {
    [SEVERITY.DEBUG]: '\x1b[36m',    // Cyan
    [SEVERITY.INFO]: '\x1b[32m',     // Green
    [SEVERITY.WARNING]: '\x1b[33m',  // Yellow
    [SEVERITY.ERROR]: '\x1b[31m',    // Red
    [SEVERITY.CRITICAL]: '\x1b[35m'  // Magenta
  };
  const reset = '\x1b[0m';
  
  console.error(
    `${colors[severity]}[${severity.toUpperCase()}]${reset}`,
    errorMessage,
    context
  );

  if (errorStack && severity === SEVERITY.ERROR || severity === SEVERITY.CRITICAL) {
    console.error(errorStack);
  }

  // TODO: Send to external service (Sentry, etc.)
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(error, { extra: context, level: severity });
  // }

  return errorData;
}

/**
 * Log a message with context
 * @param {string} message - Log message
 * @param {Object} context - Additional context
 * @param {string} severity - Log severity
 */
export function captureMessage(message, context = {}, severity = SEVERITY.INFO) {
  const logData = {
    message,
    severity,
    context,
    timestamp: new Date().toISOString()
  };

  const colors = {
    [SEVERITY.DEBUG]: '\x1b[36m',
    [SEVERITY.INFO]: '\x1b[32m',
    [SEVERITY.WARNING]: '\x1b[33m'
  };
  const reset = '\x1b[0m';
  const color = colors[severity] || '';

  console.log(`${color}[${severity.toUpperCase()}]${reset}`, message, context);

  return logData;
}

/**
 * Track performance metrics
 * @param {string} name - Metric name
 * @param {number} durationMs - Duration in milliseconds
 * @param {Object} metadata - Additional metadata
 */
export function trackPerformance(name, durationMs, metadata = {}) {
  const performanceData = {
    name,
    durationMs,
    metadata,
    timestamp: new Date().toISOString()
  };

  // Log slow operations
  if (durationMs > 5000) {
    captureMessage(`Slow operation: ${name}`, { durationMs, ...metadata }, SEVERITY.WARNING);
  } else if (durationMs > 10000) {
    captureError(`Very slow operation: ${name}`, { durationMs, ...metadata }, SEVERITY.WARNING);
  }

  return performanceData;
}

/**
 * Create a performance timer
 * @param {string} name - Operation name
 * @returns {{ end: () => number }}
 */
export function startTimer(name) {
  const startTime = Date.now();
  
  return {
    end: (metadata = {}) => {
      const duration = Date.now() - startTime;
      trackPerformance(name, duration, metadata);
      return duration;
    }
  };
}

/**
 * Wrap an async function with error capturing
 * @param {Function} fn - Async function to wrap
 * @param {string} operationName - Name for logging
 * @returns {Function}
 */
export function withErrorCapture(fn, operationName) {
  return async (...args) => {
    const timer = startTimer(operationName);
    try {
      const result = await fn(...args);
      timer.end({ success: true });
      return result;
    } catch (error) {
      timer.end({ success: false, error: error.message });
      captureError(error, { operation: operationName, args: args.length }, SEVERITY.ERROR);
      throw error;
    }
  };
}

/**
 * Get error statistics
 * @returns {Object}
 */
export function getErrorStats() {
  const stats = {};
  for (const [key, count] of errorCounts.entries()) {
    stats[key] = count;
  }
  return {
    counts: stats,
    samples: errorSamples.slice(-10), // Last 10 errors
    totalErrors: errorSamples.length
  };
}

/**
 * Clear error tracking (for testing)
 */
export function clearErrorTracking() {
  errorCounts.clear();
  errorSamples.length = 0;
}

/**
 * Express/Next.js error handler middleware
 */
export function errorHandler(err, req, res, next) {
  captureError(err, {
    url: req.url,
    method: req.method,
    headers: req.headers,
    query: req.query
  }, SEVERITY.ERROR);

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message
  });
}
