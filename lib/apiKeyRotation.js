/**
 * API Key Rotation Manager for Gemini
 * Handles multiple API keys and rotates between them
 * Detects quota exhaustion and automatically switches to next available key
 */

class ApiKeyRotationManager {
  constructor() {
    // Load all API keys from environment
    this.apiKeys = [
      process.env.NEXT_PUBLIC_GEMINI_API_KEY,
      process.env.NEXT_PUBLIC_GEMINI_API_KEY_2,
      process.env.NEXT_PUBLIC_GEMINI_API_KEY_3,
    ].filter(Boolean); // Remove undefined/null keys

    if (this.apiKeys.length === 0) {
      throw new Error('No Gemini API keys found in environment variables');
    }

    this.currentKeyIndex = 0;
    this.keyStats = this.apiKeys.map((key) => ({
      key,
      lastUsed: null,
      callCount: 0,
      quotaExhausted: false,
      quotaResetTime: null,
    }));

    console.log(`✅ Initialized API Key Rotation with ${this.apiKeys.length} key(s)`);
  }

  /**
   * Get the current active API key
   */
  getCurrentKey() {
    return this.apiKeys[this.currentKeyIndex];
  }

  /**
   * Get the current key index
   */
  getCurrentKeyIndex() {
    return this.currentKeyIndex;
  }

  /**
   * Rotate to next available key
   * Skips keys that have exceeded quota
   */
  rotateToNextKey() {
    const startIndex = this.currentKeyIndex;
    let attempts = 0;

    while (attempts < this.apiKeys.length) {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
      const stat = this.keyStats[this.currentKeyIndex];

      // Check if quota was reset
      if (stat.quotaExhausted && stat.quotaResetTime) {
        const now = new Date();
        if (now > stat.quotaResetTime) {
          stat.quotaExhausted = false;
          stat.quotaResetTime = null;
          stat.callCount = 0;
          console.log(`✅ Quota reset for key ${this.currentKeyIndex + 1}, resuming use`);
        }
      }

      // Use this key if not exhausted
      if (!stat.quotaExhausted) {
        console.log(`🔄 Rotated to API key ${this.currentKeyIndex + 1}`);
        return this.apiKeys[this.currentKeyIndex];
      }

      attempts++;
    }

    // If we looped through all keys and all are exhausted
    console.warn('⚠️ All API keys have exceeded quota. Waiting for reset...');
    // Set a 1-hour reset window
    this.keyStats.forEach((stat) => {
      if (stat.quotaExhausted && !stat.quotaResetTime) {
        stat.quotaResetTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      }
    });

    // Return the first key anyway (will likely fail, but allows retry logic to kick in)
    this.currentKeyIndex = 0;
    return this.apiKeys[0];
  }

  /**
   * Handle quota exhaustion for current key
   * Triggers rotation to next available key
   */
  handleQuotaExhausted() {
    console.error(
      `❌ Quota exceeded for API key ${this.currentKeyIndex + 1}. Rotating to next key...`
    );

    const stat = this.keyStats[this.currentKeyIndex];
    stat.quotaExhausted = true;
    stat.quotaResetTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    return this.rotateToNextKey();
  }

  /**
   * Handle rate limit (temporary, not quota exhaustion)
   * Just rotate to give the current key a break
   */
  handleRateLimit() {
    console.warn(`⚠️ Rate limit hit for API key ${this.currentKeyIndex + 1}. Switching keys...`);
    return this.rotateToNextKey();
  }

  /**
   * Track successful call
   */
  recordSuccess() {
    const stat = this.keyStats[this.currentKeyIndex];
    stat.lastUsed = new Date();
    stat.callCount++;
  }

  /**
   * Get stats for all keys
   */
  getStats() {
    return this.keyStats.map((stat, index) => ({
      keyNumber: index + 1,
      lastUsed: stat.lastUsed,
      callCount: stat.callCount,
      quotaExhausted: stat.quotaExhausted,
      quotaResetTime: stat.quotaResetTime,
    }));
  }

  /**
   * Check if error is quota-related
   */
  static isQuotaError(error) {
    const errorMsg = error?.message || '';
    return (
      errorMsg.includes('quota') ||
      errorMsg.includes('RESOURCE_EXHAUSTED') ||
      errorMsg.includes('429') ||
      errorMsg.includes('rate limit')
    );
  }

  /**
   * Check if error is rate limit (temporary)
   */
  static isRateLimitError(error) {
    const errorMsg = error?.message || '';
    return (
      errorMsg.includes('rate limit') ||
      errorMsg.includes('too many requests') ||
      errorMsg.includes('429')
    );
  }

  /**
   * Check if error is authorization or invalid key related
   */
  static isAuthError(error) {
    const errorMsg = error?.message || '';
    return (
      errorMsg.includes('401') ||
      errorMsg.includes('Unauthorized') ||
      errorMsg.includes('API key not valid') ||
      errorMsg.includes('service account') ||
      errorMsg.includes('API_KEY_INVALID')
    );
  }
}

// Singleton instance
let rotationManager = null;

export function getApiKeyRotationManager() {
  if (!rotationManager) {
    rotationManager = new ApiKeyRotationManager();
  }
  return rotationManager;
}

export default ApiKeyRotationManager;
