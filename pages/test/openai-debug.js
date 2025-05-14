import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Layout from '../../components/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';
import RecommendationGrid from '../../components/RecommendationGrid';
import logger from '../../lib/logger';

export default function OpenAIDebugPage() {
  const [artistName, setArtistName] = useState('');
  const [rawResponse, setRawResponse] = useState('');
  const [processedRecommendations, setProcessedRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bypassCache, setBypassCache] = useState(true);
  const [showRawJson, setShowRawJson] = useState(false);
  
  // Function to generate new recommendations
  const generateRecommendations = useCallback(async () => {
    if (!artistName) {
      setError('Please enter an artist name');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setRawResponse('');
    setProcessedRecommendations([]);
    
    try {
      // Direct server API call that bypasses the client-side cache
      const response = await fetch(`/api/test/openai-debug?artistName=${encodeURIComponent(artistName)}&bypassCache=${bypassCache}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Set the raw response
      setRawResponse(JSON.stringify(data, null, 2));
      
      // Set the processed recommendations
      if (data.recommendations) {
        setProcessedRecommendations(data.recommendations);
      }
    } catch (err) {
      logger.error('Error generating recommendations:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [artistName, bypassCache]);
  
  // If the URL has a query parameter for artist, use it
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const artistParam = params.get('artist');
    if (artistParam) {
      setArtistName(artistParam);
      // Automatically generate when the page loads with an artist param
      generateRecommendations();
    }
  }, [generateRecommendations]);
  
  // Function to handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    generateRecommendations();
  };
  
  return (
    <Layout title="OpenAI Debug Tool">
      <Head>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="Internal OpenAI API Debug Tool" />
      </Head>
      
      <div className="openai-debug-container" style={{ padding: '20px' }}>
        <h1>OpenAI API Debug Tool</h1>
        <p style={{ color: 'red', fontWeight: 'bold' }}>
          THIS IS A TEMPORARY DEBUG PAGE. NOT FOR PRODUCTION USE.
        </p>
        
        <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', marginBottom: '10px' }}>
            <input
              type="text"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="Enter artist name"
              style={{ flex: 1, padding: '10px', marginRight: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
            />
            <button 
              type="submit" 
              disabled={isLoading || !artistName}
              style={{ 
                padding: '10px 20px', 
                backgroundColor: '#4CAF50', 
                color: 'white', 
                border: 'none', 
                borderRadius: '5px', 
                cursor: isLoading || !artistName ? 'not-allowed' : 'pointer',
                opacity: isLoading || !artistName ? 0.7 : 1
              }}
            >
              Generate
            </button>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <label style={{ marginRight: '10px' }}>
                <input
                  type="checkbox"
                  checked={bypassCache}
                  onChange={(e) => setBypassCache(e.target.checked)}
                />
                Bypass Cache (Force API Call)
              </label>
            </div>
            
            <div>
              <label>
                <input
                  type="checkbox"
                  checked={showRawJson}
                  onChange={(e) => setShowRawJson(e.target.checked)}
                />
                Show Raw JSON
              </label>
            </div>
          </div>
        </form>
        
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <LoadingSpinner size="large" message={`Generating recommendations for ${artistName}...`} />
          </div>
        )}
        
        {error && (
          <div style={{ padding: '15px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '5px', marginBottom: '20px' }}>
            <h2>Error</h2>
            <p>{error}</p>
          </div>
        )}
        
        {showRawJson && rawResponse && (
          <div style={{ marginBottom: '30px' }}>
            <h2>Raw API Response</h2>
            <pre style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '15px', 
              borderRadius: '5px', 
              overflow: 'auto', 
              maxHeight: '400px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {rawResponse}
            </pre>
          </div>
        )}
        
        {processedRecommendations.length > 0 && (
          <div>
            <h2>Recommendations</h2>
            <RecommendationGrid recommendations={processedRecommendations} />
          </div>
        )}
        
        {!isLoading && processedRecommendations.length === 0 && !error && rawResponse && (
          <div style={{ padding: '15px', backgroundColor: '#d1e7dd', color: '#0f5132', borderRadius: '5px' }}>
            <p>No recommendations found for this artist.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}