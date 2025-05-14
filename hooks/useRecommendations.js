import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useRouter } from 'next/router';
import logger from '../lib/logger';

/**
 * Custom hook for fetching artist recommendations with proper user flow control
 * 
 * Enforces these user flows:
 * 1. Non-logged in users: Can only view cached recommendations
 * 2. Logged in users: Can perform up to 3 searches for non-cached artists
 * 
 * @param {string} artistName - Artist name to get recommendations for
 * @param {string} artistId - Optional Spotify artist ID if available
 * @returns {Object} Recommendations data and state
 */
export default function useRecommendations(artistName, artistId = null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [isDataCached, setIsDataCached] = useState(false);
  const { user, hasReachedSearchLimit } = useAuth();
  const router = useRouter();

  /**
   * Check if recommendations are cached for this artist
   */
  const checkCachedStatus = useCallback(async () => {
    if (!artistName) return;
    
    try {
      // Make a HEAD request to check if recommendations exist without fetching data
      const response = await fetch(`/api/recommendations/${encodeURIComponent(artistName)}/status`, {
        method: 'HEAD'
      });
      
      setIsDataCached(response.status === 200);
      return response.status === 200;
    } catch (err) {
      logger.error('Error checking cache status:', err);
      return false;
    }
  }, [artistName]);

  /**
   * Fetch recommendations for the given artist
   * This will only return cached data unless refresh=true
   */
  const fetchRecommendations = useCallback(async (options = {}) => {
    if (!artistName) {
      return;
    }

    const { refresh = false } = options;

    // Check if user is eligible to refresh recommendations
    if (refresh) {
      if (!user) {
        setError('Login required to generate new recommendations');
        return;
      }
      
      if (hasReachedSearchLimit) {
        setError('You have reached your search limit');
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      setNotFound(false);
      
      // Build the API URL with optional refresh parameter
      const url = `/api/recommendations/${encodeURIComponent(artistName)}${refresh ? '?refresh=true' : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // If 404, either the artist doesn't exist or no cached data is available
      if (response.status === 404) {
        setNotFound(true);
        setIsDataCached(false);
        return;
      }
      
      // If 403, user has reached search limit
      if (response.status === 403) {
        setError('Search limit reached');
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch recommendations');
      }
      
      const responseData = await response.json();
      setData(responseData);
      setIsDataCached(true);
    } catch (err) {
      logger.error('Error fetching recommendations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [artistName, user, hasReachedSearchLimit]);

  // Check cache status and fetch data when component mounts or artist changes
  useEffect(() => {
    if (artistName) {
      // First check if recommendations are cached
      checkCachedStatus().then(isCached => {
        // If cached, fetch the data
        // If not cached AND user is logged in (to respect user flow rules), fetch data
        if (isCached || user) {
          fetchRecommendations();
        } else {
          // Not cached and user not logged in - set not found
          setNotFound(true);
        }
      });
    }
  }, [artistName, checkCachedStatus, fetchRecommendations, user]);

  /**
   * Generate new recommendations for this artist
   * Only works for authenticated users who haven't reached their limit
   */
  const generateNewRecommendations = useCallback(async () => {
    if (!user) {
      router.push('/auth/login?redirect=' + encodeURIComponent(router.asPath));
      return;
    }
    
    if (hasReachedSearchLimit) {
      setError('You have reached your search limit');
      return;
    }
    
    // Use the fetchRecommendations function with refresh=true
    await fetchRecommendations({ refresh: true });
  }, [user, hasReachedSearchLimit, router, fetchRecommendations]);

  return {
    data,
    loading,
    error,
    notFound,
    isDataCached,
    generateNewRecommendations,
    hasResults: !!data,
    artistInfo: data?.artist_data || null,
    recommendations: data?.recommendations || []
  };
}