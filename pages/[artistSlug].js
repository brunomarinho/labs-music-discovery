import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../components/Layout';
import RecommendationGrid from '../components/RecommendationGrid';
import AuthPrompt from '../components/AuthPrompt';
import SearchLimitReached from '../components/SearchLimitReached';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { deslugify } from '../lib/utils';
import logger from '../lib/logger';

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
        logger.error('Error fetching artist data:', err);
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
      logger.error('Error regenerating recommendations:', err);
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

  // Artist page content - simplified version
  const { name } = artistData;

  return (
    <Layout title={`${name} - Recommendations | Rec'd`}>
      <Head>
        <meta name="description" content={`Discover artists similar to ${name}. Get personalized music recommendations.`} />
      </Head>

      <div className="artist-page">
        <div className="artist-header-simple">
          <h1 className="artist-name">{name}</h1>
          <h2 className="recommendations-subtitle">Recommendations</h2>
        </div>
        
        {recommendations && recommendations.length > 0 ? (
          <RecommendationGrid recommendations={recommendations} />
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
      </div>
    </Layout>
  );
}