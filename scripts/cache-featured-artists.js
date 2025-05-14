/**
 * This script caches recommendations for featured artists
 * Run with: node scripts/cache-featured-artists.js
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const fetch = require('node-fetch');

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Spotify API helpers
async function getSpotifyToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Spotify credentials');
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    },
    body: params
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Failed to get Spotify access token: ${data.error}`);
  }

  return data.access_token;
}

async function searchArtist(name, token) {
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Spotify search error: ${data.error?.message || 'Unknown error'}`);
  }
  
  if (!data.artists.items.length) {
    throw new Error(`No artist found for "${name}"`);
  }
  
  // Return the full artist object
  return data.artists.items[0];
}

async function getArtistDetails(artistId, token) {
  // Get artist details
  const artistResponse = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  const artistData = await artistResponse.json();
  
  if (!artistResponse.ok) {
    throw new Error(`Error fetching artist: ${artistData.error?.message || 'Unknown error'}`);
  }
  
  // Get top tracks
  const tracksResponse = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  const tracksData = await tracksResponse.json();
  
  // Get related artists
  const relatedResponse = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}/related-artists`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  const relatedData = await relatedResponse.json();
  
  return {
    id: artistData.id,
    name: artistData.name,
    image: artistData.images.length > 0 ? artistData.images[0].url : null,
    genres: artistData.genres,
    popularity: artistData.popularity,
    followers: artistData.followers.total,
    spotifyUrl: artistData.external_urls.spotify,
    topTracks: tracksData.tracks?.slice(0, 5).map(track => ({
      id: track.id,
      name: track.name,
      previewUrl: track.preview_url,
      albumImage: track.album.images.length > 0 ? track.album.images[0].url : null
    })) || [],
    relatedArtists: relatedData.artists?.slice(0, 5).map(artist => ({
      id: artist.id,
      name: artist.name,
      image: artist.images.length > 0 ? artist.images[0].url : null
    })) || []
  };
}

// OpenAI helper
async function getArtistRecommendations(artistName) {
  const prompt = `Give me 6 music artist recommendations similar to ${artistName}. Return only a JSON array with objects containing "name" (the artist name) and "reason" (a brief 1-2 sentence reason why this artist is similar). Format as [{name: "Artist Name", reason: "Brief reason"}]. Use a conversational, friendly tone and limit each reason to 100 characters max.`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { 
        role: "system", 
        content: "You are a music recommendation expert. Provide accurate, thoughtful recommendations based on the artist name provided. Respond only with the requested JSON format." 
      },
      { 
        role: "user", 
        content: prompt 
      }
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  // Extract and parse the JSON from the response
  const responseText = response.choices[0].message.content;
  
  // Handle any text before or after the JSON array
  let jsonString = responseText.trim();
  
  // If response has backticks or other formatting, extract just the JSON part
  if (jsonString.includes('```')) {
    jsonString = jsonString.split('```')[1].replace('json', '').trim();
  }
  
  try {
    const recommendations = JSON.parse(jsonString);
    
    // Validate the response structure
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      throw new Error('Invalid response format');
    }
    
    // Ensure we have exactly 6 recommendations
    return recommendations.slice(0, 6);
  } catch (parseError) {
    console.error('Error parsing OpenAI response:', parseError);
    throw new Error('Failed to parse recommendation data');
  }
}

// Supabase caching helpers
async function getCachedArtist(artistName) {
  const { data, error } = await supabase
    .from('artist_recommendations_cache')
    .select('*')
    .ilike('artist_name', artistName)
    .single();

  if (error && error.code !== 'PGRST116') { // Not "not found" error
    throw error;
  }

  return data;
}

async function cacheArtistRecommendations(artistName, artistId, artistData, recommendations) {
  const { data, error } = await supabase
    .from('artist_recommendations_cache')
    .insert([{
      artist_name: artistName,
      artist_spotify_id: artistId,
      artist_data: artistData,
      recommendations: recommendations,
      is_featured: true
    }])
    .select();

  if (error) {
    throw error;
  }

  return data;
}

async function updateArtistCache(id, artistData, recommendations) {
  const { data, error } = await supabase
    .from('artist_recommendations_cache')
    .update({
      artist_data: artistData,
      recommendations: recommendations,
      is_featured: true
    })
    .eq('id', id)
    .select();

  if (error) {
    throw error;
  }

  return data;
}

// Main function
async function cacheFeaturedArtists() {
  try {
    // Load featured artists list
    const featuredArtistsPath = path.join(__dirname, '..', 'data', 'featured-artists.json');
    const featuredArtists = JSON.parse(fs.readFileSync(featuredArtistsPath, 'utf8'));

    console.log(`Found ${featuredArtists.length} featured artists to cache`);

    // Get Spotify token
    const token = await getSpotifyToken();
    
    // Process each artist
    const results = [];

    for (const artistName of featuredArtists) {
      try {
        console.log(`Processing ${artistName}...`);
        
        // Check if already cached
        const cachedArtist = await getCachedArtist(artistName);
        
        // First, search for the artist to get their Spotify ID
        const artistInfo = await searchArtist(artistName, token);
        const artistId = artistInfo.id;
        
        if (cachedArtist) {
          console.log(`${artistName} already cached, updating...`);
          
          // Get fresh data
          const artistDetails = await getArtistDetails(artistId, token);
          const recommendations = await getArtistRecommendations(artistName);
          
          // Update cache
          await updateArtistCache(cachedArtist.id, artistDetails, recommendations);
          
          results.push({
            name: artistName,
            status: 'updated',
            success: true
          });
          
          console.log(`Updated ${artistName} successfully`);
        } else {
          console.log(`${artistName} not cached, creating new entry...`);
          
          // Get fresh data
          const artistDetails = await getArtistDetails(artistId, token);
          const recommendations = await getArtistRecommendations(artistName);
          
          // Cache
          await cacheArtistRecommendations(artistName, artistId, artistDetails, recommendations);
          
          results.push({
            name: artistName,
            status: 'created',
            success: true
          });
          
          console.log(`Cached ${artistName} successfully`);
        }
      } catch (error) {
        console.error(`Error processing ${artistName}:`, error);
        
        results.push({
          name: artistName,
          status: 'error',
          success: false,
          error: error.message
        });
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Print summary
    console.log('\nCaching Summary:');
    console.log('================');
    console.log(`Total: ${results.length}`);
    console.log(`Success: ${results.filter(r => r.success).length}`);
    console.log(`Failed: ${results.filter(r => !r.success).length}`);
    
    if (results.filter(r => !r.success).length > 0) {
      console.log('\nFailed artists:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`- ${r.name}: ${r.error}`);
      });
    }

  } catch (error) {
    console.error('Error in cache script:', error);
    process.exit(1);
  }
}

// Run the script
cacheFeaturedArtists()
  .then(() => {
    console.log('Cache script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Cache script failed:', error);
    process.exit(1);
  });