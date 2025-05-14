import { getServerAccessToken } from '../../lib/spotify';
import logger from '../../lib/logger';

/**
 * API endpoint to get Spotify images for artists, albums, or tracks
 * This provides a simple, direct image search service for recommendations
 */
export default async function handler(req, res) {
  const { name, type = 'artist' } = req.query;
  
  if (!name) {
    return res.status(400).json({ error: 'Name parameter is required' });
  }
  
  try {
    // Get Spotify access token
    const token = await getServerAccessToken();
    
    // Set the appropriate search type
    const searchType = type.toLowerCase();
    if (!['artist', 'album', 'track'].includes(searchType)) {
      return res.status(400).json({ error: 'Type must be artist, album, or track' });
    }
    
    // Search Spotify API for the specified entity
    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=${searchType}&limit=1`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    if (!searchResponse.ok) {
      throw new Error(`Spotify API error: ${searchResponse.statusText}`);
    }
    
    const data = await searchResponse.json();
    
    // Extract image URL based on the type
    let imageUrl = null;
    
    if (searchType === 'artist' && data.artists?.items?.[0]?.images?.[0]) {
      imageUrl = data.artists.items[0].images[0].url;
    } else if (searchType === 'album' && data.albums?.items?.[0]?.images?.[0]) {
      imageUrl = data.albums.items[0].images[0].url;
    } else if (searchType === 'track' && data.tracks?.items?.[0]?.album?.images?.[0]) {
      imageUrl = data.tracks.items[0].album.images[0].url;
    }
    
    if (!imageUrl) {
      return res.status(404).json({ error: 'No image found' });
    }
    
    // Return the image URL
    return res.status(200).json({ imageUrl });
  } catch (error) {
    logger.error('Error getting Spotify image:', error);
    return res.status(500).json({ error: 'Failed to fetch image from Spotify' });
  }
}