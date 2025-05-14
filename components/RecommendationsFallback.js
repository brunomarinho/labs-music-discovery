import { useAuth } from '../hooks/useAuth';
import Link from 'next/link';

/**
 * Fallback component to display when recommendations fail to load
 * Shows different messages based on error type and user status
 */
export default function RecommendationsFallback({ error, retry, artistName }) {
  const { user } = useAuth();

  // Check if error is a limit reached error
  const isLimitError = error?.message?.includes('limit reached') || error?.includes('limit reached');
  
  // Check if error is a login required error
  const isLoginError = error?.message?.includes('Login required') || error?.includes('Login required');

  // Show limit reached error
  if (isLimitError) {
    return (
      <div className="recommendations-fallback limit-error">
        <h2>Search Limit Reached</h2>
        <p>
          You have reached your limit of 3 artist searches. Each new search contributes
          to our shared recommendation database for everyone to use.
        </p>
        <div className="fallback-actions">
          <Link href="/" className="fallback-button">
            Explore Featured Artists
          </Link>
        </div>
      </div>
    );
  }

  // Show login required error for non-authenticated users
  if (isLoginError || !user) {
    return (
      <div className="recommendations-fallback login-error">
        <h2>Login Required</h2>
        <p>
          To generate recommendations for {artistName || 'this artist'}, please log in.
          Each logged-in user can search for up to 3 artists, and all search results
          are cached for everyone to use.
        </p>
        <div className="fallback-actions">
          <Link href={`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`} className="fallback-button">
            Log In
          </Link>
          <Link href={`/auth/signup?redirect=${encodeURIComponent(window.location.pathname)}`} className="fallback-button signup">
            Sign Up
          </Link>
        </div>
      </div>
    );
  }

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