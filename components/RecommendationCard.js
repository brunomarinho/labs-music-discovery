import { useState, useEffect } from 'react';
import Link from 'next/link';
import { slugify } from '../lib/utils';
import logger from '../lib/logger';

export default function RecommendationCard({ 
  recommendation, 
  type = "ARTIST", // Default type if not provided
  sourceUrl = null // Default source URL if not provided
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  // Extract data from recommendation
  const { name, reason } = recommendation;
  
  // Fetch image on component mount
  useEffect(() => {
    if (!name) return;
    
    const normalizedType = type.toLowerCase();
    const searchType = normalizedType === 'song' ? 'track' : normalizedType;
    
    // Skip loading if we already have an error
    if (imageError) return;
    
    // Reset states for new fetch
    setImageLoading(true);
    setImageError(false);
    
    fetch(`/api/spotify-image?name=${encodeURIComponent(name)}&type=${searchType}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Image not found');
        }
        return response.json();
      })
      .then(data => {
        if (data.imageUrl) {
          setImageUrl(data.imageUrl);
        } else {
          setImageError(true);
        }
      })
      .catch(error => {
        logger.error(`Error fetching image for ${name}:`, error);
        setImageError(true);
      })
      .finally(() => {
        setImageLoading(false);
      });
  }, [name, type, imageError]);
  
  // Determine title based on type
  let title = name;
  let subtitle = null;
  
  if (type === "SONG") {
    // For songs, title is the song name and subtitle is artist name
    subtitle = recommendation.artist || recommendation.subtitle || null;
  } else if (type === "ALBUM") {
    // For albums, title is album name and subtitle is artist name
    subtitle = recommendation.artist || recommendation.subtitle || null;
  }
  
  // Source information
  const source = recommendation.source || recommendation.quote ? "Source: Web" : "Source: AI";
  
  return (
    <div 
      className={`recommendation-card ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!imageError && !imageLoading && imageUrl && (
        <div className="recommendation-image-container">
          <img 
            src={imageUrl} 
            alt={title}
            className="recommendation-image"
            onError={() => setImageError(true)}
            onLoad={() => setImageLoading(false)}
          />
          <div className="recommendation-type-badge">{type}</div>
        </div>
      )}
      
      <div className="recommendation-content">
        {(imageError || imageLoading || !imageUrl) && (
          <div className="recommendation-type-badge">{type}</div>
        )}
        
        <Link href={`/${slugify(name)}`} className="recommendation-title-link">
          <h3 className="recommendation-title">{title}</h3>
          {subtitle && <div className="recommendation-subtitle">{subtitle}</div>}
        </Link>
        
        <p className="recommendation-description">{reason}</p>
        
        <div className="recommendation-source">
          {sourceUrl ? (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="source-link">
              {source}
            </a>
          ) : (
            <span>{source}</span>
          )}
        </div>
      </div>
    </div>
  );
}