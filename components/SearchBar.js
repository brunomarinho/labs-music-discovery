import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useDebounce } from 'use-debounce';
import { slugify } from '../lib/utils';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query, 300);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);
  const router = useRouter();

  // Fetch search suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!debouncedQuery.trim()) {
        setSuggestions([]);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/search-suggestions?query=${encodeURIComponent(debouncedQuery)}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch suggestions');
        }
        
        const data = await response.json();
        setSuggestions(data);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle input change
  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setShowSuggestions(true);
  };

  // Handle search submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (query.trim()) {
      router.push(`/${slugify(query)}`);
      setQuery('');
      setShowSuggestions(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (artist) => {
    router.push(`/${slugify(artist.name)}`);
    setQuery('');
    setShowSuggestions(false);
  };

  return (
    <div className="search-container" ref={searchRef}>
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-wrapper">
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search for any music artist..."
            className="search-input"
            aria-label="Search for artists"
          />
          {query && (
            <button
              type="button"
              className="clear-button"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
              }}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
          <button type="submit" className="search-button" aria-label="Search">
            {isLoading ? (
              <span className="loading-spinner"></span>
            ) : (
              <svg className="search-icon" viewBox="0 0 24 24">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
            )}
          </button>
        </div>
        
        {showSuggestions && suggestions.length > 0 && (
          <div className="suggestions-container">
            <ul className="suggestions-list">
              {suggestions.map((artist) => (
                <li
                  key={artist.id}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(artist)}
                >
                  {artist.image && (
                    <img
                      src={artist.image}
                      alt={artist.name}
                      className="suggestion-image"
                      width={40}
                      height={40}
                    />
                  )}
                  <div className="suggestion-info">
                    <span className="suggestion-name">{artist.name}</span>
                    {artist.popularity && (
                      <span className="suggestion-popularity">
                        Popularity: {artist.popularity}%
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </div>
  );
}