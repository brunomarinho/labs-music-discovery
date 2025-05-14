import { useState } from 'react';
import Link from 'next/link';
import { slugify } from '../lib/utils';

export default function RecommendationCard({ 
  recommendation, 
  type = "ARTIST", // Default type if not provided
  image = null, // Default image if not provided
  sourceUrl = null // Default source URL if not provided
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Extract data from recommendation
  const { name, reason } = recommendation;
  
  // Determine title based on type (would be populated from actual data)
  let title = name;
  let subtitle = null;
  
  if (type === "SONG") {
    // For songs, title is the song name and subtitle is artist name
    subtitle = "Artist Name"; // This would come from actual data
  } else if (type === "ALBUM") {
    // For albums, title is album name and subtitle is artist name
    subtitle = "Artist Name"; // This would come from actual data
  }
  
  // Placeholder image if none provided
  const imageUrl = image || 'https://via.placeholder.com/300';
  
  // Source information
  const source = "Sources: 1, 2";
  
  return (
    <div 
      className={`recommendation-card ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="recommendation-image-container">
        <img 
          src={imageUrl} 
          alt={title}
          className="recommendation-image"
        />
        <div className="recommendation-type-badge">{type}</div>
      </div>
      
      <div className="recommendation-content">
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