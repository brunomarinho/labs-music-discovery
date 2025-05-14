import { useState } from 'react';
import Link from 'next/link';
import { slugify } from '../lib/utils';

export default function RecommendationCard({ recommendation }) {
  const [isHovered, setIsHovered] = useState(false);
  
  const { name, reason } = recommendation;
  
  return (
    <Link 
      href={`/${slugify(name)}`}
      className={`recommendation-card ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="recommendation-content">
        <h3 className="recommendation-name">{name}</h3>
        <p className="recommendation-reason">{reason}</p>
        
        <div className="recommendation-footer">
          <span className="view-link">View recommendations &rarr;</span>
        </div>
      </div>
    </Link>
  );
}