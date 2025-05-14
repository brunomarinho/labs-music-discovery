import Link from 'next/link';

/**
 * Simplified fallback component to display when recommendations fail to load
 */
export default function RecommendationsFallback({ error, retry }) {
  // Generic error with retry
  return (
    <div className="recommendations-fallback generic-error">
      <h2>Couldn't Load Recommendations</h2>
      <p>
        {error?.message || error || 'We had trouble loading recommendations. Please try again.'}
      </p>
      <div className="fallback-actions">
        {retry && (
          <button onClick={retry} className="fallback-button">
            Try Again
          </button>
        )}
        <Link href="/" className="fallback-button secondary">
          Go to Home
        </Link>
      </div>
    </div>
  );
}