import RecommendationCard from './RecommendationCard';

export default function RecommendationGrid({ recommendations, title }) {
  if (!recommendations || recommendations.length === 0) {
    return null;
  }
  
  // These would normally come from API data, using placeholders for now
  const typeOptions = ["ARTIST", "ALBUM", "SONG"];
  const placeholderImages = [
    'https://i.scdn.co/image/ab67616d0000b273fd61ea11a6e3258526338aa7',
    'https://i.scdn.co/image/ab67616d0000b2731b6cc1fd0969032fba56dcd3', 
    'https://i.scdn.co/image/ab67616d0000b273e8b066f70c206551210d902b',
    'https://i.scdn.co/image/ab67616d0000b2739b19c107109de740bad72df5',
    'https://i.scdn.co/image/ab67616d0000b273d1c7761374467713127dd2ca',
    'https://i.scdn.co/image/ab67616d0000b273b2e8b39fc20fad753d438a0f'
  ];
  
  return (
    <div className="recommendations-section">
      {title && <h2 className="recommendations-title">{title}</h2>}
      
      <div className="recommendations-grid">
        {recommendations.map((recommendation, index) => {
          // For demo purposes, assign random type and image
          // In production, this would come from actual API data
          const type = typeOptions[Math.floor(Math.random() * typeOptions.length)];
          const image = placeholderImages[index % placeholderImages.length];
          
          return (
            <RecommendationCard 
              key={index} 
              recommendation={recommendation}
              type={type}
              image={image}
            />
          );
        })}
      </div>
    </div>
  );
}