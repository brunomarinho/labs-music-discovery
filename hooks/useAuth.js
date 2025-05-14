import { createContext, useContext } from 'react';

// Create context for auth
const AuthContext = createContext(null);

// Provider component - simplified with no auth
export function AuthProvider({ children }) {
  // Context value - simplified to always have full access
  const value = {
    user: true, // Always "logged in"
    loading: false,
    error: null,
    isAuthenticated: true, // Always authenticated
    searchCount: 0,
    isAdmin: true, // Always admin
    hasReachedSearchLimit: false // Never reached limit
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

export default useAuth;