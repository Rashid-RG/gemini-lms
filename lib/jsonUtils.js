/**
 * JSON Parsing Utilities
 * 
 * Canonical, unified safe JSON parser for the entire codebase.
 * Handles AI responses that may include markdown code blocks,
 * truncated arrays, trailing commas, and other common issues.
 */

/**
 * Helper to safely parse JSON with try-catch
 * Handles truncated responses, markdown code blocks, and malformed JSON
 * @param {string} jsonString - JSON string to parse
 * @param {any} fallback - Fallback value if parsing fails
 * @returns {{ data: any, error: Error|null }}
 */
export function safeJsonParse(jsonString, fallback = null) {
  try {
    // Clean markdown code blocks if present
    let cleaned = jsonString;
    if (typeof cleaned === 'string') {
      cleaned = cleaned.trim();
      if (cleaned.includes('```json')) {
        cleaned = cleaned.split('```json')[1]?.split('```')[0]?.trim() || cleaned;
      } else if (cleaned.includes('```')) {
        cleaned = cleaned.split('```')[1]?.split('```')[0]?.trim() || cleaned;
      }
      
      // Determine if we should look for object or array first
      // For course outlines, we expect an object with chapters array inside
      const firstBrace = cleaned.indexOf('{');
      const firstBracket = cleaned.indexOf('[');
      
      // If object comes before array (or no array), try object first
      if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleaned = jsonMatch[0];
        }
      } else if (firstBracket !== -1) {
        // Array comes first - this is for flashcards, quiz questions, etc.
        const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          cleaned = arrayMatch[0];
        } else {
          // Array might be truncated - try to repair it
          let partial = cleaned.substring(firstBracket);
          const repaired = repairTruncatedJsonArray(partial);
          if (repaired) {
            cleaned = repaired;
          }
        }
      }
      
      // Remove trailing commas before ] or }
      cleaned = cleaned.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');
    }
    
    const data = JSON.parse(cleaned);
    return { data, error: null };
  } catch (error) {
    console.error('JSON Parse Error:', error.message, 'Input:', jsonString?.substring?.(0, 200));
    return { data: fallback, error };
  }
}

/**
 * Attempt to repair a truncated JSON array by finding the last complete object
 * @param {string} partial - Partial JSON array string
 * @returns {string|null} - Repaired JSON string or null
 */
function repairTruncatedJsonArray(partial) {
  try {
    // Count braces to find the last complete object
    let braceCount = 0;
    let bracketCount = 0;
    let lastCompleteIndex = -1;
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < partial.length; i++) {
      const char = partial[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        continue;
      }
      
      if (inString) continue;
      
      if (char === '{') braceCount++;
      if (char === '}') {
        braceCount--;
        if (braceCount === 0 && bracketCount === 1) {
          // Found a complete object at the top level of the array
          lastCompleteIndex = i;
        }
      }
      if (char === '[') bracketCount++;
      if (char === ']') bracketCount--;
    }
    
    if (lastCompleteIndex > 0) {
      // Extract up to the last complete object and close the array
      let repaired = partial.substring(0, lastCompleteIndex + 1);
      // Remove trailing comma if present
      repaired = repaired.replace(/,\s*$/, '');
      repaired += ']';
      
      // Validate it parses
      JSON.parse(repaired);
      console.log('Successfully repaired truncated JSON array');
      return repaired;
    }
    
    return null;
  } catch (e) {
    return null;
  }
}
