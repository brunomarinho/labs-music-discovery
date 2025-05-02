require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

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
});