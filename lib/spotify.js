import SpotifyWebApi from 'spotify-web-api-js';
import logger from './logger';

// Spotify API client for browser usage (needs user token)
export const spotifyClient = new SpotifyWebApi();

// Set the access token for the client
export const setAccessToken = (token) => {
  spotifyClient.setAccessToken(token);
};

// For server-side Spotify API requests (client credentials flow)
export async function getServerAccessToken() {
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

// Server-side search for artists
export async function searchArtist(query, limit = 5) {
  try {
    const token = await getServerAccessToken();
    
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Spotify search error: ${data.error?.message || 'Unknown error'}`);
    }
    
    return data.artists.items.map(artist => ({
      id: artist.id,
      name: artist.name,
      image: artist.images.length > 0 ? artist.images[0].url : null,
      uri: artist.uri
    }));
  } catch (error) {
    logger.error('Error searching artists:', error);
    throw error;
  }
}

// Get full artist details by ID
export async function getArtistDetails(artistId) {
  try {
    const token = await getServerAccessToken();
    
    // Get only the minimal artist details
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
    
    // Return only name and image
    return {
      id: artistData.id,
      name: artistData.name,
      image: artistData.images.length > 0 ? artistData.images[0].url : null
    };
  } catch (error) {
    logger.error('Error getting artist details:', error);
    throw error;
  }
}

// Generate a URL for Spotify authentication
export function getSpotifyAuthUrl() {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/spotify';
  const scopes = ['user-read-private', 'user-read-email'];
  
  return 'https://accounts.spotify.com/authorize' +
    '?response_type=code' +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&scope=${encodeURIComponent(scopes.join(' '))}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    '&show_dialog=true';
}