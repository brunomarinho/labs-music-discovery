import { useState, useCallback, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { searchArtist } from '../lib/spotify';

/**
 * Custom hook for artist search functionality
 * @returns {Object} Search state and functions
 */
export default function useSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query, 300);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Search for artists based on the current query
   */
  const fetchResults = useCallback(async () => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Call the API route to avoid exposing credentials in client
      const response = await fetch(`/api/search-suggestions?query=${encodeURIComponent(debouncedQuery)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }
      
      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery]);

  // Trigger search when debounced query changes
  useEffect(() => {
    fetchResults();
  }, [fetchResults, debouncedQuery]);

  /**
   * Handle query input change
   * @param {string} value - New query value
   */
  const handleInputChange = useCallback((value) => {
    setQuery(value);
  }, []);

  /**
   * Clear search results and query
   */
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
  }, []);

  return {
    query,
    results,
    loading,
    error,
    handleInputChange,
    clearSearch
  };
}