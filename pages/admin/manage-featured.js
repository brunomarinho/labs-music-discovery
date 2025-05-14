import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';
import { getFeaturedArtists, markArtistAsFeatured } from '../../lib/supabase';
import { searchArtist } from '../../lib/spotify';
import logger from '../../lib/logger';

export default function ManageFeatured() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  
  const [featuredArtists, setFeaturedArtists] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  // Check if user is admin
  useEffect(() => {
    if (user && !isAdmin) {
      router.push('/');
    }
  }, [user, isAdmin, router]);

  // Fetch featured artists
  useEffect(() => {
    const fetchFeaturedArtists = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const { data, error: fetchError } = await getFeaturedArtists();
        
        if (fetchError) throw fetchError;
        
        setFeaturedArtists(data || []);
      } catch (err) {
        logger.error('Error fetching featured artists:', err);
        setError('Failed to load featured artists');
      } finally {
        setIsLoading(false);
      }
    };

    if (user && isAdmin) {
      fetchFeaturedArtists();
    }
  }, [user, isAdmin]);

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Handle search submit
  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    try {
      setIsSearching(true);
      setError(null);
      
      const results = await searchArtist(searchQuery);
      setSearchResults(results);
    } catch (err) {
      logger.error('Error searching artists:', err);
      setError('Failed to search artists');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle featuring/unfeaturing an artist
  const handleFeatureToggle = async (artist, isFeatured) => {
    try {
      setIsLoading(true);
      setError(null);
      setActionMessage(null);
      
      const { error: toggleError } = await markArtistAsFeatured(artist.id, !isFeatured);
      
      if (toggleError) throw toggleError;
      
      // Refresh the list
      const { data, error: fetchError } = await getFeaturedArtists();
      
      if (fetchError) throw fetchError;
      
      setFeaturedArtists(data || []);
      setActionMessage(`Artist ${!isFeatured ? 'featured' : 'unfeatured'} successfully`);
    } catch (err) {
      logger.error('Error toggling featured status:', err);
      setError(`Failed to ${!isFeatured ? 'feature' : 'unfeature'} artist`);
    } finally {
      setIsLoading(false);
    }
  };

  // Show access denied if not admin
  if (user && !isAdmin) {
    return (
      <Layout title="Access Denied | Rec'd">
        <div className="admin-page">
          <h1>Access Denied</h1>
          <p>You don't have permission to access this page.</p>
        </div>
      </Layout>
    );
  }

  // Show loading while checking admin status
  if (!user) {
    return (
      <Layout title="Admin | Rec'd">
        <div className="admin-page">
          <LoadingSpinner message="Checking permissions..." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Manage Featured Artists | Rec'd">
      <div className="admin-page">
        <h1 className="admin-title">Manage Featured Artists</h1>
        
        {actionMessage && (
          <div className="action-message success">
            {actionMessage}
          </div>
        )}
        
        {error && (
          <div className="action-message error">
            {error}
          </div>
        )}
        
        <div className="admin-search">
          <h2>Add Featured Artist</h2>
          <form onSubmit={handleSearch} className="admin-search-form">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search for artists..."
              className="admin-search-input"
              disabled={isSearching}
            />
            <button 
              type="submit" 
              className="admin-search-button"
              disabled={isSearching || !searchQuery.trim()}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>
          
          {searchResults.length > 0 && (
            <div className="admin-search-results">
              <h3>Search Results</h3>
              <ul className="admin-result-list">
                {searchResults.map((artist) => (
                  <li key={artist.id} className="admin-result-item">
                    {artist.image && (
                      <img
                        src={artist.image}
                        alt={artist.name}
                        className="admin-result-image"
                        width={50}
                        height={50}
                      />
                    )}
                    <span className="admin-result-name">{artist.name}</span>
                    <button
                      onClick={() => {
                        // Create a cache search for this artist first
                        // This just opens the artist page which will create the cache
                        window.open(`/${artist.name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')}`, '_blank');
                      }}
                      className="admin-create-cache"
                    >
                      Create Cache
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="admin-featured-list">
          <h2>Current Featured Artists</h2>
          
          {isLoading ? (
            <LoadingSpinner message="Loading featured artists..." />
          ) : featuredArtists.length === 0 ? (
            <p className="no-featured">No featured artists yet.</p>
          ) : (
            <ul className="admin-artist-list">
              {featuredArtists.map((artist) => (
                <li key={artist.id} className="admin-artist-item">
                  <div className="admin-artist-info">
                    {artist.artist_data && artist.artist_data.image && (
                      <img
                        src={artist.artist_data.image}
                        alt={artist.artist_name}
                        className="admin-artist-image"
                        width={50}
                        height={50}
                      />
                    )}
                    <span className="admin-artist-name">{artist.artist_name}</span>
                  </div>
                  
                  <button
                    onClick={() => handleFeatureToggle(artist, true)}
                    className="admin-unfeature-button"
                    disabled={isLoading}
                  >
                    Remove from Featured
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}