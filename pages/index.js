import { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import SearchBar from '../components/SearchBar';
import ArtistCard from '../components/ArtistCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { getFeaturedArtists } from '../lib/supabase';

export default function Home() {
  const [featuredArtists, setFeaturedArtists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch featured artists on component mount
  useEffect(() => {
    const fetchFeaturedArtists = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const { data, error: fetchError } = await getFeaturedArtists();
        
        if (fetchError) throw fetchError;
        
        setFeaturedArtists(data || []);
      } catch (err) {
        console.error('Error fetching featured artists:', err);
        setError('Failed to load featured artists');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedArtists();
  }, []);

  return (
    <Layout>
      <Head>
        <title>Rec'd - Discover Your Next Favorite Artist</title>
        <meta name="description" content="Get personalized music artist recommendations based on your favorites" />
      </Head>

      <div className="hero-section">
        <h1 className="hero-title">Find Your Next Favorite Artist</h1>
        <p className="hero-subtitle">
          Get intelligent music recommendations based on artists you love
        </p>
        
        <div className="search-container">
          <SearchBar />
        </div>
      </div>

      <div className="featured-section">
        <h2 className="featured-title">Featured Artists</h2>
        
        {isLoading ? (
          <LoadingSpinner message="Loading featured artists..." />
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : featuredArtists.length === 0 ? (
          <div className="no-featured-message">
            No featured artists available at the moment
          </div>
        ) : (
          <div className="featured-grid">
            {featuredArtists.map((item) => (
              <ArtistCard
                key={item.id}
                artist={{
                  name: item.artist_name,
                  ...item.artist_data
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="info-section">
        <div className="info-card">
          <h3>How It Works</h3>
          <p>
            Simply search for any music artist you enjoy, and we'll recommend similar 
            artists you might love, powered by AI and music analysis.
          </p>
        </div>
        
        <div className="info-card">
          <h3>Create an Account</h3>
          <p>
            Sign up to unlock 3 personalized searches. Each search is cached 
            and becomes available to everyone!
          </p>
        </div>
        
        <div className="info-card">
          <h3>Discover New Music</h3>
          <p>
            Explore artist pages to see recommendations, top tracks, and more 
            information to help you discover your next favorite.
          </p>
        </div>
      </div>
    </Layout>
  );
}