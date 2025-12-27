/**
 * Database utility functions with retry logic for Neon cold starts
 */

/**
 * Execute a database operation with retry logic
 * Handles Neon cold start timeouts by retrying failed connections
 * 
 * @param {Function} operation - Async function that performs the DB operation
 * @param {Object} options - Configuration options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.delayMs - Delay between retries in ms (default: 1000)
 * @returns {Promise<any>} - Result of the database operation
 */
export async function withDbRetry(operation, options = {}) {
  const { maxRetries = 3, delayMs = 1000 } = options;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if it's a connection timeout error
      const isTimeout = 
        error.message?.includes('fetch failed') ||
        error.message?.includes('CONNECT_TIMEOUT') ||
        error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT';
      
      if (isTimeout && attempt < maxRetries) {
        console.log(`DB connection attempt ${attempt} failed, retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      
      // Not a timeout or last attempt, throw the error
      throw error;
    }
  }
  
  throw lastError;
}

/**
 * Check if database is reachable (wake up Neon cold start)
 * Call this before heavy operations
 */
export async function warmupDb(db) {
  try {
    await db.execute('SELECT 1');
    return true;
  } catch (error) {
    console.log('DB warmup failed:', error.message);
    return false;
  }
}
