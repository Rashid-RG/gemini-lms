import { getApiKeyRotationManager } from "@/lib/apiKeyRotation";

/**
 * Wrapper to handle API key rotation on errors
 */
export function handleAIError(error) {
  try {
    const rotationManager = getApiKeyRotationManager();
    
    if (error && typeof error === 'object') {
      const errorMsg = error.message || error.toString() || '';
      
      const isQuota = errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('429');
      const isAuth = errorMsg.includes('401') || errorMsg.includes('Unauthorized') || errorMsg.includes('service account') || errorMsg.includes('API key not valid');
      
      // Check if quota exhausted or auth error (treating both as invalid/depleted keys)
      if (isQuota || isAuth) {
        console.error(`❌ API key issue (${isQuota ? 'quota' : 'auth'}) detected, rotating API key...`);
        rotationManager.handleQuotaExhausted();
      }
      // Check if rate limit (temporary)
      else if (errorMsg.includes('rate limit') || errorMsg.includes('too many requests')) {
        console.warn('⚠️ Rate limit detected, rotating API key...');
        rotationManager.handleRateLimit();
      }
    }
  } catch (err) {
    console.warn('Could not rotate API key:', err.message);
  }
}
