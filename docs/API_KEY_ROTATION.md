# API Key Rotation System Documentation

## Overview

Your system now supports **automatic API key rotation** for Google Gemini to prevent service interruptions when one key hits its quota limit. This is essential for production reliability with a single AI provider.

## How It Works

### 1. **Multiple API Keys**
You can provide up to 3 Gemini API keys in your environment variables:
```env
NEXT_PUBLIC_GEMINI_API_KEY=key1...
NEXT_PUBLIC_GEMINI_API_KEY_2=key2...
NEXT_PUBLIC_GEMINI_API_KEY_3=key3...
```

### 2. **Automatic Rotation**
When a key hits its quota limit:
- ✅ System automatically detects quota exhaustion (429 error / "quota exceeded")
- ✅ Switches to the next available key
- ✅ Retries the request with the new key
- ✅ Logs the rotation event for monitoring

When a key hits rate limit temporarily:
- ✅ Rotates to next key immediately
- ✅ Waits with exponential backoff before retry
- ✅ Prevents cascading failures

### 3. **Quota Reset Handling**
- Each key tracks when it hit quota
- Quota resets after **1 hour** in the tracking system
- Key is re-enabled automatically when reset time passes
- Continues using all available keys in round-robin fashion

### 4. **Statistics & Monitoring**
The rotation manager tracks:
- Which key is currently active
- Number of calls per key
- Last used timestamp
- Quota exhaustion status
- Reset time for each key

Access stats with:
```javascript
const rotationManager = getApiKeyRotationManager();
console.log(rotationManager.getStats());
```

## Implementation Details

### Files Modified

1. **`/lib/apiKeyRotation.js`** (NEW)
   - `ApiKeyRotationManager` class handles all rotation logic
   - `getApiKeyRotationManager()` returns singleton instance
   - Error detection for quota vs rate limit

2. **`/configs/AiModel.js`**
   - Updated to use `getGenAIInstance()` for fresh API key per request
   - All model exports now use current active key
   - Enables seamless key rotation between requests

3. **`/app/api/generate-course-outline/route.js`**
   - `callAIWithRetry()` catches quota errors and triggers rotation
   - Logs when key rotation happens
   - Retries request with next key

4. **`/inngest/functions.js`**
   - Added `handleAIError()` wrapper for key rotation
   - All async AI jobs support rotation
   - Detects quota vs rate limit errors

5. **`.env.example`** (NEW)
   - Instructions for setting up multiple keys
   - All environment variables documented

## Setting Up Multiple API Keys

### Step 1: Create Additional API Keys
```bash
1. Go to https://aistudio.google.com/app/apikeys
2. Click "Create API Key in new project" (if needed)
3. Generate 3 keys from the same project
4. Copy all 3 keys
```

### Step 2: Add to Environment
```env
# Your current key
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyD...

# Add these two new keys
NEXT_PUBLIC_GEMINI_API_KEY_2=AIzaSyE...
NEXT_PUBLIC_GEMINI_API_KEY_3=AIzaSyF...
```

### Step 3: Restart Your App
```bash
npm run dev
```

### Step 4: Verify Rotation (Optional)
Add this to any API route to check rotation status:
```javascript
import { getApiKeyRotationManager } from "@/lib/apiKeyRotation";

const rotationManager = getApiKeyRotationManager();
console.log('API Keys configured:', rotationManager.apiKeys.length);
console.log('Current key:', rotationManager.getCurrentKeyIndex() + 1);
console.log('Stats:', rotationManager.getStats());
```

## Error Handling Flow

### Quota Exhaustion (429 / Quota Exceeded)
```
1. AI Request → 429 Error
2. System detects "quota" in error
3. Rotation Manager: handleQuotaExhausted()
4. Mark current key as exhausted
5. Switch to next key
6. Retry with 30-150s adaptive timeout
7. If all keys exhausted → wait 1 hour
```

### Rate Limit (Temporary)
```
1. AI Request → 429 / Rate Limit
2. System detects "rate limit"
3. Rotation Manager: handleRateLimit()
4. Switch to next key immediately
5. Retry with exponential backoff
6. After 5-10 mins, key becomes available again
```

## Monitoring & Troubleshooting

### Check Current Status
```javascript
const rm = getApiKeyRotationManager();
console.log(`Using key ${rm.getCurrentKeyIndex() + 1}`);
console.log(rm.getStats());
```

### Console Logs to Watch
- `✅ Initialized API Key Rotation with 3 key(s)` → System started with multiple keys
- `🔄 Rotated to API key 2` → Automatic rotation happened
- `❌ Quota exceeded for API key 1` → Key hit quota limit
- `⚠️ Rate limit detected` → Temporary rate limit (will retry)

### If All Keys Are Exhausted
- System will mark all keys as exhausted
- Waits 1 hour for quota reset
- Automatically recovers when reset time passes
- Shows warning in logs

### Fallback Behavior
If all keys fail all retries:
- Course generation returns placeholder course structure
- System logs comprehensive error
- User sees "temporarily unavailable" with fallback content
- Allows manual retry after 1 hour

## Performance Impact

### Request Flow Improvement
- **Before:** Single key → quota hit → complete failure
- **After:** Multiple keys → automatic rotation → 3x quota available

### Timeout Benefit
- Course generation: 120-180s timeouts (already in place)
- Inngest jobs: 120-150s adaptive timeouts (already in place)
- Rate limit handling: Prevents thundering herd with exponential backoff

### Cost Savings
- Quota spread across 3 keys = more requests before hitting limits
- Reduces need for paid quota upgrades
- Same cost (free tier) but 3x capacity

## Future Enhancements

Possible improvements (not implemented yet):
1. **Different AI Providers** - Add OpenAI/Claude as backup
2. **Quota Prediction** - Track usage and predict when keys will exhaust
3. **Dynamic Pricing** - Switch based on cost per token
4. **Geographic Distribution** - Use different keys for different regions
5. **Dashboard Widget** - Real-time rotation status in admin panel

## FAQ

**Q: Do I need 3 keys?**
A: No, start with 1. System works fine. Add more for higher reliability.

**Q: Will my requests be slower?**
A: No, rotation adds <1ms overhead. Only triggered when errors occur.

**Q: What if all keys exhaust quota?**
A: System waits 1 hour, then retries. Quota resets daily at Google's end.

**Q: Can I mix different API providers?**
A: Currently no, but it's planned for future. Right now only Gemini.

**Q: Does this affect pricing?**
A: No, you still use your free tier. Just spread across 3 keys instead of 1.

**Q: How do I know which key I'm using?**
A: Check console logs or call `getApiKeyRotationManager().getCurrentKeyIndex()`

