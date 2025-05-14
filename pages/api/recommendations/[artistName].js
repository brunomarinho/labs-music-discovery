import logger from '../../../lib/logger';
import { getCachedArtistRecommendations } from '../../../lib/supabase';
import path from 'path';
import fs from 'fs';

// Load featured artists
const featuredArtistsPath = path.join(process.cwd(), 'data', 'featured-artists.json');
const featuredArtists = JSON.parse(fs.readFileSync(featuredArtistsPath, 'utf8'));
const featuredArtistsLower = featuredArtists.map(name => name.toLowerCase());

export default async function handler(req, res) {
  const { artistName } = req.query;
  // Refresh is now completely disabled regardless of the parameter
  
  if (!artistName) {
    return res.status(400).json({ error: 'Artist name is required' });
  }
  
  try {
    // Check if we have cached data
    const { data: cachedData, error: cacheError } = await getCachedArtistRecommendations(artistName);
    
    // If we have cached data, return it immediately
    if (!cacheError && cachedData) {
      return res.status(200).json(cachedData);
    }
    
    // Check if artist is in our featured list (case insensitive)
    const isArtistFeatured = featuredArtistsLower.includes(artistName.toLowerCase()) ||
      // Also check if any featured artist starts with the query
      featuredArtistsLower.some(name => 
        name.startsWith(artistName.toLowerCase()) || 
        artistName.toLowerCase().startsWith(name)
      );
      
    // Only return 404 if no cached data and not a featured artist
    if (!isArtistFeatured) {
      return res.status(404).json({ 
        error: 'Artist recommendations not available' 
      });
    }
    
    // If it's a featured artist but no cache exists yet, indicate this
    return res.status(404).json({ 
      error: 'Recommendations not yet generated for this featured artist' 
    });
  } catch (error) {
    logger.error('Error in recommendations API:', error);
    return res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
}