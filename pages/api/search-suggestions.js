import { searchArtist } from '../../lib/spotify';
import logger from '../../lib/logger';
import path from 'path';
import fs from 'fs';

// Load featured artists
const featuredArtistsPath = path.join(process.cwd(), 'data', 'featured-artists.json');
const featuredArtists = JSON.parse(fs.readFileSync(featuredArtistsPath, 'utf8'));

export default async function handler(req, res) {
  const { query } = req.query;
  
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query parameter is required' });
  }
  
  try {
    // First get all search results from Spotify
    const allResults = await searchArtist(query);
    
    // Filter to only include featured artists (case insensitive)
    const featuredArtistsLower = featuredArtists.map(name => name.toLowerCase());
    const filteredResults = allResults.filter(artist => 
      featuredArtistsLower.includes(artist.name.toLowerCase())
    );
    
    // If no exact match but the query might be a partial match for a featured artist,
    // let's try to get those featured artists directly
    if (filteredResults.length === 0) {
      const queryLower = query.toLowerCase();
      const matchingFeatured = featuredArtists.filter(name => 
        name.toLowerCase().includes(queryLower)
      );
      
      if (matchingFeatured.length > 0) {
        // Get Spotify data for these artists
        const additionalResults = [];
        for (const artistName of matchingFeatured) {
          try {
            const artistResults = await searchArtist(artistName);
            if (artistResults.length > 0) {
              additionalResults.push(artistResults[0]);
            }
          } catch (err) {
            logger.error(`Error fetching data for featured artist ${artistName}:`, err);
          }
        }
        return res.status(200).json(additionalResults);
      }
    }
    
    return res.status(200).json(filteredResults);
  } catch (error) {
    logger.error('Error in search-suggestions API:', error);
    return res.status(500).json({ error: 'Failed to fetch search results' });
  }
}