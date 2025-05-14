require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

async function getSpotifyToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
    },
    body: params
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error('Failed to get Spotify access token: ' + data.error);
  }

  return data.access_token;
}

async function searchArtist(name, token) {
  const response = await fetch(
    'https://api.spotify.com/v1/search?q=' + encodeURIComponent(name) + '&type=artist&limit=1',
    {
      headers: { 'Authorization': 'Bearer ' + token }
    }
  );
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error('Spotify search error: ' + (data.error?.message || 'Unknown error'));
  }
  
  if (!data.artists.items.length) {
    throw new Error('No artist found for "' + name + '"');
  }
  
  console.log(JSON.stringify(data.artists.items[0], null, 2));
}

(async () => {
  try {
    const token = await getSpotifyToken();
    await searchArtist('Steven Wilson', token);
  } catch (error) {
    console.error('Error:', error);
  }
})();