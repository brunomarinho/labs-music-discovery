import Link from 'next/link';
import { useRouter } from 'next/router';

export default function AuthPrompt({ message = "Sign in to see recommendations" }) {
  const router = useRouter();
  const currentPath = router.asPath;
  
  return (
    <div className="auth-prompt">
      <div className="auth-prompt-content">
        <h2 className="auth-prompt-title">Want to see more?</h2>
        <p className="auth-prompt-message">{message}</p>
        
        <div className="auth-prompt-actions">
          <Link 
            href={`/auth/login?redirect=${encodeURIComponent(currentPath)}`}
            className="auth-prompt-login"
          >
            Log In
          </Link>
          
          <Link 
            href={`/auth/signup?redirect=${encodeURIComponent(currentPath)}`}
            className="auth-prompt-signup"
          >
            Sign Up
          </Link>
        </div>
        
        <p className="auth-prompt-note">
          New users can make up to 3 artist searches!
        </p>
      </div>
    </div>
  );
}