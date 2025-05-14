import { getCachedArtistRecommendations, cacheArtistRecommendations, markArtistAsFeatured } from './supabase';
import logger from './logger';
import { getArtistDetails } from './spotify';
import { getArtistRecommendations } from './openai';

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
    // Check for cached data first
    if (!forceRefresh) {
      const { data: cachedData, error: cacheError } = await getCachedArtistRecommendations(artistName);
      
      if (!cacheError && cachedData) {
        logger.log('Cache hit for artist:', artistName);
        return cachedData;
      }
    }
    
    logger.log('Cache miss for artist:', artistName, 'Fetching fresh data...');
    
    // Get detailed artist info from Spotify
    const artistData = await getArtistDetails(artistId);
    
    // Get recommendations from OpenAI
    const recommendations = await getArtistRecommendations(artistName);
    
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
    
    return {
      artist_name: artistName,
      artist_spotify_id: artistId,
      artist_data: artistData,
      recommendations: recommendations,
      is_featured: false,
      created_by: userId
    };
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
      
      // Get recommendations from OpenAI
      const recommendations = await getArtistRecommendations(artist.name);
      
      // Cache the results with featured flag
      const { error: cacheError } = await cacheArtistRecommendations(
        artist.name,
        artist.id,
        artistData,
        recommendations,
        null // No user ID for featured artists
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