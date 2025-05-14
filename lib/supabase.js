import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

// Create a Supabase client for browser usage (auth)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create a service client for server operations with admin privileges
// Only use this on the server side
export const supabaseAdmin = () => {
  if (!supabaseServiceKey) {
    console.error('Missing Supabase service key');
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey);
};

// Auth helpers
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  return { data, error };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email, 
    password,
  });
  
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return { user: null, error };
  
  return { user: session.user, error: null };
}

// User profile helpers
export async function createUserProfile(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .insert([{ id: userId, search_count: 0 }]);

  return { data, error };
}

export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return { data, error };
}

export async function incrementSearchCount(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ search_count: supabase.raw('search_count + 1') })
    .eq('id', userId)
    .select();

  return { data, error };
}

// App settings helpers
export async function getAppSettings() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return { data, error };
}

// Artist recommendations helpers
export async function getCachedArtistRecommendations(artistName) {
  const { data, error } = await supabase
    .from('artist_recommendations_cache')
    .select('*')
    .ilike('artist_name', artistName)
    .single();

  return { data, error };
}

export async function cacheArtistRecommendations(artistName, artistSpotifyId, artistData, recommendations, userId = null) {
  const { data, error } = await supabase
    .from('artist_recommendations_cache')
    .insert([{
      artist_name: artistName,
      artist_spotify_id: artistSpotifyId,
      artist_data: artistData,
      recommendations: recommendations,
      created_by: userId
    }]);

  return { data, error };
}

export async function getFeaturedArtists() {
  const { data, error } = await supabase
    .from('artist_recommendations_cache')
    .select('*')
    .eq('is_featured', true)
    .order('created_at', { ascending: false });

  return { data, error };
}

export async function markArtistAsFeatured(artistId, featured = true) {
  const { data, error } = await supabase
    .from('artist_recommendations_cache')
    .update({ is_featured: featured })
    .eq('id', artistId)
    .select();

  return { data, error };
}