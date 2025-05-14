'use client';

import { supabase } from './supabase';
import logger from './logger';
import { generateRecommendations } from './openai-service';

// In-memory cache to reduce database calls
const memoryCache = new Map();

/**
 * Get recommendations for an artist, with caching
 * @param {string} artistName - The name of the artist
 * @param {string} artistId - The Spotify ID of the artist
 * @param {boolean} forceRefresh - Whether to force refresh from API (logged-in users only)
 * @returns {Promise<Array>} - Array of recommendations
 */
export async function getRecommendations(artistName, artistId, forceRefresh = false) {
  if (!artistName || !artistId) {
    logger.error('[Cache] Artist name and ID are required');
    throw new Error('Artist name and ID are required');
  }

  // Check memory cache first
  const cacheKey = `recommendations_${artistId}`;
  if (!forceRefresh && memoryCache.has(cacheKey)) {
    logger.log(`[Cache] Using in-memory cache for artist ${artistId}`);
    return memoryCache.get(cacheKey);
  }

  try {
    // Try to get from database cache
    const cachedRecommendations = await getCachedRecommendations(artistId);
    
    if (cachedRecommendations && !forceRefresh) {
      // Update memory cache
      memoryCache.set(cacheKey, cachedRecommendations);
      logger.log(`[Cache] Using database cache for artist ${artistId}`);
      return cachedRecommendations;
    }

    // If user is not logged in, we can't generate new recommendations
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logger.log(`[Cache] User not logged in, cannot generate recommendations for ${artistId}`);
      return null;
    }

    // If forceRefresh, check if user has reached search limit
    if (forceRefresh) {
      const userHasReachedLimit = await hasReachedSearchLimit(user.id);
      if (userHasReachedLimit) {
        logger.warn(`[Cache] User ${user.id} has reached search limit`);
        throw new Error('Search limit reached');
      }
    }

    // Generate new recommendations using OpenAI
    logger.log(`[Cache] Generating new recommendations for artist ${artistId}`);
    const recommendations = await generateRecommendations(artistName, artistId);
    
    // Cache the recommendations
    await cacheRecommendations(artistId, artistName, recommendations, user.id);
    
    // Update memory cache
    memoryCache.set(cacheKey, recommendations);
    
    // Increment user's search count
    await incrementSearchCount(user.id);
    
    return recommendations;
  } catch (error) {
    logger.error(`[Cache] Error in getRecommendations:`, error);
    throw error;
  }
}

/**
 * Get cached recommendations from Supabase
 * @param {string} artistId - The Spotify ID of the artist
 * @returns {Promise<Array|null>} - Array of recommendations or null if not found
 */
async function getCachedRecommendations(artistId) {
  try {
    const { data, error } = await supabase
      .from('artist_recommendations_cache')
      .select('recommendations')
      .eq('artist_spotify_id', artistId)
      .single();
      
    if (error || !data) {
      return null;
    }
    
    return data.recommendations;
  } catch (error) {
    logger.error('[Cache] Error in getCachedRecommendations:', error);
    return null;
  }
}

/**
 * Cache recommendations in Supabase
 * @param {string} artistId - The Spotify ID of the artist
 * @param {string} artistName - The name of the artist
 * @param {Array} recommendations - The recommendations to cache
 * @param {string} userId - The ID of the user who generated the recommendations
 * @returns {Promise<boolean>} - Whether the caching was successful
 */
async function cacheRecommendations(artistId, artistName, recommendations, userId = null) {
  try {
    // Check if the artist already exists in the cache
    const { data: existingData } = await supabase
      .from('artist_recommendations_cache')
      .select('id')
      .eq('artist_spotify_id', artistId)
      .single();
      
    if (existingData) {
      // Update existing cache entry
      const { error: updateError } = await supabase
        .from('artist_recommendations_cache')
        .update({ 
          recommendations: recommendations,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingData.id);
        
      if (updateError) {
        logger.error('[Cache] Error updating cached recommendations:', updateError);
        return false;
      }
      
      logger.log(`[Cache] Updated recommendations cache for artist ${artistId}`);
      return true;
    }
    
    // Create new cache entry
    const { error: insertError } = await supabase
      .from('artist_recommendations_cache')
      .insert([{
        artist_name: artistName,
        artist_spotify_id: artistId,
        recommendations: recommendations,
        created_by: userId
      }]);
      
    if (insertError) {
      logger.error('[Cache] Error creating recommendations cache:', insertError);
      return false;
    }
    
    logger.log(`[Cache] Created new recommendations cache for artist ${artistId}`);
    return true;
  } catch (error) {
    logger.error('[Cache] Error in cacheRecommendations:', error);
    return false;
  }
}

/**
 * Check if a user has reached their search limit
 * @param {string} userId - The ID of the user
 * @returns {Promise<boolean>} - Whether the user has reached their search limit
 */
async function hasReachedSearchLimit(userId) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('search_count')
      .eq('id', userId)
      .single();
      
    if (error || !data) {
      logger.error('[Cache] Error checking search limit:', error);
      return true; // Assume limit reached on error
    }
    
    const SEARCH_LIMIT = 3; // Maximum number of searches allowed
    return data.search_count >= SEARCH_LIMIT;
  } catch (error) {
    logger.error('[Cache] Error in hasReachedSearchLimit:', error);
    return true; // Assume limit reached on error
  }
}

/**
 * Increment a user's search count
 * @param {string} userId - The ID of the user
 * @returns {Promise<boolean>} - Whether the increment was successful
 */
async function incrementSearchCount(userId) {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({ search_count: supabase.raw('search_count + 1') })
      .eq('id', userId);
      
    if (error) {
      logger.error('[Cache] Error incrementing search count:', error);
      return false;
    }
    
    logger.log(`[Cache] Incremented search count for user ${userId}`);
    return true;
  } catch (error) {
    logger.error('[Cache] Error in incrementSearchCount:', error);
    return false;
  }
}