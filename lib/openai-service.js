'use client';

import { 
  RECOMMENDATION_SYSTEM_PROMPT,
  RECOMMENDATION_USER_PROMPT_TEMPLATE,
  extractJsonFromText,
  validateRecommendations
} from './prompts';
import logger from './logger';

// Cache to prevent duplicate API calls for the same artist
const llmCallCache = new Set();

// Initialize the cache from sessionStorage if available
if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
  try {
    const cachedArtists = JSON.parse(sessionStorage.getItem('llmCalledArtists') || '[]');
    cachedArtists.forEach(artistId => llmCallCache.add(artistId));
    logger.log(`Initialized LLM call cache with ${llmCallCache.size} artists`);
  } catch (error) {
    logger.error('Error initializing cache from sessionStorage:', error);
  }
}

// Track if an artist has already been processed
function hasProcessedArtist(artistId) {
  return llmCallCache.has(artistId);
}

// Mark an artist as processed to prevent duplicate calls
function markArtistAsProcessed(artistId) {
  if (!artistId) return;
  
  llmCallCache.add(artistId);
  
  // Store in sessionStorage to persist across page refreshes
  if (typeof sessionStorage !== 'undefined') {
    try {
      const cachedArtists = JSON.parse(sessionStorage.getItem('llmCalledArtists') || '[]');
      if (!cachedArtists.includes(artistId)) {
        cachedArtists.push(artistId);
        sessionStorage.setItem('llmCalledArtists', JSON.stringify(cachedArtists));
      }
    } catch (error) {
      logger.error('Error updating sessionStorage:', error);
    }
  }
}

// Generate recommendations using OpenAI with web search
export async function generateRecommendations(artistName, artistId, options = {}) {
  if (!artistName || !artistId) {
    throw new Error('Artist name and ID are required');
  }
  
  // Check if this artist has already been processed
  if (hasProcessedArtist(artistId)) {
    logger.warn(`Artist ${artistId} has already been processed. No duplicate calls allowed.`);
    throw new Error('Artist already processed - use cached data');
  }
  
  // Check if the user is logged in and has searches remaining
  await checkUserAccess();
  
  // Mark this artist as processed immediately to prevent duplicate calls
  // Even if the call fails, we don't want to retry automatically
  markArtistAsProcessed(artistId);
  
  try {
    // Dispatch event to indicate generation has started
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('llm-generation-start', { 
        detail: { artistId, artistName } 
      }));
    }
    
    // Prepare the user prompt from the template
    const prompt = RECOMMENDATION_USER_PROMPT_TEMPLATE(artistName, artistId);
    
    // Call the OpenAI API via our server endpoint
    const response = await fetch('/api/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: RECOMMENDATION_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        forceGeneration: true,
        webSearch: true,
        oneTimeOnly: true // Flag indicating this should be cached
      }),
      signal: options.signal // Pass abort signal if provided
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      logger.error('API error:', errorData);
      throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Dispatch event to indicate generation has completed
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('llm-generation-end', { 
        detail: { artistId, artistName, success: true } 
      }));
    }
    
    if (!data.success || !data.data) {
      throw new Error('No content in the API response');
    }
    
    // Extract JSON from the response
    const content = data.data;
    const extractedJson = extractJsonFromText(content);
    
    if (!extractedJson) {
      logger.error('Failed to extract JSON from response:', content);
      throw new Error('Failed to extract valid JSON from API response');
    }
    
    // Parse and validate the recommendations
    const recommendations = JSON.parse(extractedJson);
    const validatedRecommendations = validateRecommendations(recommendations);
    
    // Limit to 10 recommendations maximum
    const limitedRecommendations = validatedRecommendations.slice(0, 10);
    
    return limitedRecommendations;
  } catch (error) {
    logger.error('Error generating recommendations:', error);
    
    // Dispatch event to indicate generation has ended with error
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('llm-generation-end', { 
        detail: { artistId, artistName, success: false, error: true } 
      }));
    }
    
    throw error;
  }
}

// Check if the user is logged in and has searches remaining
async function checkUserAccess() {
  try {
    // Import supabase to check authentication
    const { supabase } = await import('./supabase');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      logger.warn('User not authenticated');
      throw new Error('Authentication required - only logged-in users can generate recommendations');
    }
    
    // Check if the user has reached their search limit
    const response = await fetch('/api/auth/check-limit', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to check search limit');
    }
    
    const limitData = await response.json();
    if (limitData.hasReachedLimit) {
      logger.warn('User has reached search limit');
      throw new Error('Search limit reached - cannot generate new recommendations');
    }
    
    return true;
  } catch (error) {
    logger.error('Error checking user access:', error);
    throw error;
  }
}

// Ensure Set is defined in global scope
if (typeof window === 'undefined' && typeof global !== 'undefined') {
  global.Set = Set;
}