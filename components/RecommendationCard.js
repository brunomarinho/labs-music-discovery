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
  const { name, reason, quote, domain } = recommendation;
  
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
  
  // Format source information
  let sourceDisplay = '';
  let sourceName = '';
  let actualSourceUrl = recommendation.sourceUrl || sourceUrl;

  if (recommendation.source) {
    // We have a specific source type (Interview, Podcast, YouTube, Social media)
    sourceDisplay = 'Source: ';
    sourceName = recommendation.source;
    
    // If we have a domain, use that as the source name unless it's just the source type
    if (domain && !['interview', 'podcast', 'youtube', 'social media'].includes(domain.toLowerCase())) {
      // Extract domain without TLD and capitalize each word
      sourceName = domain.replace(/\.(com|org|net|io|co|tv|fm|me)$/, '')
                        .split('.')
                        .pop()
                        .replace(/-/g, ' ')
                        .replace(/\b\w/g, l => l.toUpperCase());
    }
  } else if (quote) {
    // We have a quote but no specific source
    sourceDisplay = 'Source: ';
    sourceName = domain ? domain.replace(/\.(com|org|net|io|co|tv|fm|me)$/, '')
                              .split('.')
                              .pop()
                              .replace(/-/g, ' ')
                              .replace(/\b\w/g, l => l.toUpperCase()) : 'Web';
  } else {
    // Fallback to AI
    sourceDisplay = 'Source: AI';
  }
  
  // Special case formatting for common sources
  const specialCases = {
    'youtube': 'YouTube',
    'spotify': 'Spotify',
    'instagram': 'Instagram',
    'twitter': 'Twitter',
    'facebook': 'Facebook',
    'soundcloud': 'SoundCloud',
    'bandcamp': 'Bandcamp',
    'pitchfork': 'Pitchfork',
    'rollingstone': 'Rolling Stone',
    'nme': 'NME',
    'billboard': 'Billboard',
    'npr': 'NPR'
  };
  
  // Check if source matches any special case
  if (sourceName) {
    const lowerSource = sourceName.toLowerCase();
    for (const [key, value] of Object.entries(specialCases)) {
      if (lowerSource === key || lowerSource.includes(key)) {
        sourceName = value;
        break;
      }
    }
  }
  
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
        
        <p className="recommendation-description">{quote || reason}</p>
        
        <div className="recommendation-source">
          {sourceName && actualSourceUrl ? (
            <>
              <span className="source-label">Source: </span>
              <a href={actualSourceUrl} target="_blank" rel="noopener noreferrer" className="source-link">
                {sourceName}
              </a>
            </>
          ) : (
            <span>{sourceDisplay}</span>
          )}
        </div>
      </div>
    </div>
  );
}