import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/router';
import SEO from './SEO';

export default function Layout({ 
  children, 
  title = "Rec'd - Music Discovery",
  description = "Discover new music artists based on your favorites",
  canonical,
  ogImage,
  ogType
}) {
  const { user, profile, logout, isAuthenticated, searchCount } = useAuth();
  const router = useRouter();

  const handleLogout = async (e) => {
    e.preventDefault();
    const { success } = await logout();
    if (success) {
      router.push('/');
    }
  };

  // Prepare only props that were passed to Layout
  const seoProps = {
    title,
    ...(description && { description }),
    ...(canonical && { canonical }),
    ...(ogImage && { ogImage }),
    ...(ogType && { ogType })
  };
  
  return (
    <>
      <SEO {...seoProps} />

      <div className="layout">
        <header className="header">
          <div className="header-content">
            <div className="left">
              <Link href="/" className="logo">
                Rec'd
              </Link>
            </div>
            
            <div className="right">
              {isAuthenticated ? (
                <div className="user-menu">
                  <span className="user-info">
                    {user.email} | Searches: {searchCount}/3
                  </span>
                  {profile?.is_admin && (
                    <Link href="/admin/manage-featured" className="admin-link">
                      Admin
                    </Link>
                  )}
                  <button onClick={handleLogout} className="logout-button">
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="auth-links">
                  <Link href="/auth/login" className="login-link">
                    Login
                  </Link>
                  <Link href="/auth/signup" className="signup-link">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="main-content">
          {children}
        </main>

        <footer className="footer">
          <div className="footer-content">
            <p>&copy; {new Date().getFullYear()} Rec'd - Find your next favorite artist</p>
          </div>
        </footer>
      </div>
    </>
  );
}