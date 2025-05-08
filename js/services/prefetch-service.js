// Prefetch Service
// Handle the prefetching of artist data, recommendations, and influences

import { loadArtistData, searchArtistByName } from './spotify-service.js';
import { getLLMResponse } from './llm-service.js';
import { 
    bulkCacheArtistData, 
    bulkCacheArtistRecommendations, 
    bulkCacheArtistInfluences,
    getPrefetchStatus,
    setPrefetchStatus,
    cacheArtistData
} from './cache-service.js';
import { setArtistId } from '../data/featured-artists.js';

/**
 * Check if data prefetching has already been completed
 * @returns {boolean} Whether prefetching is already done
 */
export function isPrefetchCompleted() {
    const status = getPrefetchStatus();
    return status && status.data && status.data.completed;
}

/**
 * Prefetch artist data for a list of artists - works with names or IDs
 * @param {Array} artistNamesOrIds - Array of artist names or IDs to prefetch
 * @returns {Promise<Array>} Promise resolving to array of fetched artist data
 */
export async function prefetchArtistData(artistNamesOrIds) {
    if (!artistNamesOrIds || !Array.isArray(artistNamesOrIds) || artistNamesOrIds.length === 0) {
        console.warn('No artist names or IDs provided for prefetching');
        return [];
    }
    
    console.log(`Starting prefetch for ${artistNamesOrIds.length} artists...`);
    
    try {
        const artistsData = [];
        
        // Process each artist sequentially
        for (const nameOrId of artistNamesOrIds) {
            try {
                let artistData;
                
                // Check if this is a Spotify ID (22 characters, alphanumeric)
                const isSpotifyId = /^[a-zA-Z0-9]{22}$/i.test(nameOrId);
                
                if (isSpotifyId) {
                    // Load directly by ID
                    artistData = await loadArtistData(nameOrId);
                } else {
                    // It's a name, search for it first
                    console.log(`Searching for artist by name: ${nameOrId}`);
                    artistData = await searchArtistByName(nameOrId);
                }
                
                if (artistData && artistData.id) {
                    artistsData.push(artistData);
                    
                    // Cache the artist data
                    cacheArtistData(artistData.id, artistData);
                    
                    // Update the name-to-id mapping
                    setArtistId(artistData.name, artistData.id);
                    
                    console.log(`Prefetched and cached artist: ${artistData.name} (${artistData.id})`);
                } else {
                    console.warn(`Could not find artist: ${nameOrId}`);
                }
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error(`Error prefetching artist "${nameOrId}":`, error);
            }
        }
        
        return artistsData;
    } catch (error) {
        console.error('Error prefetching artist data:', error);
        return [];
    }
}

/**
 * Prefetch LLM-based recommendations and influences for a list of artists
 * @param {Array} artistsData - Array of artist data objects
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<boolean>} Promise resolving to success status
 */
/**
 * Fetch artist data from server cache by name
 * @param {string} artistName - Artist name to look up
 * @returns {Promise<Object|null>} Artist data or null if not found
 */
export async function fetchServerCachedArtist(artistName) {
    if (!artistName) return null;
    
    try {
        // The server endpoint may not exist, so we'll fail gracefully
        try {
            // Try fetching from the server if the endpoint exists
            const response = await fetch(`/api/cached-artist-by-name/${encodeURIComponent(artistName)}`);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.success && data.data) {
                    return data.data;
                }
            }
        } catch (serverError) {
            // Silently fail if server endpoint doesn't exist
            console.log(`Server cache doesn't have endpoint for artist name lookup: ${artistName}`);
        }
        
        // If we get here, the server endpoint doesn't exist or didn't return valid data
        return null;
    } catch (error) {
        console.warn(`Error fetching artist data for ${artistName} from server:`, error);
        return null;
    }
}

export async function prefetchLLMData(artistsData, apiKey) {
    if (!apiKey) {
        console.warn('No API key provided for LLM prefetching');
        return false;
    }
    
    if (!artistsData || !Array.isArray(artistsData) || artistsData.length === 0) {
        console.warn('No artist data provided for LLM prefetching');
        return false;
    }
    
    try {
        const recommendations = {};
        const influences = {};
        
        // Process each artist sequentially to avoid rate limits
        for (const artist of artistsData) {
            if (artist && artist.id && artist.name) {
                // Generate the prompts
                const recommendationsPrompt = generateRecommendationsPrompt(artist.name);
                const influencesPrompt = generateInfluencesPrompt(artist.name);
                
                // Fetch recommendations
                try {
                    const recommendationsData = await getLLMResponse(recommendationsPrompt, apiKey);
                    recommendations[artist.id] = parseJsonResponse(recommendationsData);
                    console.log(`Prefetched recommendations for ${artist.name}`);
                } catch (e) {
                    console.error(`Error prefetching recommendations for ${artist.name}:`, e);
                }
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Fetch influences
                try {
                    const influencesData = await getLLMResponse(influencesPrompt, apiKey);
                    influences[artist.id] = parseJsonResponse(influencesData);
                    console.log(`Prefetched influences for ${artist.name}`);
                } catch (e) {
                    console.error(`Error prefetching influences for ${artist.name}:`, e);
                }
                
                // Longer delay between artists
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // Cache the data
        const recSuccess = bulkCacheArtistRecommendations(recommendations);
        const infSuccess = bulkCacheArtistInfluences(influences);
        
        // Mark prefetch as completed
        if (recSuccess || infSuccess) {
            setPrefetchStatus(true);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error during LLM prefetching:', error);
        return false;
    }
}

/**
 * Generate a prompt for artist recommendations
 * @param {string} artistName - Name of the artist
 * @returns {string} Prompt for LLM
 */
function generateRecommendationsPrompt(artistName) {
    return `What music has ${artistName} publicly recommended to others in interviews, social media, etc?

Please return a JSON array where each item has these properties:
- name: The name of the recommended artist, album, or song
- type: Either "artist", "album", or "song"
- description: A short description of the recommendation and context
- year: The year when the recommendation was made (if known, otherwise "")
- month: The month when the recommendation was made (if known, otherwise "")
- source: Where this recommendation was found (interview name, social media platform, etc.)

Focus ONLY on the MOST RECENT recommendations from the past 12 months. Include a maximum of 10 recommendations and prioritize the most recent ones.`;
}

/**
 * Generate a prompt for artist influences
 * @param {string} artistName - Name of the artist
 * @returns {string} Prompt for LLM
 */
function generateInfluencesPrompt(artistName) {
    return `Who are the key musical influences of ${artistName}?

Please return a JSON array where each item has these properties:
- name: The name of the influential artist
- genre: The primary genre/style of this influential artist
- impact: A short description of how they influenced ${artistName}
- connection: The specific connection, such as "vocal technique", "songwriting", "guitar style", etc.

Include up to 8 influences, prioritizing those explicitly mentioned by ${artistName} themselves.`;
}

/**
 * Parse JSON from LLM response, handling potential issues
 * @param {string} response - Raw response from LLM
 * @returns {Array} Parsed array or empty array if invalid
 */
function parseJsonResponse(response) {
    if (!response) return [];
    
    try {
        // Check if the response is wrapped in markdown code blocks
        let jsonContent = response;
        
        // Handle markdown code blocks
        if (response.includes('```json')) {
            jsonContent = response.split('```json')[1].split('```')[0].trim();
        } else if (response.includes('```')) {
            jsonContent = response.split('```')[1].split('```')[0].trim();
        }
        
        // Parse the JSON
        return JSON.parse(jsonContent);
    } catch (error) {
        console.error('Error parsing LLM response:', error);
        console.log('Invalid response:', response);
        return [];
    }
}