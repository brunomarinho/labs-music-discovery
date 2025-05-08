// Artist recommendations component
import { getLLMResponse } from '../services/llm-service.js';
import { cacheArtistRecommendations, getCachedArtistRecommendations } from '../services/cache-service.js';
import { searchArtistByName, searchAlbumByName } from '../services/spotify-service.js';

/**
 * Fetch recommendations from server cache
 * @param {string} artistId - The artist ID
 * @returns {Promise<Array>} Array of recommendations
 */
async function fetchServerCachedRecommendations(artistId) {
    if (!artistId) return null;
    
    try {
        const response = await fetch(`/api/cached-recommendations/${artistId}`);
        
        if (!response.ok) {
            console.log(`Server returned ${response.status} when fetching recommendations for ${artistId}`);
            return null;
        }
        
        const data = await response.json();
        console.log(`Got recommendation data from server for ${artistId}:`, typeof data, Array.isArray(data) ? 'array with ' + data.length + ' items' : 'not array');
        
        // Handle success response with data array
        if (data && data.success === true && data.data) {
            console.log(`Found data in .data property (${typeof data.data})`);
            return data.data;
        }
        
        // Handle direct array in response (no wrapper)
        if (Array.isArray(data)) {
            console.log(`Found array directly in response (${data.length} items)`);
            return data;
        }
        
        console.log('Server returned unexpected format for recommendations:', data);
        return null;
    } catch (error) {
        console.error('Error fetching recommendations from server:', error);
        return null;
    }
}

export async function loadArtistRecommendations(artistData, apiKey, forceRefresh = false) {
    if (!artistData) {
        console.error('Artist data missing');
        return;
    }
    
    // Get DOM elements with fallback error handling
    const recommendationsSection = document.getElementById('artistRecommendations');
    if (!recommendationsSection) {
        console.error('Artist recommendations section not found');
        return;
    }
    
    const recommendationsContent = document.getElementById('recommendationsContent');
    if (!recommendationsContent) {
        console.error('Recommendations content element not found');
        return;
    }
    
    const lockedContent = document.getElementById('recommendationsLockedContent');
    if (!lockedContent) {
        console.error('Locked content element not found');
        return;
    }
    
    // Get refresh button - it should already exist in the HTML now
    const refreshButton = document.getElementById('refreshRecommendations');
    if (!refreshButton) {
        console.warn('Refresh button not found in the DOM');
        // Continue anyway since this isn't critical
    }
    
    // First check if we have cached data - before even checking API key
    // This ensures we display cached data without API key prompts
    const cachedRecommendations = getCachedArtistRecommendations(artistData.id);
    const hasCachedRecommendations = cachedRecommendations && cachedRecommendations.length > 0;
    
    // Check server cache if no local cache
    let serverCachedRecommendations = null;
    if (!hasCachedRecommendations && !forceRefresh) {
        try {
            serverCachedRecommendations = await fetchServerCachedRecommendations(artistData.id);
        } catch (err) {
            console.warn('Error checking server cache:', err);
        }
    }
    
    const hasServerCachedData = serverCachedRecommendations && 
                             ((Array.isArray(serverCachedRecommendations) && serverCachedRecommendations.length > 0) ||
                              (serverCachedRecommendations.data && Array.isArray(serverCachedRecommendations.data) && 
                               serverCachedRecommendations.data.length > 0));
    
    // Make sure we unhide the content section and hide the locked content
    recommendationsContent.classList.remove('hidden');
    lockedContent.classList.add('hidden');
    recommendationsSection.classList.remove('locked');
    
    // Only show refresh button if we have an API key
    // (even if we're using cached data, only show refresh if we can generate new data)
    if (refreshButton) {
        if (apiKey) {
            refreshButton.classList.remove('hidden');
        } else {
            refreshButton.classList.add('hidden');
        }
        
        // Set up refresh button click handler
        refreshButton.onclick = () => {
            loadArtistRecommendations(artistData, apiKey, true);
        };
    }
    
    try {
        // Add loading state
        recommendationsContent.innerHTML = `
            <div class="spinner-container">
                <div class="spinner"></div>
            </div>
        `;
        
        // Check local cache first (unless forcing refresh)
        if (!forceRefresh) {
            // We already checked for cachedRecommendations above, so reuse that result
            if (hasCachedRecommendations) {
                console.log('Using locally cached recommendations for', artistData.name);
                await displayRecommendations(cachedRecommendations, recommendationsContent);
                return;
            }
            
            // If no local cache, try to get from server (we already checked above)
            if (hasServerCachedData) {
                console.log('Using server-cached recommendations for', artistData.name);
                
                // Validate format and extract the data array if needed
                let validRecommendations = serverCachedRecommendations;
                
                // Handle different possible formats from server
                if (!Array.isArray(serverCachedRecommendations) && serverCachedRecommendations.data && Array.isArray(serverCachedRecommendations.data)) {
                    validRecommendations = serverCachedRecommendations.data;
                    console.log('Extracted recommendations from nested data property');
                }
                
                if (Array.isArray(validRecommendations) && validRecommendations.length > 0) {
                    // Cache the data locally
                    cacheArtistRecommendations(artistData.id, validRecommendations);
                    await displayRecommendations(validRecommendations, recommendationsContent);
                    return;
                }
                
                console.log('Server returned recommendations but in an unusable format:', typeof serverCachedRecommendations);
            } else {
                console.log('No server-cached recommendations found for', artistData.name);
            }
        } else if (apiKey) {
            // Only clear cache if forcing refresh AND we have an API key
            import('../services/cache-service.js').then(cacheModule => {
                cacheModule.clearLLMCache(artistData.id);
                console.log('Cleared recommendations cache for', artistData.name);
            });
        }
        
        // If we don't have cached data AND we don't have an API key, we can't proceed
        if (!apiKey) {
            console.error('No API key available to fetch fresh recommendations');
            displayRecommendationsError(recommendationsContent, apiKey);
            return;
        }
        
        // If we get here, we need to use the API key to get recommendations
        try {
            // Construct prompt for the LLM
            const prompt = generateRecommendationsPrompt(artistData);
            
            // Get recommendations from LLM
            console.log('Fetching fresh recommendations for', artistData.name);
            const recommendationsText = await getLLMResponse(prompt, apiKey);
            
            // Parse the recommendations
            const recommendations = parseRecommendations(recommendationsText);
            
            // Cache the result
            cacheArtistRecommendations(artistData.id, recommendations);
            
            // Display the recommendations
            await displayRecommendations(recommendations, recommendationsContent);
        } catch (error) {
            console.error('Error getting recommendations with API key:', error);
            displayRecommendationsError(recommendationsContent, apiKey);
        }
    } catch (error) {
        console.error('Error loading artist recommendations:', error);
        displayRecommendationsError(recommendationsContent, apiKey);
    }
}

function generateRecommendationsPrompt(artistData) {
    // Add more context about the artist to help generate more accurate recommendations
    const genres = artistData.genres && artistData.genres.length > 0 
        ? `Known for music in these genres: ${artistData.genres.join(', ')}` 
        : '';
    
    // Get current date info for precise timeframes
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.toLocaleString('default', { month: 'long' });
    const lastYear = currentYear - 1;
    
    return `You are a music expert with access to the latest web information. Your task is to find the MOST CURRENT music recommendations from ${artistData.name}.

    ===== CRITICAL INSTRUCTIONS =====
    1. You MUST search the web for the most up-to-date information
    2. PRIORITIZE recommendations from the past 12 months (since ${currentMonth} ${lastYear})
    3. You MUST verify the date of each recommendation and include it
    4. If you can find 4+ recent recommendations from the past 12 months, use those only
    5. If you find fewer than 4 recent recommendations, include older notable recommendations to reach a total of 4-6 items
    6. Use sources like interviews, social media, podcast appearances, and news articles
    7. Check multiple sources to find the most recent and significant recommendations
    8. MOST IMPORTANTLY, for social media sources, you MUST include the exact account handle (e.g., @artistname) or URL
    
    ===== TASK DETAILS =====
    Research and find music, albums, or artists that ${artistData.name} has explicitly recommended to their fans through interviews, social media posts, podcast appearances, or other public statements. PRIORITIZE recommendations from the past 12 months, but include older ones if needed to reach a total of 4-6 items.
    
    Artist context: ${artistData.name} is a professional musician. ${genres}
    
    ===== SEARCH GUIDANCE =====
    - Search for: "${artistData.name} recommends music ${currentYear}"
    - Search for: "${artistData.name} favorite artists ${currentYear}"
    - Search for: "${artistData.name} interview music recommendations ${currentMonth} ${currentYear}"
    - Search for: "${artistData.name} social media music recommendations ${currentYear}"
    - Search for: "${artistData.name} instagram @handle music" or "${artistData.name} twitter @handle music"
    
    ===== OUTPUT FORMAT =====
    Create a JSON array with 4-6 of the MOST RECENT recommendations with these fields:
    - name: The name of the recommended artist or album (if album, include format "Album Title by Artist Name")
    - type: Either "artist" or "album"
    - description: A direct quote or accurate paraphrase of what ${artistData.name} said about this music
    - year: The specific year when they made this recommendation (${lastYear}-${currentYear})
    - month: The specific month when they made this recommendation (required)
    - source: EXACTLY where this recommendation was made, with SPECIFIC details for easy verification:
        * For Instagram/Twitter/social media: include the exact handle (@username) or full URL
        * For YouTube: include the channel name and video title if possible
        * For interviews: include publication name, interviewer, and date
        * For podcasts: include podcast name, episode number/title, and date
    
    Example format:
    [
      {
        "name": "SZA",
        "type": "artist",
        "description": "Praised her vocal techniques and songwriting, calling her 'one of the most innovative artists in music right now' and mentioned being inspired by her approach to genre-blending.",
        "year": "${currentYear}",
        "month": "May",
        "source": "Interview with Rolling Stone by John Smith, May ${currentYear}. Article titled 'The Future of Music'"
      },
      {
        "name": "Midnights by Taylor Swift",
        "type": "album",
        "description": "Called it 'a masterclass in storytelling and production' and shared it on their Instagram story, encouraging fans to listen to it.",
        "year": "${currentYear}",
        "month": "February",
        "source": "Instagram Story from @${artistData.name.toLowerCase().replace(/\s+/g, '')}, February ${currentYear}"
      },
      {
        "name": "Frank Ocean",
        "type": "artist",
        "description": "Shared that Frank's approach to production has been a huge influence on their recent work.",
        "year": "${currentYear}",
        "month": "January",
        "source": "YouTube interview on MusicTalks channel (youtube.com/@MusicTalks), episode titled 'In the Studio with ${artistData.name}'"
      }
    ]
    
    Return ONLY the JSON array with no additional text or commentary.`;
}

function parseRecommendations(text) {
    try {
        // Handle null or empty responses immediately
        if (!text || typeof text !== 'string') {
            console.warn('Received null or non-string response:', text);
            return createDefaultRecommendations();
        }
        
        // Try to extract JSON if the response has additional text
        let jsonStr = text;
        
        // First try to clean the text for better JSON extraction
        // Sometimes there might be markdown code blocks or other formatting
        const cleanedText = text.replace(/```json|```/g, '').trim();
        
        // Find JSON array within the text if needed - using a more precise regex first
        const preciseJsonMatch = cleanedText.match(/\[\s*\{\s*"name"[\s\S]*?\}\s*\]/s);
        if (preciseJsonMatch) {
            jsonStr = preciseJsonMatch[0];
            try {
                const recommendations = JSON.parse(jsonStr);
                if (Array.isArray(recommendations) && recommendations.length > 0) {
                    console.log('Found recommendations with precise match');
                    return processRecommendations(recommendations);
                }
            } catch (preciseError) {
                console.warn('Failed to parse recommendations with precise match:', preciseError);
            }
        }
        
        // Try more general match if precise match fails
        const jsonMatch = cleanedText.match(/\[\s*\{.*\}\s*\]/s);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
            try {
                const recommendations = JSON.parse(jsonStr);
                
                // Validate the structure
                if (Array.isArray(recommendations)) {
                    return processRecommendations(recommendations);
                } else {
                    throw new Error('Recommendations is not an array');
                }
            } catch (error) {
                console.warn('Failed standard JSON array parsing:', error);
                
                // Try one more time with a less greedy regex if the more inclusive one failed
                const cautiosJsonMatch = cleanedText.match(/\[\s*\{[\s\S]*?\}\s*\]/);
                if (cautiosJsonMatch) {
                    try {
                        const cautiosRecs = JSON.parse(cautiosJsonMatch[0]);
                        if (Array.isArray(cautiosRecs)) {
                            console.log('Found recommendations with cautious match');
                            return processRecommendations(cautiosRecs);
                        }
                    } catch (cautiosError) {
                        console.warn('Failed cautious parsing too:', cautiosError);
                    }
                }
                
                // If we still have no valid JSON, throw the original error
                throw error;
            }
        }
        
        // If we couldn't match JSON with regex, we need to handle two cases:
        // 1. The response might still be valid JSON but not matching our patterns
        // 2. The response might be a text explanation that no recommendations were found
        
        try {
            // Try to parse the whole text as JSON
            const recommendations = JSON.parse(cleanedText);
            
            // Validate the structure
            if (Array.isArray(recommendations)) {
                return processRecommendations(recommendations);
            } else {
                throw new Error('Recommendations is not an array');
            }
        } catch (parseError) {
            console.warn('Failed full text parsing:', parseError);
            
            // Check if this is a "no recommendations found" message
            if (cleanedText.includes("couldn't find") || 
                cleanedText.includes("could not find") ||
                cleanedText.includes("no recommendations") ||
                cleanedText.includes("unable to find") ||
                cleanedText.includes("doesn't have") ||
                cleanedText.includes("has not made") ||
                cleanedText.includes("no recent recommendations")) {
                
                console.log('LLM response indicates no recommendations were found');
                
                // Try to extract any mentioned artists or albums from the text
                // This is a fallback to create some recommendations even when none were explicitly found
                const recommendations = extractRecommendationsFromText(cleanedText);
                
                if (recommendations.length > 0) {
                    console.log('Extracted fallback recommendations from text:', recommendations);
                    return processRecommendations(recommendations);
                }
                
                // Return an empty array which will show "No recommendations found"
                return [];
            }
            
            // If all fails, return a generic error recommendation
            return createDefaultRecommendations();
        }
    } catch (error) {
        console.error('Failed to parse recommendations:', error);
        console.error('Original text:', text);
        
        return createDefaultRecommendations();
    }
}

/**
 * Process recommendations by adding extracted URLs and source info
 */
function processRecommendations(recommendations) {
    // Make sure we have valid recommendations
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
        return createDefaultRecommendations();
    }
    
    // Process source URLs if they exist in the source field
    recommendations.forEach(recommendation => {
        // Check if source contains a URL and extract it
        if (recommendation.source) {
            const urlMatch = recommendation.source.match(/https?:\/\/[^\s"')]+/);
            if (urlMatch) {
                recommendation.sourceUrl = urlMatch[0];
            } else {
                // Try to detect if it's a specific source that could be searched
                const sourceInfo = extractSourceInfo(recommendation.source);
                if (sourceInfo) {
                    recommendation.sourceInfo = sourceInfo;
                }
            }
        }
    });
    
    return recommendations;
}

function createDefaultRecommendations() {
    return [{
        name: 'Data unavailable',
        type: 'error',
        description: 'We encountered an issue retrieving recommendations. Please try again later.',
        year: '',
        source: 'API error'
    }];
}

/**
 * Attempt to extract recommendations from text when the LLM responds with a message instead of JSON
 */
function extractRecommendationsFromText(text) {
    const recommendations = [];
    
    // Look for artist or album mentions in the text
    // This uses a series of patterns to find potential recommendations even in plain text
    
    // Look for artist mentions using markers like "mentioned", "admiration for", "expressed admiration"
    const artistPatterns = [
        /(?:mentioned|admiration for|praised|enjoys|likes|loves|appreciates|admires|enjoys listening to|recommends)\s+(?:artist|band|musician|singer)?\s+([A-Z][A-Za-z\s&']+)(?=\.|,|\s+and|\s+as)/g,
        /(?:fan of|influenced by|inspired by)\s+(?:artist|band|musician|singer)?\s+([A-Z][A-Za-z\s&']+)(?=\.|,|\s+and|\s+as)/g,
        /([A-Z][A-Za-z\s&']+?)\s+(?:is|was|has been|had been) (?:a major influence|an influence|influential)/g
    ];
    
    // Look for album mentions
    const albumPatterns = [
        /(?:album|release|record)\s+"([^"]+)"\s+by\s+([A-Z][A-Za-z\s&']+)/g,
        /([A-Z][A-Za-z\s&']+)'s\s+(?:album|release|record)\s+"([^"]+)"/g,
        /(?:album|release|record)\s+(?:called|titled)\s+"([^"]+)"\s+by\s+([A-Z][A-Za-z\s&']+)/g
    ];
    
    // Extract years
    const yearPattern = /\b(19\d{2}|20\d{2})\b/g;
    const years = Array.from(text.matchAll(yearPattern), m => m[1]);
    const mostRecentYear = years.length > 0 ? Math.max(...years.map(Number)) : new Date().getFullYear() - 1;
    
    // Process artist mentions
    artistPatterns.forEach(pattern => {
        const matches = Array.from(text.matchAll(pattern));
        matches.forEach(match => {
            const artistName = match[1].trim();
            if (artistName.length > 2 && !artistName.match(/^(and|the|he|she|they|his|her|their)$/i)) {
                // Extract a short excerpt around this mention for context
                const startPos = Math.max(0, match.index - 100);
                const endPos = Math.min(text.length, match.index + 100);
                const excerpt = text.substring(startPos, endPos);
                
                recommendations.push({
                    name: artistName,
                    type: 'artist',
                    description: `Mentioned in the context: "${excerpt.trim()}"`,
                    year: String(mostRecentYear),
                    month: '',
                    source: 'Extracted from API response'
                });
            }
        });
    });
    
    // Process album mentions
    albumPatterns.forEach(pattern => {
        const matches = Array.from(text.matchAll(pattern));
        matches.forEach(match => {
            const albumName = match[1].trim();
            const artistName = match[2] ? match[2].trim() : '';
            
            if (albumName.length > 2) {
                // Format as "Album by Artist" if we have both
                const name = artistName ? `${albumName} by ${artistName}` : albumName;
                
                // Extract a short excerpt around this mention for context
                const startPos = Math.max(0, match.index - 100);
                const endPos = Math.min(text.length, match.index + 100);
                const excerpt = text.substring(startPos, endPos);
                
                recommendations.push({
                    name: name,
                    type: 'album',
                    description: `Mentioned in the context: "${excerpt.trim()}"`,
                    year: String(mostRecentYear),
                    month: '',
                    source: 'Extracted from API response'
                });
            }
        });
    });
    
    // Deduplicate recommendations
    const uniqueRecommendations = [];
    const seenNames = new Set();
    
    for (const rec of recommendations) {
        if (!seenNames.has(rec.name.toLowerCase())) {
            seenNames.add(rec.name.toLowerCase());
            uniqueRecommendations.push(rec);
        }
    }
    
    return uniqueRecommendations.slice(0, 6); // Limit to 6 items
}

/**
 * Extract structured source information from a text description
 */
function extractSourceInfo(sourceText) {
    if (!sourceText) return null;
    
    // First, look for any explicit URLs in the text
    const urlPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)(?:\/[^\s)"]*)*/g;
    const urlMatches = Array.from(sourceText.matchAll(urlPattern));
    
    if (urlMatches.length > 0) {
        // Process the first URL match
        let url = urlMatches[0][0];
        
        // Make sure it has http/https prefix
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }
        
        // Determine the platform
        if (url.includes('instagram.com')) {
            return {
                type: 'instagram',
                platform: 'Instagram',
                directUrl: url,
                searchQuery: `Instagram ${extractArtistName(sourceText)} music recommendation`
            };
        } 
        else if (url.includes('twitter.com') || url.includes('x.com')) {
            return {
                type: 'twitter',
                platform: 'Twitter/X',
                directUrl: url,
                searchQuery: `Twitter ${extractArtistName(sourceText)} music recommendation`
            };
        }
        else if (url.includes('youtube.com') || url.includes('youtu.be')) {
            return {
                type: 'youtube',
                platform: 'YouTube',
                directUrl: url,
                searchQuery: `YouTube ${extractArtistName(sourceText)} music recommendation`
            };
        }
        else if (url.includes('spotify.com')) {
            return {
                type: 'spotify',
                platform: 'Spotify',
                directUrl: url,
                searchQuery: `Spotify ${extractArtistName(sourceText)}`
            };
        }
        else if (url.includes('apple.com') || url.includes('music.apple.com')) {
            return {
                type: 'apple_music',
                platform: 'Apple Music',
                directUrl: url,
                searchQuery: `Apple Music ${extractArtistName(sourceText)}`
            };
        }
        else {
            // For other URLs (news sites, blogs, etc.)
            return {
                type: 'website',
                platform: getWebsiteName(url),
                directUrl: url,
                searchQuery: `${getWebsiteName(url)} ${extractArtistName(sourceText)} music recommendation`
            };
        }
    }
    
    // Try to find specific platforms and extract handle/username info
    
    // Extract Instagram handle or URL with potential post ID
    const instagramPostMatch = sourceText.match(/instagram\.com\/p\/([a-zA-Z0-9_-]+)/i);
    if (instagramPostMatch) {
        const postId = instagramPostMatch[1];
        return {
            type: 'instagram',
            platform: 'Instagram',
            postId,
            directUrl: `https://www.instagram.com/p/${postId}/`,
            searchQuery: `Instagram post ${postId}`
        };
    }
    
    // Extract Instagram handle
    const instagramProfileMatch = sourceText.match(/(instagram\.com\/[a-zA-Z0-9_.]+|@[a-zA-Z0-9_.]+\s+on\s+instagram|instagram\s+@[a-zA-Z0-9_.]+)/i);
    if (instagramProfileMatch) {
        let handle = instagramProfileMatch[0];
        // Extract just the username from various formats
        const usernameMatch = handle.match(/@([a-zA-Z0-9_.]+)|instagram\.com\/([a-zA-Z0-9_.]+)/i);
        let username = '';
        if (usernameMatch) {
            username = usernameMatch[1] || usernameMatch[2];
            // Direct link to the profile
            return {
                type: 'instagram',
                platform: 'Instagram',
                username,
                directUrl: `https://www.instagram.com/${username}/`,
                searchQuery: `Instagram ${username} music recommendation`
            };
        }
    }
    
    // Extract Twitter/X handle or URL with potential tweet ID
    const twitterPostMatch = sourceText.match(/twitter\.com\/[a-zA-Z0-9_]+\/status\/([0-9]+)/i);
    if (twitterPostMatch) {
        const tweetId = twitterPostMatch[1];
        const usernameMatch = sourceText.match(/twitter\.com\/([a-zA-Z0-9_]+)\/status/i);
        const username = usernameMatch ? usernameMatch[1] : '';
        
        return {
            type: 'twitter',
            platform: 'Twitter/X',
            tweetId,
            username,
            directUrl: username ? 
                `https://twitter.com/${username}/status/${tweetId}` : 
                `https://twitter.com/i/web/status/${tweetId}`,
            searchQuery: `Twitter tweet ${tweetId}`
        };
    }
    
    // Extract Twitter/X handle
    const twitterProfileMatch = sourceText.match(/twitter\.com\/[a-zA-Z0-9_]+|x\.com\/[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+\s+on\s+(twitter|x)|tweet\s+from\s+@[a-zA-Z0-9_]+|(twitter|x)\s+@[a-zA-Z0-9_]+/i);
    if (twitterProfileMatch) {
        let handle = twitterProfileMatch[0];
        // Extract just the username from various formats
        const usernameMatch = handle.match(/@([a-zA-Z0-9_]+)|(twitter|x)\.com\/([a-zA-Z0-9_]+)/i);
        let username = '';
        if (usernameMatch) {
            username = usernameMatch[1] || usernameMatch[3];
            // Direct link to the profile
            return {
                type: 'twitter',
                platform: 'Twitter/X',
                username,
                directUrl: `https://twitter.com/${username}`,
                searchQuery: `${username} Twitter music recommendation`
            };
        }
    }
    
    // YouTube specific video
    const youtubeVideoMatch = sourceText.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/i);
    if (youtubeVideoMatch) {
        const videoId = youtubeVideoMatch[1];
        return {
            type: 'youtube',
            platform: 'YouTube',
            videoId,
            directUrl: `https://www.youtube.com/watch?v=${videoId}`,
            searchQuery: `YouTube video ${videoId}`
        };
    }
    
    // YouTube channel or general video mention
    const youtubeChannelMatch = sourceText.match(/youtube\.com\/(@[a-zA-Z0-9_\-]+)|youtube\.com\/(c\/[a-zA-Z0-9_\-]+)|youtube\.com\/(channel\/[a-zA-Z0-9_\-]+)/i);
    if (youtubeChannelMatch) {
        const channelID = youtubeChannelMatch[1] || youtubeChannelMatch[2] || youtubeChannelMatch[3];
        return {
            type: 'youtube',
            platform: 'YouTube',
            channel: channelID,
            directUrl: `https://www.youtube.com/${channelID}`,
            searchQuery: `YouTube ${channelID} music recommendation`
        };
    }
    
    // Generic YouTube mention with show name
    const youtubeShowMatch = sourceText.match(/(?:youtube|youtube\.com)\b.*\b(show|channel|interview|podcast).*\b([A-Z][a-zA-Z0-9\s]+)\b/i) || 
                       sourceText.match(/\b([A-Z][a-zA-Z0-9\s]+)\b.*\b(show|channel|interview|podcast).*\b(?:youtube|youtube\.com)\b/i);
                       
    if (youtubeShowMatch) {
        const showName = youtubeShowMatch[2] || youtubeShowMatch[1];
        if (showName && showName.length > 3 && !/^(show|channel|interview|podcast)$/i.test(showName)) {
            return {
                type: 'youtube',
                platform: 'YouTube',
                show: showName.trim(),
                directUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(showName.trim())}`,
                searchQuery: `${showName.trim()} YouTube music recommendation`
            };
        }
    }
    
    // Spotify playlist
    if (sourceText.toLowerCase().includes('spotify playlist')) {
        // See if there's a playlist name
        const playlistMatch = sourceText.match(/playlist\s+[\"\'"]([^\"\'"]*)[\"\'"]/i) || 
                            sourceText.match(/playlist\s+named\s+[\"\'"]?([^\"\'".,]*)[\"\'".,]?/i) ||
                            sourceText.match(/playlist\s+called\s+[\"\'"]?([^\"\'".,]*)[\"\'".,]?/i);
        
        if (playlistMatch) {
            const playlistName = playlistMatch[1].trim();
            return {
                type: 'spotify',
                platform: 'Spotify',
                playlist: playlistName,
                directUrl: `https://open.spotify.com/search/${encodeURIComponent(playlistName)}`,
                searchQuery: `Spotify playlist ${playlistName}`
            };
        }
        
        return {
            type: 'spotify',
            platform: 'Spotify',
            directUrl: 'https://open.spotify.com',
            searchQuery: `Spotify playlist ${extractArtistName(sourceText)}`
        };
    }
    
    // Extract source from common publications/interviews
    const publicationMatch = sourceText.match(/(?:interview|article|feature)\s+(?:with|in|on|for)\s+([A-Z][A-Za-z0-9\s&'.,"-]+)/i) ||
                           sourceText.match(/([A-Z][A-Za-z0-9\s&'.,"-]+)\s+(?:interview|article|podcast|magazine)/i);
    
    if (publicationMatch) {
        const publication = publicationMatch[1].trim();
        // Check for publication name followed by URL or domain
        const pubUrlMatch = sourceText.match(new RegExp(`(?:https?://)?(?:www\\.)?([a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)+)`, 'i'));
        
        if (pubUrlMatch) {
            let domain = pubUrlMatch[1];
            const url = pubUrlMatch[0].startsWith('http') ? pubUrlMatch[0] : `https://${pubUrlMatch[0]}`;
            
            return {
                type: 'publication',
                platform: publication,
                publication,
                directUrl: url,
                searchQuery: `${publication} interview ${extractArtistName(sourceText)}`
            };
        }
        
        // No URL but we have publication name
        return {
            type: 'publication',
            platform: publication,
            publication,
            searchQuery: `${publication} interview ${extractArtistName(sourceText)}`
        };
    }
    
    // Define patterns for common sources
    const patterns = [
        {
            // Interview with publication
            regex: /interview\s+(?:with|for|in)\s+([\w\s]+)(?:,\s+|\s+\()([\w\s]+)?\s*(\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\w+\s+\d{4})/i,
            process: (matches) => {
                const publication = matches[1].trim();
                const date = matches[2] ? matches[2].trim() + ' ' + matches[3].trim() : matches[3].trim();
                
                return {
                    type: 'interview',
                    publication,
                    date,
                    searchQuery: `${publication} interview ${extractArtistName(sourceText)} ${date}`
                };
            }
        },
        {
            // Podcast appearance
            regex: /(podcast|show|episode)\s+(?:with|on|of)\s+([\w\s]+)/i,
            process: (matches) => {
                const podcastName = matches[2].trim();
                
                return {
                    type: 'podcast',
                    name: podcastName,
                    searchQuery: `${podcastName} podcast ${extractArtistName(sourceText)}`
                };
            }
        },
        {
            // Social media post with date (generic match if specific didn't catch it above)
            regex: /(instagram|twitter|x|facebook|tiktok)\s+(post|story|video|reel|live)(?:,\s+|\s+\(|\s+|\.)+([\w\s]+)?\s*(\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\w+\s+\d{4})/i,
            process: (matches) => {
                const platform = matches[1].trim();
                const contentType = matches[2].trim();
                const date = matches[3] ? matches[3].trim() + ' ' + matches[4].trim() : matches[4].trim();
                const artist = extractArtistName(sourceText);
                
                // Create a more specific search query
                return {
                    type: 'social_media',
                    platform,
                    contentType,
                    date,
                    searchQuery: `${platform} ${contentType} ${artist} music recommendation ${date}`
                };
            }
        }
    ];
    
    // Try each pattern
    for (const pattern of patterns) {
        const matches = sourceText.match(pattern.regex);
        if (matches) {
            return pattern.process(matches);
        }
    }
    
    // If no pattern matches, return a more specific search query
    return {
        type: 'generic',
        text: sourceText,
        searchQuery: `${extractArtistName(sourceText)} music recommendation ${sourceText}`
    };
}

/**
 * Helper to extract artist name from recommendation source text
 */
function extractArtistName(sourceText) {
    // This function tries to identify the artist name from the source text
    // First, look for common patterns
    const artistMatch = sourceText.match(/recommendation\s+(?:from|by)\s+([A-Z][a-zA-Z0-9\s]+)/) ||
                      sourceText.match(/([A-Z][a-zA-Z0-9\s]+)(?:'s)?\s+(?:recommendation|interview)/);
    
    if (artistMatch) {
        return artistMatch[1].trim();
    }
    
    // If no specific match, get the artist name from the page
    return document.getElementById('artistName')?.textContent || '';
}

/**
 * Get website name from a URL
 */
function getWebsiteName(url) {
    try {
        // Extract the domain name without protocol and www
        const domain = url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
        
        // Split by dots and get the main domain part
        const parts = domain.split('.');
        if (parts.length >= 2) {
            // For domains like "something.medium.com", return "Medium"
            if (parts.length > 2 && parts[parts.length - 2].toLowerCase() === 'medium') {
                return 'Medium';
            }
            
            // Return the main part with first letter capitalized
            const mainPart = parts[parts.length - 2];
            return mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
        }
        
        return domain;
    } catch (e) {
        return 'Website';
    }
}

/**
 * Get actual image URL for a recommendation from Spotify
 */
async function getSpotifyImageUrl(recommendation) {
    try {
        if (recommendation.type === 'artist') {
            const artist = await searchArtistByName(recommendation.name);
            if (artist && artist.images && artist.images.length > 0) {
                return {
                    imageUrl: artist.images[0].url,
                    spotifyUrl: artist.external_urls ? artist.external_urls.spotify : null
                };
            }
        } else if (recommendation.type === 'album') {
            // Extract artist name if album format is "Album by Artist"
            let artistName = '';
            const byMatch = recommendation.name.match(/(.+)\s+by\s+(.+)/i);
            
            if (byMatch) {
                const albumName = byMatch[1].trim();
                artistName = byMatch[2].trim();
                const album = await searchAlbumByName(albumName, artistName);
                
                if (album && album.images && album.images.length > 0) {
                    return {
                        imageUrl: album.images[0].url,
                        spotifyUrl: album.external_urls ? album.external_urls.spotify : null
                    };
                }
            } else {
                // Try searching just by album name
                const album = await searchAlbumByName(recommendation.name);
                if (album && album.images && album.images.length > 0) {
                    return {
                        imageUrl: album.images[0].url,
                        spotifyUrl: album.external_urls ? album.external_urls.spotify : null
                    };
                }
            }
        }
    } catch (error) {
        console.error(`Error getting image for ${recommendation.name}:`, error);
    }
    
    // Return null if no image found or on error
    return { imageUrl: null, spotifyUrl: null };
}

async function displayRecommendations(recommendations, container) {
    container.innerHTML = '';
    
    // Handle different data formats from server vs client
    if (!Array.isArray(recommendations) && recommendations.data && Array.isArray(recommendations.data)) {
        console.log('Extracting recommendations from data property');
        recommendations = recommendations.data;
    }
    
    if (!recommendations || recommendations.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'message-box empty-state';
        emptyMessage.innerHTML = `
            <h3>No recommendations found</h3>
            <p>We couldn't find any music recommendations from this artist.</p>
            <p class="empty-message-note">The artist may not have publicly shared music recommendations recently.</p>
        `;
        container.appendChild(emptyMessage);
        return;
    }
    
    // Filter out error recommendations
    recommendations = recommendations.filter(rec => rec && rec.type !== 'error');
    
    // If we filtered everything out, show the error message
    if (recommendations.length === 0) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'message-box error-state';
        errorMessage.innerHTML = `
            <h3>Error retrieving recommendations</h3>
            <p>We encountered a problem while retrieving recommendations.</p>
            <p class="empty-message-note">Please try again later or try another artist.</p>
        `;
        container.appendChild(errorMessage);
        return;
    }
    
    // Check if we have recent or older recommendations
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    
    const hasRecentRecommendations = recommendations.some(rec => {
        // Handle possible non-numeric years
        const recYear = parseInt(rec.year);
        if (isNaN(recYear)) return false;
        return recYear >= lastYear;
    });
    
    // Add header with appropriate messaging
    const headerEl = document.createElement('div');
    headerEl.className = 'recommendations-header';
    
    if (hasRecentRecommendations) {
        headerEl.innerHTML = `<p>Recent recommendations from the past 12 months</p>`;
    } else {
        headerEl.innerHTML = `
            <p>Recommendations from this artist</p>
            <span class="recommendations-note">No recommendations found from the past 12 months, showing older recommendations</span>
        `;
    }
    
    container.appendChild(headerEl);
    
    // Create recommendations grid
    const gridEl = document.createElement('div');
    gridEl.className = 'recommendations-grid';
    container.appendChild(gridEl);
    
    // Process recommendations one by one to fetch their images
    for (const recommendation of recommendations) {
        const recommendationCard = document.createElement('div');
        recommendationCard.className = 'recommendation-card';
        
        // Generate placeholder image based on type
        let svgIcon;
        if (recommendation.type === 'artist') {
            svgIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="%23777" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21v-2a7 7 0 0 0-14 0v2"/></svg>';
        } else if (recommendation.type === 'album') {
            svgIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="%23777" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>';
        } else {
            svgIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="%23777" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>';
        }
        
        // Try to get a real image from Spotify
        const { imageUrl, spotifyUrl } = await getSpotifyImageUrl(recommendation);
        
        // Format date tag based on month and year
        let dateTag = '';
        if (recommendation.month && recommendation.year) {
            dateTag = `<span class="year-tag">${recommendation.month} ${recommendation.year}</span>`;
        } else if (recommendation.year) {
            dateTag = `<span class="year-tag">${recommendation.year}</span>`;
        }
        
        // Prepare source HTML
        let sourceHTML = '';
        if (recommendation.source) {
            // If we have a direct source URL from the response
            if (recommendation.sourceUrl) {
                sourceHTML = `<div class="card-source">
                    <small>Source: <a href="${recommendation.sourceUrl}" target="_blank" class="source-link">${recommendation.source} <span class="link-icon">↗</span></a></small>
                </div>`;
            }
            // If we have extracted source info for search with a direct URL
            else if (recommendation.sourceInfo && recommendation.sourceInfo.directUrl) {
                sourceHTML = `<div class="card-source">
                    <small>Source: <a href="${recommendation.sourceInfo.directUrl}" target="_blank" class="source-link">${recommendation.source} <span class="link-icon">↗</span></a></small>
                </div>`;
            }
            // If we have extracted source info for search
            else if (recommendation.sourceInfo) {
                const searchURL = `https://www.google.com/search?q=${encodeURIComponent(recommendation.sourceInfo.searchQuery)}`;
                
                // Format based on source type
                if (recommendation.sourceInfo.type === 'social_media' || 
                    recommendation.sourceInfo.type === 'instagram' || 
                    recommendation.sourceInfo.type === 'twitter' || 
                    recommendation.sourceInfo.type === 'youtube' || 
                    recommendation.sourceInfo.type === 'spotify') {
                    
                    const platformName = recommendation.sourceInfo.platform || recommendation.sourceInfo.type.charAt(0).toUpperCase() + recommendation.sourceInfo.type.slice(1);
                    let detailText = '';
                    
                    if (recommendation.sourceInfo.username) {
                        detailText = `@${recommendation.sourceInfo.username}`;
                    } else if (recommendation.sourceInfo.date) {
                        detailText = recommendation.sourceInfo.date;
                    }
                    
                    sourceHTML = `<div class="card-source">
                        <small>Source: ${recommendation.source} <a href="${searchURL}" target="_blank" class="search-source-link">[${platformName} ${detailText} <span class="link-icon">↗</span>]</a></small>
                    </div>`;
                } else {
                    sourceHTML = `<div class="card-source">
                        <small>Source: ${recommendation.source} <a href="${searchURL}" target="_blank" class="search-source-link">[Search <span class="link-icon">↗</span>]</a></small>
                    </div>`;
                }
            }
            // Fallback to just showing the source text
            else {
                sourceHTML = `<div class="card-source"><small>Source: ${recommendation.source}</small></div>`;
            }
        }
        
        // Determine if we have source links
        let hasSourceLink = recommendation.sourceUrl || 
                           (recommendation.sourceInfo && recommendation.sourceInfo.directUrl);
        let sourceLink = recommendation.sourceUrl || 
                        (recommendation.sourceInfo && recommendation.sourceInfo.directUrl) || 
                        (recommendation.sourceInfo && `https://www.google.com/search?q=${encodeURIComponent(recommendation.sourceInfo.searchQuery)}`);
        
        // Create action buttons HTML
        let actionButtonsHTML = '';
        if (spotifyUrl || sourceLink) {
            actionButtonsHTML = `<div class="card-actions">`;
            
            if (spotifyUrl) {
                actionButtonsHTML += `
                    <a href="${spotifyUrl}" target="_blank" class="spotify-link" title="Open in Spotify">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                        </svg>
                    </a>
                `;
            }
            
            if (sourceLink) {
                actionButtonsHTML += `
                    <a href="${sourceLink}" target="_blank" class="source-button" title="View Source">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                    </a>
                `;
            }
            
            actionButtonsHTML += `</div>`;
        }

        // Create simplified card with image and name at bottom
        recommendationCard.innerHTML = `
            <div class="card-image-container">
                ${imageUrl ? 
                    `<img src="${imageUrl}" alt="${recommendation.name}" loading="lazy" class="card-image-main">` : 
                    `<div class="placeholder-image">${svgIcon}</div>`
                }
                ${actionButtonsHTML}
                ${dateTag}
            </div>
            <div class="card-simple-info">
                <div class="card-name">${recommendation.name}</div>
                <div class="card-type">
                    <span>${recommendation.type === 'artist' ? 'Artist' : 'Album'}</span>
                </div>
            </div>
            <div class="card-details">
                <div class="card-quote">${recommendation.description}</div>
                ${sourceHTML}
            </div>
        `;
        
        // Make sure action buttons still work
        const actionButtons = recommendationCard.querySelectorAll('.card-actions a');
        if (actionButtons.length > 0) {
            actionButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            });
        }
        
        // Add click event to make card clickable for Spotify if URL is available
        if (spotifyUrl) {
            recommendationCard.style.cursor = 'pointer';
            recommendationCard.addEventListener('click', (e) => {
                // Only trigger if not clicking a specific button or link
                if (!e.target.closest('a') && !e.target.closest('button')) {
                    window.open(spotifyUrl, '_blank');
                }
            });
        }
        
        gridEl.appendChild(recommendationCard);
    }
}

function displayRecommendationsError(container, apiKey = null) {
    container.innerHTML = '';
    
    const errorMessage = document.createElement('div');
    
    if (apiKey) {
        // Error when we had an API key but generation failed
        errorMessage.className = 'alert alert-error';
        errorMessage.innerHTML = `
            <h3>Generation Error</h3>
            <p>We couldn't generate recommendations for this artist using the AI service.</p>
            <p>This could be due to:</p>
            <ul>
                <li>API key validation issues</li>
                <li>Temporary service unavailability</li>
                <li>Limited information available for this artist</li>
            </ul>
            <p>You can try again later or try another artist.</p>
        `;
    } else {
        // Error when no API key and no cached data
        errorMessage.className = 'message-box info-state';
        errorMessage.innerHTML = `
            <h3>No Recommendations Available</h3>
            <p>We don't have cached recommendations for this artist yet.</p>
            <p>You can:</p>
            <ul>
                <li>Provide an OpenAI API key to generate recommendations</li>
                <li>Try one of our featured artists with pre-cached data</li>
                <li>Check back later as we continue to add more artists to our cache</li>
            </ul>
            <div class="text-center mt-3">
                <button class="btn btn-primary add-api-key-btn">Add API Key</button>
            </div>
        `;
    }
    
    container.appendChild(errorMessage);
    
    // Add event listener to API key button if it exists
    const apiKeyButton = errorMessage.querySelector('.add-api-key-btn');
    if (apiKeyButton) {
        apiKeyButton.addEventListener('click', () => {
            // Show the API key modal
            document.getElementById('apiKeyModal').style.display = 'block';
        });
    }
}