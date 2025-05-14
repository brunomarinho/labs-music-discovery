import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../components/Layout';
import RecommendationGrid from '../components/RecommendationGrid';
import LoadingSpinner from '../components/LoadingSpinner';
import { deslugify } from '../lib/utils';
import logger from '../lib/logger';

export default function ArtistPage() {
  const router = useRouter();
  const { artistSlug } = router.query;
  
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
            This artist hasn't been searched before or isn't in our featured list.
          </p>
          
          <button 
            onClick={() => router.push('/')} 
            className="go-home-button"
          >
            Return to Home
          </button>
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
            <p>Recommendations are only updated by site administrators.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}