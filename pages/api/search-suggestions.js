import { searchArtist } from '../../lib/spotify';
import logger from '../../lib/logger';

export default async function handler(req, res) {
  const { query } = req.query;
  
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query parameter is required' });
  }
  
  try {
    const results = await searchArtist(query);
    return res.status(200).json(results);
  } catch (error) {
    logger.error('Error in search-suggestions API:', error);
    return res.status(500).json({ error: 'Failed to fetch search results' });
  }
}