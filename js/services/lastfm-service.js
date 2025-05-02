// Last.fm API Service

// API constants
const API_BASE_URL = 'http://localhost:3000/api/lastfm';

/**
 * Fetches artist information including biography from Last.fm
 * @param {string} artistName - Name of the artist to search for
 * @returns {Promise<Object>} - Artist information including biography
 */
export async function getArtistInfo(artistName) {
    if (!artistName) {
        throw new Error('Artist name is required');
    }
    
    try {
        // Use server proxy to make the request
        const url = `${API_BASE_URL}?method=artist.getinfo&artist=${encodeURIComponent(artistName)}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(`Last.fm API error: ${data.message}`);
        }
        
        return data.artist;
    } catch (error) {
        console.error('Error fetching artist info from Last.fm:', error);
        throw error;
    }
}

/**
 * Extract and clean up the biography from Last.fm artist info
 * @param {Object} artistInfo - Artist information from Last.fm
 * @returns {string} - Cleaned biography text
 */
export function extractArtistBio(artistInfo) {
    if (!artistInfo || !artistInfo.bio || !artistInfo.bio.content) {
        return '';
    }
    
    // Get the content and clean it up
    let bio = artistInfo.bio.content;
    
    // Remove the "Read more on Last.fm" part and URLs
    bio = bio.replace(/<a href=".*">Read more about .* on Last\.fm<\/a>\.?/i, '');
    bio = bio.replace(/Read more on Last\.fm\.?/i, '');
    
    // Remove any HTML tags
    bio = bio.replace(/<[^>]*>/g, '');
    
    // Trim whitespace
    bio = bio.trim();
    
    return bio;
}

/**
 * Simple function to get just the biography for an artist
 * @param {string} artistName - Name of the artist
 * @returns {Promise<string>} - Artist biography text
 */
export async function getArtistBiography(artistName) {
    try {
        const artistInfo = await getArtistInfo(artistName);
        return extractArtistBio(artistInfo);
    } catch (error) {
        console.error('Error getting artist biography:', error);
        return '';
    }
}