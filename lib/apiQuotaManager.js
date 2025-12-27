/**
 * API Quota Management System for Gemini API
 * 
 * Configured for: Paid Tier 1 (gemini-2.5-flash: 1000 RPM, 142.95K TPM)
 * 
 * Handles:
 * - Per-minute rate limiting to prevent 429 errors
 * - Request queuing during burst periods
 * - Graceful degradation to fallback responses
 * - Priority-based request scheduling
 */

// In-memory quota tracker (use Redis in production for multi-instance)
const quotaStore = {
    daily: {
        count: 0,
        resetAt: getNextResetTime(),
        lastUpdated: Date.now()
    },
    minute: {
        count: 0,
        resetAt: Date.now() + 60000,
        lastUpdated: Date.now()
    }
};

// Request queue for when quota is near limit
const requestQueue = [];
let isProcessingQueue = false;

// Configuration
const QUOTA_CONFIG = {
    // Gemini Paid Tier 1 limits (gemini-2.5-flash)
    DAILY_LIMIT: 10000,        // Effectively unlimited for our use case
    MINUTE_LIMIT: 1000,        // 1000 RPM (paid tier 1)
    
    // Warning thresholds (for burst protection)
    DAILY_WARNING: 8000,       // Warn at 8000 requests
    DAILY_CRITICAL: 9500,      // Critical at 9500 requests
    
    // Queue settings
    MAX_QUEUE_SIZE: 50,
    QUEUE_TIMEOUT_MS: 30000,   // 30 seconds timeout for queued requests
    
    // Priority levels (lower = higher priority)
    PRIORITY: {
        GRADING: 1,            // Assignment grading is highest priority
        COURSE_GENERATION: 2,  // Course outline generation
        CONTENT_GENERATION: 3, // Notes, flashcards, quizzes
        CHAT: 4                // AI chat assistance
    }
};

/**
 * Get next daily reset time (midnight UTC)
 */
function getNextResetTime() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return tomorrow.getTime();
}

/**
 * Reset counters if time window has passed
 */
function checkAndResetCounters() {
    const now = Date.now();
    
    // Reset daily counter
    if (now >= quotaStore.daily.resetAt) {
        quotaStore.daily.count = 0;
        quotaStore.daily.resetAt = getNextResetTime();
        quotaStore.daily.lastUpdated = now;
        console.log('[QuotaManager] Daily quota reset');
    }
    
    // Reset minute counter
    if (now >= quotaStore.minute.resetAt) {
        quotaStore.minute.count = 0;
        quotaStore.minute.resetAt = now + 60000;
        quotaStore.minute.lastUpdated = now;
    }
}

/**
 * Get current quota status
 */
export function getQuotaStatus() {
    checkAndResetCounters();
    
    const now = Date.now();
    const dailyRemaining = QUOTA_CONFIG.DAILY_LIMIT - quotaStore.daily.count;
    const minuteRemaining = QUOTA_CONFIG.MINUTE_LIMIT - quotaStore.minute.count;
    
    return {
        daily: {
            used: quotaStore.daily.count,
            limit: QUOTA_CONFIG.DAILY_LIMIT,
            remaining: dailyRemaining,
            resetsIn: Math.max(0, quotaStore.daily.resetAt - now),
            resetsAt: new Date(quotaStore.daily.resetAt).toISOString()
        },
        minute: {
            used: quotaStore.minute.count,
            limit: QUOTA_CONFIG.MINUTE_LIMIT,
            remaining: minuteRemaining,
            resetsIn: Math.max(0, quotaStore.minute.resetAt - now)
        },
        status: dailyRemaining <= 0 ? 'EXHAUSTED' :
                dailyRemaining <= 2 ? 'CRITICAL' :
                dailyRemaining <= 5 ? 'WARNING' : 'OK',
        queueSize: requestQueue.length,
        canMakeRequest: dailyRemaining > 0 && minuteRemaining > 0
    };
}

/**
 * Check if a request can be made immediately
 */
export function canMakeRequest() {
    checkAndResetCounters();
    return quotaStore.daily.count < QUOTA_CONFIG.DAILY_LIMIT &&
           quotaStore.minute.count < QUOTA_CONFIG.MINUTE_LIMIT;
}

/**
 * Record that a request was made
 */
export function recordRequest() {
    checkAndResetCounters();
    quotaStore.daily.count++;
    quotaStore.minute.count++;
    quotaStore.daily.lastUpdated = Date.now();
    quotaStore.minute.lastUpdated = Date.now();
    
    console.log(`[QuotaManager] Request recorded. Daily: ${quotaStore.daily.count}/${QUOTA_CONFIG.DAILY_LIMIT}, Minute: ${quotaStore.minute.count}/${QUOTA_CONFIG.MINUTE_LIMIT}`);
}

/**
 * Wait for quota to become available (for minute limit)
 */
async function waitForMinuteQuota() {
    const waitTime = quotaStore.minute.resetAt - Date.now();
    if (waitTime > 0 && waitTime < 60000) {
        console.log(`[QuotaManager] Waiting ${waitTime}ms for minute quota reset`);
        await new Promise(resolve => setTimeout(resolve, waitTime + 100));
        checkAndResetCounters();
    }
}

/**
 * Execute an AI request with quota management
 * 
 * @param {Function} aiOperation - The AI function to execute
 * @param {Object} options - Options for the request
 * @param {string} options.type - Type of operation (grading, course, content, chat)
 * @param {Function} options.fallback - Fallback function if quota exhausted
 * @param {boolean} options.waitForQuota - Whether to wait for quota or fail immediately
 */
export async function executeWithQuota(aiOperation, options = {}) {
    const { type = 'content', fallback = null, waitForQuota = true } = options;
    
    checkAndResetCounters();
    
    // Check daily quota
    if (quotaStore.daily.count >= QUOTA_CONFIG.DAILY_LIMIT) {
        console.log('[QuotaManager] Daily quota exhausted');
        
        if (fallback) {
            console.log('[QuotaManager] Using fallback response');
            return { success: false, result: await fallback(), isFallback: true, reason: 'daily_quota_exhausted' };
        }
        
        throw new Error('AI_QUOTA_EXHAUSTED: Daily API quota has been reached. Please try again tomorrow.');
    }
    
    // Check minute quota
    if (quotaStore.minute.count >= QUOTA_CONFIG.MINUTE_LIMIT) {
        if (waitForQuota) {
            await waitForMinuteQuota();
        } else {
            throw new Error('AI_RATE_LIMITED: Too many requests. Please wait a minute and try again.');
        }
    }
    
    // Execute the request
    try {
        recordRequest();
        const result = await aiOperation();
        return { success: true, result, isFallback: false };
    } catch (error) {
        // Check if it's a quota error from the API
        const isQuotaError = error.message?.includes('429') || 
                            error.message?.toLowerCase().includes('quota') ||
                            error.message?.toLowerCase().includes('rate');
        
        if (isQuotaError && fallback) {
            console.log('[QuotaManager] API returned quota error, using fallback');
            return { success: false, result: await fallback(), isFallback: true, reason: 'api_quota_error' };
        }
        
        throw error;
    }
}

/**
 * Add request to priority queue (for when quota is limited)
 */
export function queueRequest(operation, priority, timeout = QUOTA_CONFIG.QUEUE_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
        if (requestQueue.length >= QUOTA_CONFIG.MAX_QUEUE_SIZE) {
            reject(new Error('Request queue is full. Please try again later.'));
            return;
        }
        
        const request = {
            operation,
            priority,
            resolve,
            reject,
            addedAt: Date.now(),
            timeout
        };
        
        // Insert in priority order
        const insertIndex = requestQueue.findIndex(r => r.priority > priority);
        if (insertIndex === -1) {
            requestQueue.push(request);
        } else {
            requestQueue.splice(insertIndex, 0, request);
        }
        
        // Set timeout
        setTimeout(() => {
            const index = requestQueue.indexOf(request);
            if (index !== -1) {
                requestQueue.splice(index, 1);
                reject(new Error('Request timed out in queue'));
            }
        }, timeout);
        
        // Start processing if not already
        processQueue();
    });
}

/**
 * Process queued requests
 */
async function processQueue() {
    if (isProcessingQueue || requestQueue.length === 0) return;
    
    isProcessingQueue = true;
    
    while (requestQueue.length > 0 && canMakeRequest()) {
        const request = requestQueue.shift();
        
        // Check if request timed out
        if (Date.now() - request.addedAt > request.timeout) {
            request.reject(new Error('Request timed out in queue'));
            continue;
        }
        
        try {
            recordRequest();
            const result = await request.operation();
            request.resolve(result);
        } catch (error) {
            request.reject(error);
        }
        
        // Wait a bit between requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    isProcessingQueue = false;
    
    // If queue still has items but quota exhausted, wait for reset
    if (requestQueue.length > 0) {
        const waitTime = Math.min(
            quotaStore.minute.resetAt - Date.now(),
            60000
        );
        if (waitTime > 0) {
            setTimeout(processQueue, waitTime + 100);
        }
    }
}

/**
 * Get recommendations based on current quota status
 */
export function getQuotaRecommendations() {
    const status = getQuotaStatus();
    const recommendations = [];
    
    if (status.status === 'EXHAUSTED') {
        recommendations.push({
            type: 'error',
            message: 'Daily API quota exhausted. AI features will use fallback responses until quota resets.',
            action: 'Wait for daily reset or upgrade to paid API tier'
        });
    } else if (status.status === 'CRITICAL') {
        recommendations.push({
            type: 'warning',
            message: `Only ${status.daily.remaining} API calls remaining today. Use sparingly.`,
            action: 'Consider upgrading API tier for higher limits'
        });
    } else if (status.status === 'WARNING') {
        recommendations.push({
            type: 'info',
            message: `${status.daily.remaining} API calls remaining today.`,
            action: 'Monitor usage to avoid hitting limits'
        });
    }
    
    if (status.queueSize > 10) {
        recommendations.push({
            type: 'warning',
            message: `${status.queueSize} requests queued. Processing may be delayed.`,
            action: 'High demand - requests are being processed in order'
        });
    }
    
    return recommendations;
}

/**
 * Update quota configuration (for when upgrading API tier)
 */
export function updateQuotaConfig(newConfig) {
    Object.assign(QUOTA_CONFIG, newConfig);
    console.log('[QuotaManager] Configuration updated:', QUOTA_CONFIG);
}

export { QUOTA_CONFIG };
