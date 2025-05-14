import { supabase } from '../../../lib/supabase';
import logger from '../../../lib/logger';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Get authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    // Verify token and get user
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      logger.error('[API] Auth error:', authError);
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    
    // Get user's profile with search count
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('search_count, is_admin')
      .eq('id', user.id)
      .single();
      
    if (profileError) {
      logger.error('[API] Error fetching user profile:', profileError);
      
      // If profile doesn't exist, create it
      if (profileError.code === 'PGRST116') {
        const { error: createError } = await supabase
          .from('user_profiles')
          .insert([{ id: user.id, search_count: 0 }]);
          
        if (createError) {
          logger.error('[API] Error creating user profile:', createError);
          return res.status(500).json({ success: false, error: 'Failed to create user profile' });
        }
        
        // New profile created with 0 searches
        return res.status(200).json({
          success: true,
          hasReachedLimit: false,
          searchCount: 0,
          isAdmin: false,
          maxSearches: 3
        });
      }
      
      return res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
    }
    
    // If user is admin, they don't have a search limit
    if (profile.is_admin) {
      return res.status(200).json({
        success: true,
        hasReachedLimit: false,
        searchCount: profile.search_count,
        isAdmin: true,
        maxSearches: Infinity
      });
    }
    
    // Check if user has reached search limit
    const MAX_SEARCHES = 3; // Maximum number of searches allowed
    const hasReachedLimit = profile.search_count >= MAX_SEARCHES;
    
    return res.status(200).json({
      success: true,
      hasReachedLimit,
      searchCount: profile.search_count,
      isAdmin: false,
      maxSearches: MAX_SEARCHES
    });
  } catch (error) {
    logger.error('[API] Error checking search limit:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}