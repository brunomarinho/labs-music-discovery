require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const cache = require('./server-cache'); // Import the server cache module

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins during development
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// API credentials from environment variables
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const LASTFM_API_KEY = process.env.LASTFM_API_KEY || 'REPLACE_WITH_LASTFM_API_KEY';
let spotifyToken = null;
let tokenExpiration = 0;

// Get Spotify access token
async function getSpotifyToken() {
  // Check if token is still valid
  if (spotifyToken && Date.now() < tokenExpiration) {
    return spotifyToken;
  }

  try {
    // Request new token
    const response = await axios({
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      params: {
        grant_type: 'client_credentials',
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')
      }
    });

    spotifyToken = response.data.access_token;
    // Set expiration slightly before actual expiry to be safe
    tokenExpiration = Date.now() + (response.data.expires_in * 1000) - 60000;
    return spotifyToken;
  } catch (error) {
    console.error('Error getting Spotify token:', error.message);
    throw new Error('Failed to authenticate with Spotify');
  }
}

// Spotify API proxy endpoint
app.get('/api/spotify/*', async (req, res) => {
  try {
    const endpoint = req.params[0];
    const queryParams = req.query;
    
    // Get token
    const token = await getSpotifyToken();
    
    // Make request to Spotify API
    const response = await axios({
      method: 'get',
      url: `https://api.spotify.com/v1/${endpoint}`,
      params: queryParams,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Spotify API error:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data || 'Unknown error'
    });
  }
});

// Featured artists API endpoint
app.get('/api/featured', (req, res) => {
  try {
    const featuredArtists = cache.getHomepageFeaturedArtists();
    
    res.json({
      success: true,
      data: featuredArtists
    });
  } catch (error) {
    console.error('Error fetching featured artists:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch featured artists'
    });
  }
});

// Pre-cached artist data API endpoint
app.get('/api/cached-artist/:id', (req, res) => {
  try {
    const artistId = req.params.id;
    if (!artistId) {
      return res.status(400).json({
        success: false,
        error: 'Artist ID is required'
      });
    }
    
    const artistData = cache.getArtistData(artistId);
    if (!artistData) {
      return res.status(404).json({
        success: false,
        error: 'Artist not found in cache'
      });
    }
    
    res.json({
      success: true,
      data: artistData
    });
  } catch (error) {
    console.error('Error fetching cached artist data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch artist data from cache'
    });
  }
});

// Pre-cached artist data by name API endpoint
app.get('/api/cached-artist-by-name/:name', (req, res) => {
  try {
    const artistName = req.params.name;
    if (!artistName) {
      return res.status(400).json({
        success: false,
        error: 'Artist name is required'
      });
    }
    
    const artistData = cache.getArtistByName(artistName);
    if (!artistData) {
      return res.status(404).json({
        success: false,
        error: 'Artist not found in cache'
      });
    }
    
    res.json({
      success: true,
      data: artistData
    });
  } catch (error) {
    console.error('Error fetching cached artist data by name:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch artist data from cache'
    });
  }
});

// Pre-cached recommendations API endpoint
app.get('/api/cached-recommendations/:id', (req, res) => {
  try {
    const artistId = req.params.id;
    if (!artistId) {
      return res.status(400).json({
        success: false,
        error: 'Artist ID is required'
      });
    }
    
    const recommendations = cache.getArtistRecommendations(artistId);
    if (!recommendations) {
      return res.status(404).json({
        success: false,
        error: 'Recommendations not found in cache'
      });
    }
    
    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Error fetching cached recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recommendations from cache'
    });
  }
});

// Pre-cached influences API endpoint
app.get('/api/cached-influences/:id', (req, res) => {
  try {
    const artistId = req.params.id;
    if (!artistId) {
      return res.status(400).json({
        success: false,
        error: 'Artist ID is required'
      });
    }
    
    const influences = cache.getArtistInfluences(artistId);
    if (!influences) {
      return res.status(404).json({
        success: false,
        error: 'Influences not found in cache'
      });
    }
    
    res.json({
      success: true,
      data: influences
    });
  } catch (error) {
    console.error('Error fetching cached influences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch influences from cache'
    });
  }
});

// Cache management endpoint (admin only)
app.post('/api/admin/cache/rebuild', (req, res) => {
  // This should be protected by an admin auth mechanism in production
  const { adminKey } = req.body;
  
  if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized'
    });
  }
  
  // Trigger cache rebuild in the background
  const { exec } = require('child_process');
  exec('node cache-builder.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`Cache rebuild error: ${error}`);
    }
    console.log(`Cache rebuild output: ${stdout}`);
    if (stderr) {
      console.error(`Cache rebuild stderr: ${stderr}`);
    }
  });
  
  res.json({
    success: true,
    message: 'Cache rebuild started in the background'
  });
});

// Serve the main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Last.fm API proxy endpoint
app.get('/api/lastfm/*', async (req, res) => {
  try {
    const endpoint = req.params[0];
    const queryParams = req.query;
    
    // Add API key to the request
    queryParams.api_key = LASTFM_API_KEY;
    queryParams.format = 'json';
    
    // Build the URL
    const url = new URL(`https://ws.audioscrobbler.com/2.0/`);
    Object.keys(queryParams).forEach(key => {
      url.searchParams.append(key, queryParams[key]);
    });
    
    // Make request to Last.fm API
    const response = await axios({
      method: 'get',
      url: url.toString()
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Last.fm API error:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data || 'Unknown error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Spotify API credentials loaded: ID=${SPOTIFY_CLIENT_ID ? 'YES' : 'NO'}, Secret=${SPOTIFY_CLIENT_SECRET ? 'YES' : 'NO'}`);
  console.log(`Last.fm API key loaded: ${LASTFM_API_KEY ? 'YES' : 'NO'}`);
  
  // Log cache status
  const featuredArtists = cache.getHomepageFeaturedArtists();
  console.log(`Server cache initialized with ${featuredArtists.length} featured artists`);
  console.log(`To populate cache, run: node cache-builder.js`);
  
  // If the cache is empty and we have Spotify credentials, suggest running the cache builder
  if (featuredArtists.length === 0 && SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET) {
    console.log('\n⚠️  Featured artists cache is empty!');
    console.log('Run the following command to build the cache:');
    console.log('  node cache-builder.js');
    console.log('\nTo include LLM-generated data (needs OpenAI API key):');
    console.log('  node cache-builder.js --with-llm-data <YOUR_OPENAI_API_KEY>\n');
  }
});