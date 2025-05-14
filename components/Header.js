import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/router';

export default function Header() {
  const { user, logout, searchCount, isAdmin } = useAuth();
  const router = useRouter();

  const handleLogout = async (e) => {
    e.preventDefault();
    const { success } = await logout();
    if (success) {
      router.push('/');
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <Link href="/" className="logo">
            Rec'd
          </Link>
        </div>
        
        <div className="header-right">
          {user ? (
            <div className="user-menu">
              <span className="user-email">{user.email}</span>
              <span className="search-count">Searches: {searchCount}/3</span>
              
              {isAdmin && (
                <Link href="/admin/manage-featured" className="admin-link">
                  Admin
                </Link>
              )}
              
              <button onClick={handleLogout} className="logout-button">
                Sign Out
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link href="/auth/login" className="login-button">
                Log In
              </Link>
              <Link href="/auth/signup" className="signup-button">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}