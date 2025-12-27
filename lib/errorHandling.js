/**
 * Centralized Error Handling Utilities
 * 
 * Provides:
 * - Safe JSON parsing with error recovery
 * - API error handling
 * - Error classification and user-friendly messages
 * - Error logging helpers
 */

/**
 * Error types for classification
 */
export const ERROR_TYPES = {
    VALIDATION: 'VALIDATION_ERROR',
    AUTHENTICATION: 'AUTH_ERROR',
    AUTHORIZATION: 'AUTHORIZATION_ERROR',
    NOT_FOUND: 'NOT_FOUND_ERROR',
    RATE_LIMIT: 'RATE_LIMIT_ERROR',
    QUOTA_EXCEEDED: 'QUOTA_EXCEEDED_ERROR',
    DATABASE: 'DATABASE_ERROR',
    AI_SERVICE: 'AI_SERVICE_ERROR',
    NETWORK: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT_ERROR',
    UNKNOWN: 'UNKNOWN_ERROR'
};

/**
 * User-friendly error messages
 */
const ERROR_MESSAGES = {
    [ERROR_TYPES.VALIDATION]: 'Please check your input and try again.',
    [ERROR_TYPES.AUTHENTICATION]: 'Please sign in to continue.',
    [ERROR_TYPES.AUTHORIZATION]: 'You don\'t have permission to perform this action.',
    [ERROR_TYPES.NOT_FOUND]: 'The requested resource was not found.',
    [ERROR_TYPES.RATE_LIMIT]: 'Too many requests. Please wait a moment and try again.',
    [ERROR_TYPES.QUOTA_EXCEEDED]: 'Service limit reached. Please try again later.',
    [ERROR_TYPES.DATABASE]: 'A database error occurred. Please try again.',
    [ERROR_TYPES.AI_SERVICE]: 'AI service is temporarily unavailable. Please try again.',
    [ERROR_TYPES.NETWORK]: 'Network error. Please check your connection.',
    [ERROR_TYPES.TIMEOUT]: 'Request timed out. Please try again.',
    [ERROR_TYPES.UNKNOWN]: 'An unexpected error occurred. Please try again.'
};

/**
 * Safe JSON parsing with multiple fallback strategies
 * 
 * @param {string} text - JSON string to parse
 * @param {any} defaultValue - Default value if parsing fails
 * @returns {{ data: any, error: Error|null }}
 */
export function safeJsonParse(text, defaultValue = null) {
    if (!text || typeof text !== 'string') {
        return { data: defaultValue, error: null };
    }

    // Try direct parsing first
    try {
        return { data: JSON.parse(text), error: null };
    } catch (e) {
        // Continue to fallback strategies
    }

    // Strategy 1: Remove markdown code blocks
    try {
        const cleaned = text
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/g, '')
            .trim();
        return { data: JSON.parse(cleaned), error: null };
    } catch (e) {
        // Continue
    }

    // Strategy 2: Extract JSON from mixed content
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
            return { data: JSON.parse(jsonMatch[0]), error: null };
        }
    } catch (e) {
        // Continue
    }

    // Strategy 3: Fix common JSON issues
    try {
        const fixed = text
            .replace(/'/g, '"')                    // Single to double quotes
            .replace(/(\w+):/g, '"$1":')          // Unquoted keys
            .replace(/,\s*([}\]])/g, '$1')        // Trailing commas
            .replace(/\n/g, '\\n')                // Newlines
            .replace(/\t/g, '\\t');               // Tabs
        return { data: JSON.parse(fixed), error: null };
    } catch (e) {
        // Continue
    }

    // All strategies failed
    return { 
        data: defaultValue, 
        error: new Error(`Failed to parse JSON: ${text.substring(0, 100)}...`) 
    };
}

/**
 * Classify error type from error object or message
 */
export function classifyError(error) {
    const message = (error?.message || error || '').toLowerCase();
    const status = error?.status || error?.response?.status;

    // Status code based classification
    if (status === 400) return ERROR_TYPES.VALIDATION;
    if (status === 401) return ERROR_TYPES.AUTHENTICATION;
    if (status === 403) return ERROR_TYPES.AUTHORIZATION;
    if (status === 404) return ERROR_TYPES.NOT_FOUND;
    if (status === 429) return ERROR_TYPES.RATE_LIMIT;

    // Message based classification
    if (message.includes('quota') || message.includes('limit exceeded')) {
        return ERROR_TYPES.QUOTA_EXCEEDED;
    }
    if (message.includes('rate') || message.includes('too many')) {
        return ERROR_TYPES.RATE_LIMIT;
    }
    if (message.includes('timeout') || message.includes('timed out')) {
        return ERROR_TYPES.TIMEOUT;
    }
    if (message.includes('network') || message.includes('fetch failed')) {
        return ERROR_TYPES.NETWORK;
    }
    if (message.includes('database') || message.includes('sql') || message.includes('drizzle')) {
        return ERROR_TYPES.DATABASE;
    }
    if (message.includes('ai') || message.includes('gemini') || message.includes('generation')) {
        return ERROR_TYPES.AI_SERVICE;
    }
    if (message.includes('auth') || message.includes('sign in') || message.includes('login')) {
        return ERROR_TYPES.AUTHENTICATION;
    }
    if (message.includes('permission') || message.includes('forbidden')) {
        return ERROR_TYPES.AUTHORIZATION;
    }
    if (message.includes('not found') || message.includes('does not exist')) {
        return ERROR_TYPES.NOT_FOUND;
    }
    if (message.includes('invalid') || message.includes('required') || message.includes('validation')) {
        return ERROR_TYPES.VALIDATION;
    }

    return ERROR_TYPES.UNKNOWN;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error) {
    const errorType = classifyError(error);
    return ERROR_MESSAGES[errorType] || ERROR_MESSAGES[ERROR_TYPES.UNKNOWN];
}

/**
 * Create a standardized API error response
 */
export function createApiError(message, status = 500, type = ERROR_TYPES.UNKNOWN, details = null) {
    return {
        success: false,
        error: {
            message,
            type,
            status,
            details,
            timestamp: new Date().toISOString()
        }
    };
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling(fn, options = {}) {
    const { 
        fallback = null, 
        logError = true, 
        rethrow = false,
        context = ''
    } = options;

    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            if (logError) {
                console.error(`[${context || fn.name || 'unknown'}] Error:`, error);
            }
            
            if (rethrow) {
                throw error;
            }
            
            if (typeof fallback === 'function') {
                return fallback(error);
            }
            
            return fallback;
        }
    };
}

/**
 * Try-catch wrapper that returns result or error
 */
export async function tryCatch(fn, ...args) {
    try {
        const result = await fn(...args);
        return { result, error: null };
    } catch (error) {
        return { result: null, error };
    }
}

/**
 * Retry wrapper for transient failures
 */
export async function withRetry(fn, options = {}) {
    const {
        maxRetries = 3,
        delayMs = 1000,
        exponentialBackoff = true,
        retryableErrors = [ERROR_TYPES.NETWORK, ERROR_TYPES.TIMEOUT, ERROR_TYPES.DATABASE],
        onRetry = null
    } = options;

    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            const errorType = classifyError(error);
            
            // Check if error is retryable
            if (!retryableErrors.includes(errorType) || attempt === maxRetries) {
                throw error;
            }
            
            // Calculate delay
            const delay = exponentialBackoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
            
            if (onRetry) {
                onRetry(attempt, error, delay);
            }
            
            console.log(`Retry attempt ${attempt}/${maxRetries} in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error, context = {}) {
    return {
        message: error?.message || String(error),
        type: classifyError(error),
        stack: error?.stack,
        status: error?.status,
        context,
        timestamp: new Date().toISOString()
    };
}
