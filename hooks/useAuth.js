import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { supabase, signIn, signUp, signOut, getCurrentUser, getUserProfile, createUserProfile } from '../lib/supabase';

// Create context for auth
const AuthContext = createContext(null);

// Provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user on initial render
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const { user: currentUser, error: userError } = await getCurrentUser();
        
        if (userError) throw userError;
        
        if (currentUser) {
          setUser(currentUser);
          
          // Get user profile
          const { data: profileData, error: profileError } = await getUserProfile(currentUser.id);
          
          if (profileError && profileError.code !== 'PGRST116') { // Not found error
            throw profileError;
          }
          
          if (profileData) {
            setProfile(profileData);
          }
        }
      } catch (err) {
        console.error('Error loading user:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
    
    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        
        // Get or create profile
        const { data: profileData, error: profileError } = await getUserProfile(session.user.id);
        
        if (profileError && profileError.code === 'PGRST116') { // Not found error
          // Create new profile
          await createUserProfile(session.user.id);
          const { data: newProfile } = await getUserProfile(session.user.id);
          setProfile(newProfile);
        } else if (profileData) {
          setProfile(profileData);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      }
    });
    
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Login function
  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: signInError } = await signIn(email, password);
      
      if (signInError) throw signInError;
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Register function
  const register = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: signUpError } = await signUp(email, password);
      
      if (signUpError) throw signUpError;
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { error: signOutError } = await signOut();
      
      if (signOutError) throw signOutError;
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Context value
  const value = {
    user,
    profile,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    searchCount: profile?.search_count || 0,
    isAdmin: profile?.is_admin || false,
    hasReachedSearchLimit: profile ? profile.search_count >= 3 : false
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