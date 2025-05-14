import RecommendationCard from './RecommendationCard';

export default function RecommendationGrid({ recommendations, title = "You might also like" }) {
  if (!recommendations || recommendations.length === 0) {
    return null;
  }
  
  return (
    <div className="recommendations-section">
      <h2 className="recommendations-title">{title}</h2>
      
      <div className="recommendations-grid">
        {recommendations.map((recommendation, index) => (
          <RecommendationCard key={index} recommendation={recommendation} />
        ))}
      </div>
    </div>
  );
}