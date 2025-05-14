import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useRouter } from 'next/router';

/**
 * Custom hook for fetching artist recommendations
 * @param {string} artistName - Artist name to get recommendations for
 * @returns {Object} Recommendations data and state
 */
export default function useRecommendations(artistName) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const { user, hasReachedSearchLimit } = useAuth();
  const router = useRouter();

  /**
   * Fetch recommendations for the given artist
   */
  const fetchRecommendations = useCallback(async () => {
    if (!artistName) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setNotFound(false);
      
      const response = await fetch(`/api/recommendations/${encodeURIComponent(artistName)}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 404) {
        setNotFound(true);
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch recommendations');
      }
      
      const responseData = await response.json();
      setData(responseData);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [artistName]);

  // Fetch data when component mounts or artist changes
  useEffect(() => {
    if (artistName) {
      fetchRecommendations();
    }
  }, [artistName, fetchRecommendations]);

  /**
   * Trigger a new search for recommendations
   * Only works for authenticated users who haven't reached their limit
   */
  const generateNewRecommendations = useCallback(async () => {
    if (!user) {
      router.push('/auth/login?redirect=' + encodeURIComponent(router.asPath));
      return;
    }
    
    if (hasReachedSearchLimit) {
      setError('You have reached your search limit.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/recommendations/${encodeURIComponent(artistName)}?refresh=true`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate new recommendations');
      }
      
      const responseData = await response.json();
      setData(responseData);
    } catch (err) {
      console.error('Error generating recommendations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [artistName, user, hasReachedSearchLimit, router]);

  return {
    data,
    loading,
    error,
    notFound,
    generateNewRecommendations,
    hasResults: !!data,
    artistInfo: data?.artist_data || null,
    recommendations: data?.recommendations || []
  };
}