import { getCachedArtistRecommendations } from '../../../../lib/supabase';
import logger from '../../../../lib/logger';

/**
 * API endpoint to check if recommendations exist for an artist
 * This endpoint is used to check cache status without fetching full data
 */
export default async function handler(req, res) {
  // Only allow HEAD and GET requests
  if (req.method !== 'HEAD' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { artistName } = req.query;
  
  if (!artistName) {
    return res.status(400).json({ error: 'Artist name is required' });
  }
  
  try {
    // Check if we have cached recommendations for this artist
    const { data, error } = await getCachedArtistRecommendations(artistName);
    
    if (error || !data) {
      // No cached data found
      return res.status(404).json({ 
        cached: false, 
        message: 'No cached recommendations found for this artist' 
      });
    }
    
    // If this is a HEAD request, return just the status code
    if (req.method === 'HEAD') {
      return res.status(200).end();
    }
    
    // For GET requests, return cache information
    return res.status(200).json({ 
      cached: true,
      artistId: data.artist_spotify_id,
      recommendationCount: data.recommendations?.length || 0,
      lastUpdated: data.updated_at || data.created_at
    });
  } catch (error) {
    logger.error('Error checking recommendation cache status:', error);
    return res.status(500).json({ error: 'Failed to check recommendation cache status' });
  }
}