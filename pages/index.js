import { useState } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import SearchBar from '../components/SearchBar';
import LoadingSpinner from '../components/LoadingSpinner';
import featuredArtists from '../data/featured-artists.json';
import { slugify } from '../lib/utils';

export default function Home() {
  const [isLoading] = useState(false);

  return (
    <Layout>

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
        <h2 className="featured-title">Or check some examples!</h2>
        
        {isLoading ? (
          <LoadingSpinner message="Loading..." />
        ) : (
          <div className="featured-grid">
            {Array(3).fill(featuredArtists).map((column, colIndex) => (
              <div key={colIndex} className="featured-column">
                {column.map((artistName, index) => (
                  <Link 
                    href={`/${slugify(artistName)}`} 
                    key={`${colIndex}-${index}`}
                    className="featured-artist-link"
                  >
                    {artistName}
                  </Link>
                ))}
              </div>
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