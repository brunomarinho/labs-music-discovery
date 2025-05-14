import { getCachedArtistRecommendations, cacheArtistRecommendations, markArtistAsFeatured } from './supabase';
import logger from './logger';
import { getArtistDetails } from './spotify';
import { getArtistRecommendations } from './openai';

// Memory cache to reduce database calls
const memoryCache = new Map();

/**
 * Get cached recommendations for an artist, or generate new ones
 * @param {string} artistName - Name of the artist
 * @param {string} artistId - Spotify ID of the artist
 * @param {boolean} forceRefresh - Whether to force a refresh of the cache
 * @param {string|null} userId - User ID (for tracking purposes)
 * @returns {Promise<Object>} - Artist data and recommendations
 */
export async function getArtistRecommendationsWithCache(artistName, artistId, forceRefresh = false, userId = null) {
  try {
    // Check memory cache first
    const cacheKey = `recommendations_${artistId}`;
    if (!forceRefresh && memoryCache.has(cacheKey)) {
      logger.log(`Using in-memory cache for artist ${artistId}`);
      return memoryCache.get(cacheKey);
    }
    
    // Check database cache
    if (!forceRefresh) {
      const { data: cachedData, error: cacheError } = await getCachedArtistRecommendations(artistName);
      
      if (!cacheError && cachedData) {
        logger.log('Cache hit for artist:', artistName);
        // Update memory cache
        memoryCache.set(cacheKey, cachedData);
        return cachedData;
      }
    }
    
    logger.log('Cache miss for artist:', artistName, 'Fetching fresh data...');
    
    // Get detailed artist info from Spotify
    const artistData = await getArtistDetails(artistId);
    
    // Get recommendations from OpenAI with web search enabled
    const recommendations = await getArtistRecommendations(artistName, artistId, true);
    
    // Cache the results
    const { error: cacheError } = await cacheArtistRecommendations(
      artistName,
      artistId,
      artistData,
      recommendations,
      userId
    );
    
    if (cacheError) {
      logger.error('Error caching artist recommendations:', cacheError);
    }
    
    const resultData = {
      artist_name: artistName,
      artist_spotify_id: artistId,
      artist_data: artistData,
      recommendations: recommendations,
      is_featured: false,
      created_by: userId
    };
    
    // Update memory cache
    memoryCache.set(cacheKey, resultData);
    
    return resultData;
  } catch (error) {
    logger.error('Error in getArtistRecommendationsWithCache:', error);
    throw error;
  }
}

/**
 * Check if an artist has cached recommendations
 * @param {string} artistId - Spotify ID of the artist
 * @returns {Promise<boolean>} - Whether the artist has cached recommendations
 */
export async function hasArtistCachedRecommendations(artistId) {
  try {
    // Check memory cache first
    const cacheKey = `recommendations_${artistId}`;
    if (memoryCache.has(cacheKey)) {
      return true;
    }
    
    // Check database cache
    const { data, error } = await getCachedArtistRecommendations(null, artistId);
    return !error && data;
  } catch (error) {
    logger.error('Error checking if artist has cached recommendations:', error);
    return false;
  }
}

/**
 * Cache recommendations for a list of featured artists
 * @param {Array<Object>} artists - List of artists with name and id
 * @returns {Promise<Array>} - Results of the cache operation
 */
export async function cacheFeaturedArtists(artists) {
  const results = [];
  
  for (const artist of artists) {
    try {
      logger.log(`Caching featured artist: ${artist.name}`);
      
      // Check if already cached
      const { data: existingData, error: existingError } = await getCachedArtistRecommendations(artist.name);
      
      if (!existingError && existingData) {
        // Mark as featured if not already
        if (!existingData.is_featured) {
          await markArtistAsFeatured(existingData.id, true);
        }
        
        results.push({
          name: artist.name,
          status: 'already_cached',
          success: true
        });
        
        continue;
      }
      
      // Get detailed artist info from Spotify
      const artistData = await getArtistDetails(artist.id);
      
      // Get recommendations from OpenAI with web search
      const recommendations = await getArtistRecommendations(artist.name, artist.id, true);
      
      // Cache the results with featured flag
      const { error: cacheError } = await cacheArtistRecommendations(
        artist.name,
        artist.id,
        artistData,
        recommendations,
        null, // No user ID for featured artists
        true  // Mark as featured
      );
      
      if (cacheError) {
        throw cacheError;
      }
      
      results.push({
        name: artist.name,
        status: 'newly_cached',
        success: true
      });
    } catch (error) {
      logger.error(`Error caching featured artist ${artist.name}:`, error);
      
      results.push({
        name: artist.name,
        status: 'error',
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}

// Ensure Map is defined in global scope
if (typeof window === 'undefined' && typeof global !== 'undefined') {
  global.Map = Map;
}