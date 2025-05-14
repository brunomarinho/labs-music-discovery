import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../components/Layout';
import RecommendationGrid from '../components/RecommendationGrid';
import AuthPrompt from '../components/AuthPrompt';
import SearchLimitReached from '../components/SearchLimitReached';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { deslugify, formatNumber } from '../lib/utils';
import { getPlaceholderImage } from '../lib/utils';

export default function ArtistPage() {
  const router = useRouter();
  const { artistSlug } = router.query;
  const { user, hasReachedSearchLimit } = useAuth();
  
  const [artistData, setArtistData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  
  // Fetch artist data and recommendations
  useEffect(() => {
    if (!artistSlug) return;
    
    const fetchArtistData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setNotFound(false);
        
        const artistName = deslugify(artistSlug);
        const response = await fetch(`/api/recommendations/${encodeURIComponent(artistName)}`);
        
        if (response.status === 404) {
          setNotFound(true);
          return;
        }
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch artist data');
        }
        
        const data = await response.json();
        
        setArtistData(data.artist_data || null);
        setRecommendations(data.recommendations || []);
      } catch (err) {
        console.error('Error fetching artist data:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchArtistData();
  }, [artistSlug]);

  // Handle refresh/regenerate recommendations
  const handleRegenerateRecommendations = async () => {
    if (!artistSlug || !user || hasReachedSearchLimit) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const artistName = deslugify(artistSlug);
      const response = await fetch(`/api/recommendations/${encodeURIComponent(artistName)}?refresh=true`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to regenerate recommendations');
      }
      
      const data = await response.json();
      
      setArtistData(data.artist_data || null);
      setRecommendations(data.recommendations || []);
    } catch (err) {
      console.error('Error regenerating recommendations:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="artist-page-loading">
          <LoadingSpinner size="large" message={`Loading artist data...`} />
        </div>
      </Layout>
    );
  }

  // Show not found state
  if (notFound) {
    return (
      <Layout>
        <div className="artist-not-found">
          <h1>Artist Not Found</h1>
          <p>
            This artist hasn't been searched before. {user ? 'Search for this artist to generate recommendations.' : 'Sign in to search for this artist and generate recommendations.'}
          </p>
          
          {!user && <AuthPrompt message="Sign in to search for this artist" />}
          {user && hasReachedSearchLimit && <SearchLimitReached />}
          
          {user && !hasReachedSearchLimit && (
            <button 
              onClick={handleRegenerateRecommendations}
              className="generate-button"
            >
              Generate Recommendations
            </button>
          )}
        </div>
      </Layout>
    );
  }

  // Show error state
  if (error || !artistData) {
    return (
      <Layout>
        <div className="artist-error">
          <h1>Something Went Wrong</h1>
          <p>{error || 'Failed to load artist data'}</p>
          <button onClick={() => router.push('/')} className="go-home-button">
            Return to Home
          </button>
        </div>
      </Layout>
    );
  }

  // Artist page content
  const {
    name,
    image,
    genres = [],
    popularity = 0,
    followers = 0,
    spotifyUrl,
    topTracks = [],
    relatedArtists = []
  } = artistData;

  return (
    <Layout title={`${name} - Recommendations | Rec'd`}>
      <Head>
        <meta name="description" content={`Discover artists similar to ${name}. Get personalized music recommendations.`} />
      </Head>

      <div className="artist-page">
        <div className="artist-header">
          <div className="artist-image-container">
            <img
              src={image || getPlaceholderImage()}
              alt={name}
              className="artist-image"
              width={300}
              height={300}
            />
          </div>
          
          <div className="artist-info">
            <h1 className="artist-name">{name}</h1>
            
            {genres && genres.length > 0 && (
              <div className="artist-genres">
                {genres.map((genre, index) => (
                  <span key={index} className="genre-tag">
                    {genre}
                  </span>
                ))}
              </div>
            )}
            
            <div className="artist-stats">
              {followers > 0 && (
                <div className="artist-followers">
                  <span className="stat-label">Followers:</span>
                  <span className="stat-value">{formatNumber(followers)}</span>
                </div>
              )}
              
              {popularity > 0 && (
                <div className="artist-popularity">
                  <span className="stat-label">Popularity:</span>
                  <div className="popularity-bar-container">
                    <div className="popularity-bar" style={{ width: `${popularity}%` }}></div>
                  </div>
                  <span className="popularity-value">{popularity}%</span>
                </div>
              )}
            </div>
            
            {spotifyUrl && (
              <a
                href={spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="spotify-button"
              >
                Listen on Spotify
              </a>
            )}
            
            {user && !hasReachedSearchLimit && (
              <button 
                onClick={handleRegenerateRecommendations}
                className="regenerate-button"
              >
                Regenerate Recommendations
              </button>
            )}
          </div>
        </div>
        
        {recommendations && recommendations.length > 0 ? (
          <RecommendationGrid 
            recommendations={recommendations} 
            title={`If you like ${name}, you might also like...`}
          />
        ) : (
          <div className="no-recommendations">
            <p>No recommendations available for this artist.</p>
            
            {user && !hasReachedSearchLimit && (
              <button 
                onClick={handleRegenerateRecommendations}
                className="generate-button"
              >
                Generate Recommendations
              </button>
            )}
            
            {!user && <AuthPrompt />}
            {user && hasReachedSearchLimit && <SearchLimitReached />}
          </div>
        )}
        
        {topTracks && topTracks.length > 0 && (
          <div className="top-tracks-section">
            <h2 className="section-title">Top Tracks</h2>
            <ul className="top-tracks-list">
              {topTracks.map((track, index) => (
                <li key={index} className="track-item">
                  {track.albumImage && (
                    <img
                      src={track.albumImage}
                      alt={track.name}
                      className="track-image"
                      width={60}
                      height={60}
                    />
                  )}
                  <span className="track-name">{track.name}</span>
                  {track.previewUrl && (
                    <audio
                      controls
                      className="track-preview"
                      src={track.previewUrl}
                    ></audio>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Layout>
  );
}