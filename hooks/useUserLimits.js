import { useState, useEffect, useCallback } from 'react';
import { getAppSettings } from '../lib/supabase';
import { useAuth } from './useAuth';

/**
 * Custom hook for checking user limits and app settings
 * @returns {Object} User limits and app settings
 */
export default function useUserLimits() {
  const { user, profile } = useAuth();
  const [appSettings, setAppSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch app settings
  const fetchAppSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: settingsError } = await getAppSettings();
      
      if (settingsError) throw settingsError;
      
      setAppSettings(data || { max_users: 50, registration_open: true });
    } catch (err) {
      console.error('Error fetching app settings:', err);
      setError(err.message);
      // Set default values if we can't fetch settings
      setAppSettings({ max_users: 50, registration_open: true });
    } finally {
      setLoading(false);
    }
  }, []);

  // Load settings on initial render
  useEffect(() => {
    fetchAppSettings();
  }, [fetchAppSettings]);

  return {
    loading,
    error,
    // User-specific limits
    searchCount: profile?.search_count || 0,
    searchLimit: 3,
    searchRemaining: profile ? Math.max(0, 3 - profile.search_count) : 0,
    hasReachedSearchLimit: profile ? profile.search_count >= 3 : false,
    // App-wide settings
    maxUsers: appSettings?.max_users || 50,
    registrationOpen: appSettings?.registration_open ?? true,
    isAdmin: profile?.is_admin || false,
    // Check if a new user can register
    canRegister: appSettings?.registration_open ?? true,
    // Reload settings function
    refreshSettings: fetchAppSettings
  };
}