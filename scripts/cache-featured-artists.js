/**
 * This script caches recommendations for featured artists
 * Run with: npm run cache
 * 
 * Options:
 * --debug    Enable verbose logging
 * --force    Force refresh of all artists
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const fetch = require('node-fetch');

// Simple logger with level control
const logger = {
  level: 'info',
  
  setLevel(level) {
    this.level = level;
  },
  
  debug(...args) {
    if (this.level === 'debug') {
      console.log('[DEBUG]', ...args);
    }
  },
  
  log(...args) {
    console.log(...args);
  },
  
  warn(...args) {
    console.warn('[WARNING]', ...args);
  },
  
  error(...args) {
    console.error('[ERROR]', ...args);
  }
};

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
  // Get only basic artist details
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
  
  // Return only the minimal required data
  return {
    id: artistData.id,
    name: artistData.name,
    image: artistData.images.length > 0 ? artistData.images[0].url : null
  };
}

// OpenAI helper - Uses the same format as the main app for consistency
async function getArtistRecommendations(artistName, artistId) {
  // System prompt for web search
  const systemPrompt = `You are a music-industry research specialist with full websearch access. ` +
    `Find the MOST RECENT (past 12 months) instances where ${artistName} has ` +
    `EXPLICITLY recommended another artist, album, or song—only in interviews, podcasts, ` +
    `YouTube videos, or social-media posts (no hearsay). ` +
    `For each entry you must:` +
    `\n  • Verify that the sourceUrl responds over HTTPS with HTTP 200.` +
    `\n  • Only use domains ending in .com, .org, or .net.` +
    `\n  • Extract: name, type (artist|album|song), exact quote, year, month, source type, domain, author (if known).` +
    `\nCRITICAL:` +
    `\n 1) Output only valid JSON: an array starting with "[" and ending with "]".` +
    `\n 2) Do NOT wrap in code fences or add any text before/after.` +
    `\n 3) If nothing is found, return \`[]\` exactly.`;

  // User prompt for web search
  const userPrompt = `Search for instances in the last 12 months where ${artistName}${artistId ? ` (id: ${artistId})` : ''} ` +
    `has explicitly recommended music to others (artist, album, or song) in interviews, ` +
    `podcasts, YouTube videos, or social-media posts.  

     For each recommendation, verify that the URL:  
     • Uses HTTPS  
     • Returns HTTP status 200  
     • Is on a .com, .org, or .net domain  

     Output **only** a JSON array of objects with exactly these fields:
     [
       {
         "name":        "Artist/Album/Song Name",
         "type":        "artist|album|song",
         "quote":       "Exact excerpt of recommendation",
         "year":        "YYYY",
         "month":       "MM",
         "source":      "Interview|Podcast|YouTube|Social media",
         "domain":      "example.com", 
         "author":      "Interviewer or poster name (if known)",
         "sourceUrl":   "https://…"
       },
       …
     ]

     **IMPORTANT:**
     - Do not include any text before or after the JSON.
     - If any record fails URL or domain validation, omit it.
     - If you find no valid recommendations, return \`[]\`.`;

  console.log(`Making OpenAI request for artist ${artistName}${artistId ? ` (${artistId})` : ''}`);
  
  // Create the OpenAI chat completion with web search
  const response = await openai.chat.completions.create({
    model: "gpt-4o-search-preview",  // Use gpt-4o-search-preview for all requests
    messages: [
      { 
        role: "system", 
        content: systemPrompt
      },
      { 
        role: "user", 
        content: userPrompt
      }
    ],
    max_tokens: 4000,
    web_search_options: {
      search_context_size: "medium"  // Balanced context, cost, and latency
    }
  });

  // Extract response content
  const responseText = response.choices[0].message.content;
  
  // Handle any text before or after the JSON array
  let jsonString = responseText.trim();
  
  // If response has backticks or other formatting, extract just the JSON part
  if (jsonString.includes('```')) {
    jsonString = jsonString.split('```')[1].replace('json', '').trim();
  }
  
  try {
    // Parse and validate the JSON
    const recommendations = JSON.parse(jsonString);
    
    // Validate the response structure
    if (!Array.isArray(recommendations)) {
      throw new Error('Invalid response format - not an array');
    }
    
    // If no recommendations found, return empty array
    if (recommendations.length === 0) {
      console.log(`No recommendations found for ${artistName}`);
      return [];
    }
    
    // Validate the recommendations have the required fields
    const validatedRecommendations = recommendations.filter(rec => {
      const hasRequiredFields = rec.name && rec.type && (rec.quote || rec.reason);
      const validType = ['artist', 'album', 'song'].includes(rec.type.toLowerCase());
      return hasRequiredFields && validType;
    });
    
    // Return up to 10 recommendations
    return validatedRecommendations.slice(0, 10);
  } catch (parseError) {
    console.error('Error parsing OpenAI response:', parseError);
    console.error('Raw response:', responseText);
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
async function cacheFeaturedArtists(options = {}) {
  const { debug = false, force = false } = options;
  
  try {
    // Load featured artists list
    const featuredArtistsPath = path.join(__dirname, '..', 'data', 'featured-artists.json');
    const featuredArtists = JSON.parse(fs.readFileSync(featuredArtistsPath, 'utf8'));

    console.log(`Found ${featuredArtists.length} featured artists to cache`);
    
    if (force) {
      console.log('Force refresh enabled - will update all artists regardless of cache status');
    }

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
        
        // If artist is cached and we're not forcing a refresh
        if (cachedArtist && !force) {
          console.log(`${artistName} already cached, updating...`);
          
          // Get fresh data
          const artistDetails = await getArtistDetails(artistId, token);
          const recommendations = await getArtistRecommendations(artistName, artistId);
          
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
          const recommendations = await getArtistRecommendations(artistName, artistId);
          
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

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  debug: args.includes('--debug'),
  force: args.includes('--force')
};

// Configure logger based on debug flag
if (options.debug) {
  logger.setLevel('debug');
  console.log('Debug mode enabled');
}

// Run the script with options
cacheFeaturedArtists(options)
  .then(() => {
    console.log('Cache script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Cache script failed:', error);
    process.exit(1);
  });