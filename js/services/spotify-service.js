// Spotify API Service
import { loadCachedApiKey } from './cache-service.js';

// API constants
const API_BASE_URL = 'http://localhost:3000/api/spotify';

// Make request to Spotify API via server proxy
async function spotifyRequest(endpoint, method = 'GET', body = null) {
    try {
        // Build the URL with query parameters if they exist
        let url = `${API_BASE_URL}/${endpoint.startsWith('/') ? endpoint.substring(1) : endpoint}`;
        
        // Build request options
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (body && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(body);
        }
        
        console.log(`Making ${method} request to Spotify API via proxy: ${url}`);
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error making request to Spotify API:', error);
        throw error;
    }
}

// Search for artists
export async function searchArtists(query, limit = 5) {
    if (!query) return [];
    
    try {
        const response = await spotifyRequest(`/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}`);
        return response.artists.items;
    } catch (error) {
        console.error('Error searching artists:', error);
        return [];
    }
}

// Search for artist by exact name
export async function searchArtistByName(artistName, limit = 5) {
    if (!artistName) return null;
    
    try {
        // First try a more strict search with quotation marks for exact match
        const exactQuery = `"${artistName}"`;
        const response = await spotifyRequest(`/search?q=${encodeURIComponent(exactQuery)}&type=artist&limit=${limit}`);
        
        if (response.artists.items.length > 0) {
            // Look for exact name match
            const exactMatch = response.artists.items.find(artist => 
                artist.name.toLowerCase() === artistName.toLowerCase()
            );
            
            if (exactMatch) {
                return exactMatch;
            }
            
            // Return first result if no exact match
            return response.artists.items[0];
        }
        
        // If exact match failed, try a normal search
        const looseResponse = await spotifyRequest(`/search?q=${encodeURIComponent(artistName)}&type=artist&limit=${limit}`);
        
        if (looseResponse.artists.items.length > 0) {
            return looseResponse.artists.items[0];
        }
        
        return null;
    } catch (error) {
        console.error(`Error searching for artist "${artistName}":`, error);
        return null;
    }
}

// Search for album by name and optional artist
export async function searchAlbumByName(albumName, artistName = '', limit = 5) {
    if (!albumName) return null;
    
    try {
        let query = albumName;
        
        // Add artist name to the query if provided
        if (artistName) {
            query = `${albumName} artist:${artistName}`;
        }
        
        // Try exact match first
        const exactQuery = `"${query}"`;
        const response = await spotifyRequest(`/search?q=${encodeURIComponent(exactQuery)}&type=album&limit=${limit}`);
        
        if (response.albums.items.length > 0) {
            // Look for exact album name match
            const exactMatch = response.albums.items.find(album => 
                album.name.toLowerCase() === albumName.toLowerCase()
            );
            
            if (exactMatch) {
                return exactMatch;
            }
            
            // Return first result if no exact match
            return response.albums.items[0];
        }
        
        // If exact match failed, try a normal search
        const looseResponse = await spotifyRequest(`/search?q=${encodeURIComponent(query)}&type=album&limit=${limit}`);
        
        if (looseResponse.albums.items.length > 0) {
            return looseResponse.albums.items[0];
        }
        
        return null;
    } catch (error) {
        console.error(`Error searching for album "${albumName}":`, error);
        return null;
    }
}

// Get artist data
export async function loadArtistData(artistId) {
    if (!artistId) throw new Error('Artist ID is required');
    
    try {
        const response = await spotifyRequest(`/artists/${artistId}`);
        return response;
    } catch (error) {
        console.error('Error loading artist data:', error);
        throw error;
    }
}

// Get artist albums
export async function getArtistAlbums(artistId, limit = 20) {
    if (!artistId) throw new Error('Artist ID is required');
    
    try {
        const response = await spotifyRequest(`/artists/${artistId}/albums?limit=${limit}&include_groups=album,single&market=US`);
        return response.items;
    } catch (error) {
        console.error('Error loading artist albums:', error);
        throw error;
    }
}

// Get artist's top tracks
export async function getArtistTopTracks(artistId, market = 'US') {
    if (!artistId) throw new Error('Artist ID is required');
    
    try {
        const response = await spotifyRequest(`/artists/${artistId}/top-tracks?market=${market}`);
        return response.tracks;
    } catch (error) {
        console.error('Error loading artist top tracks:', error);
        throw error;
    }
}

// Get related artists
export async function getRelatedArtists(artistId) {
    if (!artistId) throw new Error('Artist ID is required');
    
    try {
        const response = await spotifyRequest(`/artists/${artistId}/related-artists`);
        return response.artists;
    } catch (error) {
        console.error('Error loading related artists:', error);
        throw error;
    }
}

// Fallback mock data for when API is unavailable
const mockArtists = [
    {
        id: 'artist1',
        name: 'Taylor Swift',
        images: [
            { url: 'https://i.scdn.co/image/ab6761610000e5eb5a00969a4698c3132a15fbb0', height: 640, width: 640 },
            { url: 'https://i.scdn.co/image/ab6761610000e5eb5a00969a4698c3132a15fbb0', height: 320, width: 320 },
            { url: 'https://i.scdn.co/image/ab6761610000e5eb5a00969a4698c3132a15fbb0', height: 160, width: 160 }
        ],
        followers: { total: 72000000 },
        genres: ['pop', 'country pop'],
        popularity: 100,
        external_urls: { spotify: 'https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf02' }
    },
    {
        id: 'artist2',
        name: 'Drake',
        images: [
            { url: 'https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9', height: 640, width: 640 },
            { url: 'https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9', height: 320, width: 320 },
            { url: 'https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9', height: 160, width: 160 }
        ],
        followers: { total: 65000000 },
        genres: ['canadian hip hop', 'rap'],
        popularity: 99,
        external_urls: { spotify: 'https://open.spotify.com/artist/3TVXtAsR1Inumwj472S9r4' }
    },
    {
        id: 'artist3',
        name: 'Beyoncé',
        images: [
            { url: 'https://i.scdn.co/image/ab6761610000e5eb12e3f20d05a8d2e899a98931', height: 640, width: 640 },
            { url: 'https://i.scdn.co/image/ab6761610000e5eb12e3f20d05a8d2e899a98931', height: 320, width: 320 },
            { url: 'https://i.scdn.co/image/ab6761610000e5eb12e3f20d05a8d2e899a98931', height: 160, width: 160 }
        ],
        followers: { total: 43000000 },
        genres: ['pop', 'r&b'],
        popularity: 97,
        external_urls: { spotify: 'https://open.spotify.com/artist/6vWDO969PvNqNYHIOW5v0m' }
    }
];