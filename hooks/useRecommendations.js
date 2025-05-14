import { useState, useEffect, useCallback } from 'react';
import logger from '../lib/logger';

/**
 * Custom hook for fetching artist recommendations (simplified without auth)
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
   * This only returns cached data - refresh parameter removed
   */
  const fetchRecommendations = useCallback(async () => {
    if (!artistName) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setNotFound(false);
      
      // Build the API URL - no refresh parameter
      const url = `/api/recommendations/${encodeURIComponent(artistName)}`;
      
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
  }, [artistName]);

  // Check cache status and fetch data when component mounts or artist changes
  useEffect(() => {
    if (artistName) {
      // First check if recommendations are cached
      checkCachedStatus().then(isCached => {
        // Fetch data if it's cached
        if (isCached) {
          fetchRecommendations();
        } else {
          setNotFound(true);
        }
      });
    }
  }, [artistName, checkCachedStatus, fetchRecommendations]);

  return {
    data,
    loading,
    error,
    notFound,
    isDataCached,
    hasResults: !!data,
    artistInfo: data?.artist_data || null,
    recommendations: data?.recommendations || []
  };
}