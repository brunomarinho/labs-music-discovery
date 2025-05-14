import { getCachedArtistRecommendations, cacheArtistRecommendations, markArtistAsFeatured } from './supabase';
import logger from './logger';
import { getArtistDetails } from './spotify';
import { getArtistRecommendations } from './openai';

/**
 * Get cached recommendations for an artist, or generate new ones
 * @param {string} artistName - Name of the artist
 * @param {string} artistId - Spotify ID of the artist
 * @param {boolean} forceRefresh - Whether to force a refresh of the cache
 * @returns {Promise<Object>} - Artist data and recommendations
 */
export async function getArtistRecommendationsWithCache(artistName, artistId, forceRefresh = false) {
  try {
    // Check database cache first (if not forcing refresh)
    if (!forceRefresh) {
      const { data: cachedData, error: cacheError } = await getCachedArtistRecommendations(artistName);
      
      if (!cacheError && cachedData) {
        logger.log('Cache hit for artist:', artistName);
        return cachedData;
      }
    }
    
    logger.log('Cache miss or refresh requested for artist:', artistName, 'Fetching fresh data...');
    
    // Get detailed artist info from Spotify
    const artistData = await getArtistDetails(artistId);
    
    // Get recommendations from OpenAI with web search enabled
    const recommendations = await getArtistRecommendations(artistName, artistId, true);
    
    // Cache the results with in-memory fallback
    const { data, error } = await cacheArtistRecommendations(
      artistName,
      artistId,
      artistData,
      recommendations,
      false // Not featured
    );
    
    if (error) {
      logger.warn('Non-critical error caching artist recommendations:', error);
      // Continue anyway since we have in-memory fallback
    }
    
    const resultData = data || {
      artist_name: artistName,
      artist_spotify_id: artistId,
      artist_data: artistData,
      recommendations: recommendations,
      is_featured: false
    };
    
    return resultData;
  } catch (error) {
    logger.error('Error in getArtistRecommendationsWithCache:', error);
    throw error;
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
      
      // Cache the results with featured flag (using in-memory fallback)
      const { error: cacheError } = await cacheArtistRecommendations(
        artist.name,
        artist.id,
        artistData,
        recommendations,
        true  // Mark as featured
      );
      
      if (cacheError) {
        logger.warn(`Non-critical error caching featured artist ${artist.name}:`, cacheError);
        // Continue anyway since we have in-memory fallback
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