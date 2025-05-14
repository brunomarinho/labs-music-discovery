import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/router';

export default function Layout({ children, title = "Rec'd - Music Discovery" }) {
  const { user, profile, logout, isAuthenticated, searchCount } = useAuth();
  const router = useRouter();

  const handleLogout = async (e) => {
    e.preventDefault();
    const { success } = await logout();
    if (success) {
      router.push('/');
    }
  };

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Discover new music artists based on your favorites" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

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