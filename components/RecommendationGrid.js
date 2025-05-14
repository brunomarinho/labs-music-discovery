import RecommendationCard from './RecommendationCard';

export default function RecommendationGrid({ recommendations, title }) {
  if (!recommendations || recommendations.length === 0) {
    return null;
  }
  
  return (
    <div className="recommendations-section">
      {title && <h2 className="recommendations-title">{title}</h2>}
      
      <div className="recommendations-grid">
        {recommendations.map((recommendation, index) => {
          // Use the type from recommendation or default to ARTIST
          const type = recommendation.type ? recommendation.type.toUpperCase() : "ARTIST";
          
          // Use sourceUrl if available
          const sourceUrl = recommendation.sourceUrl || null;
          
          return (
            <RecommendationCard 
              key={index} 
              recommendation={recommendation}
              type={type}
              sourceUrl={sourceUrl}
            />
          );
        })}
      </div>
    </div>
  );
}