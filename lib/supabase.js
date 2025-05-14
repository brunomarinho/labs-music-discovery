import { createClient } from '@supabase/supabase-js';
import logger from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  logger.error('Missing Supabase environment variables');
}

// Create a Supabase client with anonymous key
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// In-memory cache for simplicity
const inMemoryCache = {};

// Artist recommendations helpers - with file-based fallback
export async function getCachedArtistRecommendations(artistName) {
  if (!artistName) {
    return { data: null, error: new Error('Artist name is required') };
  }
  
  try {
    // First try using Supabase
    const { data, error } = await supabase
      .from('artist_recommendations_cache')
      .select('*')
      .ilike('artist_name', artistName)
      .single();
    
    // If successful, return the data
    if (!error && data) {
      // Update in-memory cache
      inMemoryCache[artistName.toLowerCase()] = data;
      return { data, error: null };
    }
    
    // If Supabase fails but we have in-memory cache, use that
    if (inMemoryCache[artistName.toLowerCase()]) {
      logger.log(`Using in-memory cache for ${artistName}`);
      return { 
        data: inMemoryCache[artistName.toLowerCase()], 
        error: null 
      };
    }
    
    // No data found
    return { data: null, error: new Error('Artist not found in cache') };
  } catch (err) {
    logger.error(`Error getting cached recommendations for ${artistName}:`, err);
    
    // Fallback to in-memory cache
    if (inMemoryCache[artistName.toLowerCase()]) {
      return { 
        data: inMemoryCache[artistName.toLowerCase()], 
        error: null 
      };
    }
    
    return { data: null, error: err };
  }
}

export async function cacheArtistRecommendations(artistName, artistSpotifyId, artistData, recommendations, isFeatured = false) {
  if (!artistName || !artistSpotifyId) {
    return { data: null, error: new Error('Artist name and ID are required') };
  }
  
  const newCacheItem = {
    id: Date.now().toString(), // Generate a unique ID
    artist_name: artistName,
    artist_spotify_id: artistSpotifyId,
    artist_data: artistData,
    recommendations: recommendations,
    is_featured: isFeatured,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  try {
    // Try to insert via Supabase first
    const { data, error } = await supabase
      .from('artist_recommendations_cache')
      .insert([{
        artist_name: artistName,
        artist_spotify_id: artistSpotifyId,
        artist_data: artistData,
        recommendations: recommendations,
        is_featured: isFeatured
      }]);
    
    if (!error) {
      logger.log(`Successfully cached ${artistName} in Supabase`);
      return { data, error: null };
    }
    
    // If Supabase fails, use in-memory cache as fallback
    logger.warn(`Supabase caching failed for ${artistName}, using memory cache:`, error);
    inMemoryCache[artistName.toLowerCase()] = newCacheItem;
    
    return { 
      data: newCacheItem, 
      error: null 
    };
  } catch (err) {
    logger.error(`Error caching recommendations for ${artistName}:`, err);
    
    // Still save to in-memory cache
    inMemoryCache[artistName.toLowerCase()] = newCacheItem;
    
    return { 
      data: newCacheItem, 
      error: null // Return null error since we still cached in memory
    };
  }
}

export async function getFeaturedArtists() {
  try {
    // Try to get from Supabase first
    const { data, error } = await supabase
      .from('artist_recommendations_cache')
      .select('*')
      .eq('is_featured', true)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      return { data, error: null };
    }
    
    // Fallback to in-memory
    const featuredFromMemory = Object.values(inMemoryCache).filter(item => item.is_featured);
    return { data: featuredFromMemory, error: null };
  } catch (err) {
    logger.error('Error getting featured artists:', err);
    
    // Fallback to in-memory
    const featuredFromMemory = Object.values(inMemoryCache).filter(item => item.is_featured);
    return { data: featuredFromMemory, error: null };
  }
}

export async function markArtistAsFeatured(artistId, featured = true) {
  try {
    // Try Supabase first
    const { data, error } = await supabase
      .from('artist_recommendations_cache')
      .update({ is_featured: featured })
      .eq('id', artistId)
      .select();
    
    if (!error && data) {
      // Update in memory cache too
      Object.values(inMemoryCache).forEach(item => {
        if (item.id === artistId) {
          item.is_featured = featured;
        }
      });
      return { data, error: null };
    }
    
    // If Supabase fails but we find the item in memory cache
    let foundInMemory = false;
    Object.values(inMemoryCache).forEach(item => {
      if (item.id === artistId) {
        item.is_featured = featured;
        foundInMemory = true;
      }
    });
    
    if (foundInMemory) {
      return { data: [{ id: artistId, is_featured: featured }], error: null };
    }
    
    return { data: null, error: new Error('Artist not found') };
  } catch (err) {
    logger.error(`Error marking artist ${artistId} as featured:`, err);
    return { data: null, error: err };
  }
}