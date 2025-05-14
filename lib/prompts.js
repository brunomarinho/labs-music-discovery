/**
 * Shared prompts for recommendation queries
 * Used by both the LLM service and caching script to ensure consistency
 */

'use client';

import logger from './logger';

/**
 * Primary system prompt for OpenAI with web search capability
 * Used for both the main application and the caching script
 */
const RECOMMENDATION_SYSTEM_PROMPT =
  `You are a music-industry research specialist with full websearch access. ` +
  `Find the MOST RECENT (past 12 months) instances where the target artist has ` +
  `EXPLICITLY recommended another artist, album, or song—only in interviews, podcasts, ` +
  `YouTube videos, or social-media posts (no hearsay). ` +
  `For each entry you must:` +
  `\n  • Verify that the sourceUrl responds over HTTPS with HTTP 200.` +
  `\n  • Only use domains ending in .com, .org, or .net.` +
  `\n  • Extract: name, type (artist|album|song), exact quote, year, month, source type, domain, author (if known).` +
  `\nCRITICAL:` +
  `\n 1) Output only valid JSON: an array starting with "[" and ending with "]".` +
  `\n 2) Do NOT wrap in code fences or add any text before/after.` +
  `\n 3) If nothing is found, return \`[]\` exactly.`;

/**
 * Fallback system prompt for OpenAI (when web search isn't available)
 * Used as a fallback in both the app and caching script
 */
const RECOMMENDATION_FALLBACK_SYSTEM_PROMPT =
  `You are an expert on modern music. ` +
  `Within the past 12 months, identify explicit music recommendations ` +
  `made by the given artist—ONLY direct recommendations in interviews, podcasts, ` +
  `or social posts. ` +
  `For each entry:` +
  `\n  • Provide name, type, quote, year, month, source, and sourceUrl.` +
  `\nCRITICAL:` +
  `\n 1) Use only valid JSON (array form).` +
  `\n 2) No explanatory text or code fences.` +
  `\n 3) If none found, return \`[]\` exactly.`;

/**
 * User prompt template for recommendation requests
 * This template is populated with artist name and ID
 */
const RECOMMENDATION_USER_PROMPT_TEMPLATE = (artistName, artistId) => `
Search for instances in the last 12 months where ${artistName} (id: ${artistId})
has explicitly recommended music to others (artist, album, or song) in interviews,
podcasts, YouTube videos, or social-media posts.  

For each recommendation, verify that the URL:  
  • Uses HTTPS  
  • Returns HTTP status 200  
  • Is on a .com, .org, or .net domain  

Output **only** a JSON array of objects with exactly these fields:
[
  {
    "name":        "Artist/Album/Song Name",
    "type":        "artist|album|song",
    "quote":       "Exact excerpt of recommendation",
    "year":        "YYYY",
    "month":       "MM",
    "source":      "Interview|Podcast|YouTube|Social media",
    "domain":      "example.com",
    "author":      "Interviewer or poster name (if known)",
    "sourceUrl":   "https://…"
  },
  …
]

**IMPORTANT:**
- Do not include any text before or after the JSON.
- If any record fails URL or domain validation, omit it.
- If you find no valid recommendations, return \`[]\`.
`;

// Additional prompt suffix for fallback model
const RECOMMENDATION_FALLBACK_SUFFIX =
  "\n\nCRITICALLY IMPORTANT: " +
  "1) You MUST focus EXCLUSIVELY on recommendations. " +
  "2) Your response MUST be ONLY valid JSON - no text before or after. " +
  "Do not add explanations or notes outside the JSON structure.";

// Helper functions for JSON extraction with improved patterns
const JSON_PATTERNS = [
  /```(?:json)?\s*(\[\s*\{[\s\S]*?\}\s*\])\s*```/m,
  /```(?:json)?\s*(\{[\s\S]*?\})\s*```/m,
  /\[\s*\{[\s\S]*?\}\s*\]/m,
  /\{[\s\S]*?"name"[\s\S]*?\}/m
];

const FALLBACK_PATTERNS = [
  /\[\s*(?:\{[\s\S]*?\}\s*,?\s*)+\]/m,
  /\[\s*[\s\S]*?\]/m
];

function sanitizeJson(jsonStr) {
  if (!jsonStr) return jsonStr;
  let cleaned = jsonStr.replace(/'/g, '"');
  cleaned = cleaned.replace(/,\s*]/g, "]").replace(/,\s*}/g, "}");
  // Fix the regex to avoid unnecessary escapes
  cleaned = cleaned.replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
  cleaned = cleaned.replace(/:\s*True\b/g, ': true').replace(/:\s*False\b/g, ': false');
  cleaned = cleaned.replace(/:\s*null\b/g, ': "null"');
  return cleaned;
}

function extractJsonFromText(content) {
  if (!content) {
    logger.log('Content is empty or null, cannot extract JSON');
    return null;
  }
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return content;
    if (typeof parsed === 'object') return JSON.stringify([parsed]);
  } catch (e) {
    logger.log('Not parseable as JSON directly, attempting extraction…');
  }

  const tryParse = (patterns) => {
    for (const pattern of patterns) {
      const m = content.match(pattern);
      if (m) {
        const candidate = m[1] || m[0];
        try {
          const sanitized = sanitizeJson(candidate);
          const parsed = JSON.parse(sanitized);
          if (Array.isArray(parsed)) return sanitized;
          if (typeof parsed === 'object') return JSON.stringify([parsed]);
        } catch (err) {
          // Continue to next pattern
        }
      }
    }
    return null;
  };

  return tryParse(JSON_PATTERNS) || tryParse(FALLBACK_PATTERNS) || null;
}

function isValidRecommendation(rec) {
  if (!rec || typeof rec !== 'object') return false;
  const req = ['name','type','quote'];
  if (req.some(f => !rec[f] || typeof rec[f] !== 'string')) return false;
  const types = ['artist','album','song'];
  if (!types.includes(rec.type.toLowerCase())) return false;
  return true;
}

function validateRecommendations(recs) {
  if (!Array.isArray(recs)) return [];
  return recs
    .filter(isValidRecommendation)
    .map(r => ({
      name:      r.name,
      type:      r.type.toLowerCase(),
      quote:     r.quote,
      year:      r.year || '',
      month:     r.month || '',
      source:    r.source || 'Unknown',
      sourceUrl: r.sourceUrl || ''
    }));
}

export {
  RECOMMENDATION_SYSTEM_PROMPT,
  RECOMMENDATION_FALLBACK_SYSTEM_PROMPT,
  RECOMMENDATION_USER_PROMPT_TEMPLATE,
  RECOMMENDATION_FALLBACK_SUFFIX,
  JSON_PATTERNS,
  FALLBACK_PATTERNS,
  sanitizeJson,
  extractJsonFromText,
  isValidRecommendation,
  validateRecommendations
};