import { searchArtist } from '../../../lib/spotify';
import { getArtistRecommendations } from '../../../lib/openai';
import logger from '../../../lib/logger';

/**
 * Debug API endpoint for testing OpenAI recommendations directly
 * This bypasses caching for testing purposes
 * IMPORTANT: This endpoint should never be exposed in production!
 */
export default async function handler(req, res) {
  // SECURITY WARNING: This is for debugging purposes only
  // In a production environment, this endpoint should be removed or protected
  
  const { artistName, bypassCache = 'true' } = req.query;
  
  if (!artistName) {
    return res.status(400).json({ error: 'Artist name is required' });
  }
  
  try {
    logger.log(`Debug API called for artist: ${artistName} with bypassCache=${bypassCache}`);
    
    // Search for the artist to get their Spotify ID
    const searchResults = await searchArtist(artistName);
    
    if (!searchResults || searchResults.length === 0) {
      return res.status(404).json({ error: 'Artist not found' });
    }
    
    // Use the first result (most relevant)
    const artist = searchResults[0];
    
    // Generate timestamp for debugging
    const timestamp = new Date().toISOString();
    
    // Generate a new OpenAI recommendation
    // Always use web search (true) and force a new call (bypassing any OpenAI caching)
    const recommendations = await getArtistRecommendations(
      artist.name, 
      artist.id,
      true  // Always use web search
    );
    
    // Return the full response with timestamp
    return res.status(200).json({
      timestamp,
      artist: {
        name: artist.name,
        id: artist.id,
        image: artist.images?.[0]?.url || null
      },
      recommendations,
      debug: {
        bypassCache: bypassCache === 'true',
        searchResultCount: searchResults.length,
        recommendationCount: recommendations.length
      }
    });
  } catch (error) {
    logger.error('Error in OpenAI debug API:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to fetch recommendations',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}