/**
 * Centralized Logging Infrastructure
 * 
 * Provides:
 * - Structured logging with levels
 * - Performance metrics tracking
 * - Error tracking with context
 * - Request/Response logging
 * - API call tracking
 */

// Log levels
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    FATAL: 4
};

// Current log level (from environment)
const CURRENT_LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] || LOG_LEVELS.INFO;

// In-memory metrics store (use Redis/Prometheus in production)
const metricsStore = {
    requests: {
        total: 0,
        byEndpoint: {},
        byStatus: {},
        errors: 0
    },
    performance: {
        apiCalls: [],
        dbQueries: [],
        aiRequests: []
    },
    startTime: Date.now()
};

/**
 * Format log message with metadata
 */
function formatLog(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const logData = {
        timestamp,
        level,
        message,
        ...context
    };

    // Add environment info
    if (typeof window === 'undefined') {
        logData.env = process.env.NODE_ENV || 'development';
    }

    return logData;
}

/**
 * Output log based on environment
 */
function outputLog(level, logData) {
    const levelIndex = LOG_LEVELS[level] || LOG_LEVELS.INFO;
    
    // Skip if below current log level
    if (levelIndex < CURRENT_LOG_LEVEL) return;

    const logString = JSON.stringify(logData);

    // In development, use pretty console output
    if (process.env.NODE_ENV !== 'production') {
        const colors = {
            DEBUG: '\x1b[36m',  // Cyan
            INFO: '\x1b[32m',   // Green
            WARN: '\x1b[33m',   // Yellow
            ERROR: '\x1b[31m', // Red
            FATAL: '\x1b[35m'  // Magenta
        };
        const reset = '\x1b[0m';
        const color = colors[level] || reset;
        
        console.log(`${color}[${level}]${reset} ${logData.timestamp} - ${logData.message}`, 
            Object.keys(logData).length > 3 ? logData : '');
    } else {
        // In production, output structured JSON for log aggregators
        if (levelIndex >= LOG_LEVELS.ERROR) {
            console.error(logString);
        } else if (levelIndex >= LOG_LEVELS.WARN) {
            console.warn(logString);
        } else {
            console.log(logString);
        }
    }
}

/**
 * Logger object with level methods
 */
export const logger = {
    debug: (message, context = {}) => {
        outputLog('DEBUG', formatLog('DEBUG', message, context));
    },
    
    info: (message, context = {}) => {
        outputLog('INFO', formatLog('INFO', message, context));
    },
    
    warn: (message, context = {}) => {
        outputLog('WARN', formatLog('WARN', message, context));
    },
    
    error: (message, context = {}) => {
        metricsStore.requests.errors++;
        outputLog('ERROR', formatLog('ERROR', message, context));
    },
    
    fatal: (message, context = {}) => {
        metricsStore.requests.errors++;
        outputLog('FATAL', formatLog('FATAL', message, context));
    }
};

/**
 * Track API request
 */
export function trackRequest(endpoint, method, status, duration) {
    metricsStore.requests.total++;
    
    // Track by endpoint
    const key = `${method}:${endpoint}`;
    metricsStore.requests.byEndpoint[key] = (metricsStore.requests.byEndpoint[key] || 0) + 1;
    
    // Track by status
    metricsStore.requests.byStatus[status] = (metricsStore.requests.byStatus[status] || 0) + 1;
    
    // Track performance
    metricsStore.performance.apiCalls.push({
        endpoint,
        method,
        status,
        duration,
        timestamp: Date.now()
    });
    
    // Keep only last 1000 entries
    if (metricsStore.performance.apiCalls.length > 1000) {
        metricsStore.performance.apiCalls.shift();
    }
    
    logger.info(`API Request: ${method} ${endpoint}`, { status, duration: `${duration}ms` });
}

/**
 * Track database query
 */
export function trackDbQuery(operation, table, duration, success = true) {
    metricsStore.performance.dbQueries.push({
        operation,
        table,
        duration,
        success,
        timestamp: Date.now()
    });
    
    // Keep only last 500 entries
    if (metricsStore.performance.dbQueries.length > 500) {
        metricsStore.performance.dbQueries.shift();
    }
    
    if (duration > 1000) {
        logger.warn(`Slow DB query: ${operation} on ${table}`, { duration: `${duration}ms` });
    }
}

/**
 * Track AI request
 */
export function trackAiRequest(type, duration, success = true, tokensUsed = 0) {
    metricsStore.performance.aiRequests.push({
        type,
        duration,
        success,
        tokensUsed,
        timestamp: Date.now()
    });
    
    // Keep only last 100 entries
    if (metricsStore.performance.aiRequests.length > 100) {
        metricsStore.performance.aiRequests.shift();
    }
    
    logger.info(`AI Request: ${type}`, { duration: `${duration}ms`, success, tokensUsed });
}

/**
 * Create request logger middleware
 */
export function createRequestLogger() {
    return async (req, res, next) => {
        const start = Date.now();
        
        // Log request
        logger.info(`Incoming request`, {
            method: req.method,
            url: req.url,
            userAgent: req.headers?.['user-agent']
        });
        
        // Wrap response to capture status
        const originalEnd = res.end;
        res.end = function(...args) {
            const duration = Date.now() - start;
            trackRequest(req.url, req.method, res.statusCode, duration);
            originalEnd.apply(res, args);
        };
        
        if (next) next();
    };
}

/**
 * Get current metrics
 */
export function getMetrics() {
    const now = Date.now();
    const uptime = now - metricsStore.startTime;
    
    // Calculate averages
    const apiCallDurations = metricsStore.performance.apiCalls.map(c => c.duration);
    const avgApiDuration = apiCallDurations.length > 0 
        ? Math.round(apiCallDurations.reduce((a, b) => a + b, 0) / apiCallDurations.length)
        : 0;
    
    const dbQueryDurations = metricsStore.performance.dbQueries.map(q => q.duration);
    const avgDbDuration = dbQueryDurations.length > 0
        ? Math.round(dbQueryDurations.reduce((a, b) => a + b, 0) / dbQueryDurations.length)
        : 0;
    
    const aiRequestDurations = metricsStore.performance.aiRequests.map(r => r.duration);
    const avgAiDuration = aiRequestDurations.length > 0
        ? Math.round(aiRequestDurations.reduce((a, b) => a + b, 0) / aiRequestDurations.length)
        : 0;
    
    return {
        uptime: {
            ms: uptime,
            formatted: formatDuration(uptime)
        },
        requests: {
            total: metricsStore.requests.total,
            errors: metricsStore.requests.errors,
            errorRate: metricsStore.requests.total > 0 
                ? ((metricsStore.requests.errors / metricsStore.requests.total) * 100).toFixed(2) + '%'
                : '0%',
            byEndpoint: metricsStore.requests.byEndpoint,
            byStatus: metricsStore.requests.byStatus
        },
        performance: {
            api: {
                count: apiCallDurations.length,
                avgDuration: `${avgApiDuration}ms`
            },
            database: {
                count: dbQueryDurations.length,
                avgDuration: `${avgDbDuration}ms`
            },
            ai: {
                count: aiRequestDurations.length,
                avgDuration: `${avgAiDuration}ms`
            }
        },
        timestamp: new Date().toISOString()
    };
}

/**
 * Format duration in human readable format
 */
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

/**
 * Error tracking - log error with full context
 */
export function trackError(error, context = {}) {
    const errorData = {
        message: error.message || String(error),
        stack: error.stack,
        code: error.code,
        status: error.status,
        ...context
    };
    
    logger.error('Error tracked', errorData);
    
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production' && typeof fetch !== 'undefined') {
        // Example: Send to error tracking endpoint
        // fetch('/api/log-error', { method: 'POST', body: JSON.stringify(errorData) });
    }
    
    return errorData;
}

/**
 * Performance timing helper
 */
export function createTimer(name) {
    const start = Date.now();
    
    return {
        end: () => {
            const duration = Date.now() - start;
            logger.debug(`Timer ${name}`, { duration: `${duration}ms` });
            return duration;
        },
        elapsed: () => Date.now() - start
    };
}

/**
 * Reset metrics (for testing)
 */
export function resetMetrics() {
    metricsStore.requests = { total: 0, byEndpoint: {}, byStatus: {}, errors: 0 };
    metricsStore.performance = { apiCalls: [], dbQueries: [], aiRequests: [] };
    metricsStore.startTime = Date.now();
}

export { LOG_LEVELS };
