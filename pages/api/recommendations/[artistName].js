import { searchArtist } from '../../../lib/spotify';
import { getArtistRecommendationsWithCache } from '../../../lib/cache-manager';
import { getCachedArtistRecommendations, incrementSearchCount, getUserProfile } from '../../../lib/supabase';
import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  const { artistName } = req.query;
  const forceRefresh = req.query.refresh === 'true';
  
  if (!artistName) {
    return res.status(400).json({ error: 'Artist name is required' });
  }
  
  try {
    // First check if we have cached data
    const { data: cachedData, error: cacheError } = await getCachedArtistRecommendations(artistName);
    
    // If we have cached data and don't need a refresh, return it immediately
    if (!cacheError && cachedData && !forceRefresh) {
      return res.status(200).json(cachedData);
    }
    
    // If we need a refresh or don't have cached data, check user authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    // If no session and no cached data, return 404
    if (!session && (!cachedData || forceRefresh)) {
      return res.status(404).json({ 
        error: 'Artist not found in cache and user is not authenticated' 
      });
    }
    
    // If authenticated user wants a refresh or there's no cached data
    if (session && (forceRefresh || !cachedData)) {
      const userId = session.user.id;
      
      // Check if user has reached their search limit
      const { data: profile, error: profileError } = await getUserProfile(userId);
      
      if (profileError) {
        return res.status(500).json({ error: 'Failed to fetch user profile' });
      }
      
      if (profile.search_count >= 3) {
        return res.status(403).json({ error: 'Search limit reached' });
      }
      
      // Search for the artist first to get their Spotify ID
      const searchResults = await searchArtist(artistName);
      
      if (!searchResults || searchResults.length === 0) {
        return res.status(404).json({ error: 'Artist not found' });
      }
      
      // Use the first result (most relevant)
      const artist = searchResults[0];
      
      // Get and cache recommendations
      const recommendationsData = await getArtistRecommendationsWithCache(
        artist.name,
        artist.id,
        true, // force refresh
        userId
      );
      
      // Increment user's search count
      await incrementSearchCount(userId);
      
      return res.status(200).json(recommendationsData);
    }
    
    // If we have cached data and user is not authenticated or doesn't want a refresh
    if (cachedData) {
      return res.status(200).json(cachedData);
    }
    
    // Should not reach here, but just in case
    return res.status(404).json({ error: 'Artist recommendations not found' });
  } catch (error) {
    console.error('Error in recommendations API:', error);
    return res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
}