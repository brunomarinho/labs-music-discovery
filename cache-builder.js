/**
 * Cache Builder Script
 * 
 * This script can be run to build the server-side cache for featured artists.
 * It fetches artist data from Spotify and (optionally) generates recommendations
 * and influences using the OpenAI API.
 * 
 * Usage: 
 *   - Basic: node cache-builder.js
 *   - With LLM data: node cache-builder.js --with-llm-data <API_KEY>
 */

require('dotenv').config();
const axios = require('axios');
const cache = require('./server-cache');

// OpenAI API configuration
const OPENAI_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
let openAiApiKey = null;

// Command line args
const args = process.argv.slice(2);
const withLlmData = args.includes('--with-llm-data');
if (withLlmData) {
    const keyIndex = args.indexOf('--with-llm-data') + 1;
    if (args[keyIndex] && !args[keyIndex].startsWith('--')) {
        openAiApiKey = args[keyIndex];
    } else {
        console.error('Error: OpenAI API key must be provided with --with-llm-data flag');
        process.exit(1);
    }
}

// Spotify API access
let spotifyToken = null;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

/**
 * Get Spotify API token
 */
async function getSpotifyToken() {
    try {
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
        
        return response.data.access_token;
    } catch (error) {
        console.error('Error getting Spotify token:', error.message);
        throw new Error('Failed to authenticate with Spotify');
    }
}

/**
 * Search for an artist by name using Spotify API
 */
async function searchArtistByName(artistName) {
    if (!spotifyToken) {
        spotifyToken = await getSpotifyToken();
    }
    
    try {
        // Use exact match with quotes
        const exactQuery = `"${artistName}"`;
        const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(exactQuery)}&type=artist&limit=5`;
        
        const response = await axios({
            method: 'get',
            url: url,
            headers: {
                'Authorization': `Bearer ${spotifyToken}`
            }
        });
        
        const items = response.data.artists.items;
        
        if (items.length > 0) {
            // Look for exact match
            const exactMatch = items.find(artist => 
                artist.name.toLowerCase() === artistName.toLowerCase()
            );
            
            if (exactMatch) {
                return exactMatch;
            }
            
            // Return first result if no exact match
            return items[0];
        }
        
        // If no results, try without quotes
        const looseUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=5`;
        
        const looseResponse = await axios({
            method: 'get',
            url: looseUrl,
            headers: {
                'Authorization': `Bearer ${spotifyToken}`
            }
        });
        
        const looseItems = looseResponse.data.artists.items;
        
        if (looseItems.length > 0) {
            return looseItems[0];
        }
        
        console.log(`No results found for artist: ${artistName}`);
        return null;
    } catch (error) {
        console.error(`Error searching for artist "${artistName}":`, error.message);
        // If token expired, get a new one and retry
        if (error.response && error.response.status === 401) {
            console.log('Token expired, getting new token...');
            spotifyToken = await getSpotifyToken();
            return searchArtistByName(artistName);
        }
        return null;
    }
}

/**
 * Generate recommendations prompt for LLM
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

// Influences functionality has been removed

/**
 * Get recommendations or influences using OpenAI API
 */
async function getLLMResponse(prompt) {
    if (!openAiApiKey) {
        throw new Error('OpenAI API key not provided');
    }
    
    try {
        console.log(`Making LLM API request: ${prompt.substring(0, 50)}...`);
        
        const requestData = {
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'You are a music knowledge expert that provides accurate information about artists, their influences, and their recommendations. Format your responses according to the user\'s requested format. ALWAYS RESPOND WITH VALID JSON when asked for JSON format.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7
        };
        
        const response = await axios({
            method: 'POST',
            url: OPENAI_API_ENDPOINT,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openAiApiKey}`
            },
            data: requestData
        });
        
        const content = response.data.choices[0].message.content;
        return parseJsonResponse(content);
    } catch (error) {
        console.error('Error making LLM API request:', error.message);
        return [];
    }
}

/**
 * Parse JSON response from LLM
 */
function parseJsonResponse(response) {
    if (!response) return [];
    
    try {
        // Extract JSON part (handle markdown code blocks)
        let jsonContent = response;
        
        if (response.includes('```json')) {
            jsonContent = response.split('```json')[1].split('```')[0].trim();
        } else if (response.includes('```')) {
            jsonContent = response.split('```')[1].split('```')[0].trim();
        }
        
        return JSON.parse(jsonContent);
    } catch (error) {
        console.error('Error parsing LLM response:', error);
        return [];
    }
}

/**
 * Main function to build the cache
 */
async function buildCache() {
    console.log('Starting cache build process...');
    
    // Get all artist names
    const artistNames = cache.getAllArtistNames();
    console.log(`Building cache for ${artistNames.length} artists`);
    
    // Process each artist
    for (const artistName of artistNames) {
        console.log(`\nProcessing artist: ${artistName}`);
        
        try {
            // Search for artist on Spotify
            const artistData = await searchArtistByName(artistName);
            
            if (!artistData) {
                console.log(`Could not find artist: ${artistName}`);
                continue;
            }
            
            console.log(`Found artist: ${artistData.name} (${artistData.id})`);
            
            // Save artist data to cache
            cache.saveArtistData(artistData.id, artistData);
            
            // Generate LLM data if requested
            if (withLlmData && openAiApiKey) {
                console.log(`Generating LLM data for ${artistName}...`);
                
                // Get recommendations
                const recommendationsPrompt = generateRecommendationsPrompt(artistName);
                const recommendations = await getLLMResponse(recommendationsPrompt);
                
                if (recommendations && recommendations.length > 0) {
                    console.log(`Got ${recommendations.length} recommendations for ${artistName}`);
                    cache.saveArtistRecommendations(artistData.id, recommendations);
                }
                
                // Longer delay between artists to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        } catch (error) {
            console.error(`Error processing artist ${artistName}:`, error);
        }
    }
    
    console.log('\nCache build complete!');
}

// Run the cache builder
buildCache().then(() => {
    console.log('Cache build process finished!');
}).catch(error => {
    console.error('Error during cache build:', error);
});