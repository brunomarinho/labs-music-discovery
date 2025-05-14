import { getServerAccessToken } from '../../../lib/spotify';
import logger from '../../../lib/logger';

/**
 * Spotify Search API Proxy
 * 
 * This route proxies requests to the Spotify Search API,
 * handling authentication and error handling.
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get query parameters
  const { q, type, limit = 10 } = req.query;

  if (!q || !type) {
    return res.status(400).json({ error: 'Missing required parameters: q, type' });
  }

  try {
    // Get a valid Spotify API token
    const token = await getServerAccessToken();

    // Make the request to Spotify API
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=${type}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Handle non-200 responses
    if (!response.ok) {
      const errorData = await response.json();
      logger.error('Spotify API error:', errorData);
      return res.status(response.status).json({
        error: errorData.error?.message || 'Error from Spotify API'
      });
    }

    // Parse and return the data
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    logger.error('Error in Spotify API proxy:', error);
    return res.status(500).json({
      error: 'Failed to fetch data from Spotify'
    });
  }
}