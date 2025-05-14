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
            <div className="featured-column">
              {featuredArtists.map((artistName, index) => (
                <Link 
                  href={`/${slugify(artistName)}`} 
                  key={index}
                  className="featured-artist-link"
                >
                  {artistName}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="info-section">
        <div className="info-card">
          <h3>How It Works</h3>
          <p>
            Simply search for any music artist from our featured list, and we'll provide
            AI-powered recommendations of similar artists you might love.
          </p>
        </div>
        
        <div className="info-card">
          <h3>Featured Artists</h3>
          <p>
            We currently showcase a select group of artists with curated 
            recommendations. Check back as we add more artists over time!
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