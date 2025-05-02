// Artist recommendations component
import { getLLMResponse } from '../services/llm-service.js';
import { cacheArtistRecommendations, getCachedArtistRecommendations } from '../services/cache-service.js';
import { searchArtistByName, searchAlbumByName } from '../services/spotify-service.js';

export async function loadArtistRecommendations(artistData, apiKey, forceRefresh = false) {
    if (!artistData || !apiKey) {
        console.error('Artist data or API key missing');
        return;
    }
    
    const recommendationsSection = document.getElementById('artistRecommendations');
    const recommendationsContent = document.getElementById('recommendationsContent');
    const lockedContent = document.getElementById('recommendationsLockedContent');
    const refreshButton = document.getElementById('refreshRecommendations');
    
    if (!recommendationsSection || !recommendationsContent || !lockedContent || !refreshButton) {
        console.error('Recommendations section elements not found');
        return;
    }
    
    // Show content and hide locked message
    recommendationsContent.classList.remove('hidden');
    lockedContent.classList.add('hidden');
    recommendationsSection.classList.remove('locked');
    refreshButton.classList.remove('hidden');
    
    // Set up refresh button click handler
    refreshButton.onclick = () => {
        loadArtistRecommendations(artistData, apiKey, true);
    };
    
    try {
        // Add loading state
        recommendationsContent.innerHTML = `
            <div class="spinner-container">
                <div class="spinner"></div>
            </div>
        `;
        
        // Check cache first (unless forcing refresh)
        if (!forceRefresh) {
            const cachedRecommendations = getCachedArtistRecommendations(artistData.id);
            if (cachedRecommendations) {
                console.log('Using cached recommendations for', artistData.name);
                await displayRecommendations(cachedRecommendations, recommendationsContent);
                return;
            }
        } else {
            // Clear cache if forcing refresh
            import('../services/cache-service.js').then(cacheModule => {
                cacheModule.clearLLMCache(artistData.id);
                console.log('Cleared recommendations cache for', artistData.name);
            });
        }
        
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
        console.error('Error loading artist recommendations:', error);
        displayRecommendationsError(recommendationsContent);
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
    2. ONLY include recommendations from the past 12 months (since ${currentMonth} ${lastYear})
    3. You MUST verify the date of each recommendation and include it
    4. If you can't find enough recent recommendations, return fewer items rather than including older ones
    5. Do NOT include anything from before ${lastYear} unless absolutely nothing recent exists
    6. Use sources like recent interviews, social media, podcast appearances, and news articles
    7. Check multiple sources to find the most recent recommendations
    
    ===== TASK DETAILS =====
    Research and find the most RECENT music, albums, or artists that ${artistData.name} has explicitly recommended to their fans through interviews, social media posts, podcast appearances, or other public statements within the PAST 12 MONTHS ONLY.
    
    Artist context: ${artistData.name} is a professional musician. ${genres}
    
    ===== SEARCH GUIDANCE =====
    - Search for: "${artistData.name} recommends music ${currentYear}"
    - Search for: "${artistData.name} favorite artists ${currentYear}"
    - Search for: "${artistData.name} interview music recommendations ${currentMonth} ${currentYear}"
    - Search for: "${artistData.name} social media music recommendations ${currentYear}"
    
    ===== OUTPUT FORMAT =====
    Create a JSON array with 4-6 of the MOST RECENT recommendations with these fields:
    - name: The name of the recommended artist or album (if album, include format "Album Title by Artist Name")
    - type: Either "artist" or "album"
    - description: A direct quote or accurate paraphrase of what ${artistData.name} said about this music
    - year: The specific year when they made this recommendation (${lastYear}-${currentYear})
    - month: The specific month when they made this recommendation (required)
    - source: EXACTLY where this recommendation was made (specific interview name, social media platform post, etc.)
    
    Example format:
    [
      {
        "name": "SZA",
        "type": "artist",
        "description": "Praised her vocal techniques and songwriting, calling her 'one of the most innovative artists in music right now' and mentioned being inspired by her approach to genre-blending.",
        "year": "${currentYear}",
        "month": "May",
        "source": "Interview with Rolling Stone, May ${currentYear}"
      },
      {
        "name": "Midnights by Taylor Swift",
        "type": "album",
        "description": "Called it 'a masterclass in storytelling and production' and shared it on their Instagram story, encouraging fans to listen to it.",
        "year": "${currentYear}",
        "month": "February",
        "source": "Instagram Story, February ${currentYear}"
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
        
        // Find JSON array within the text if needed
        const jsonMatch = text.match(/\[\s*\{.*\}\s*\]/s);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        }
        
        // Parse the JSON
        const recommendations = JSON.parse(jsonStr);
        
        // Validate the structure
        if (!Array.isArray(recommendations)) {
            throw new Error('Recommendations is not an array');
        }
        
        return recommendations;
    } catch (error) {
        console.error('Failed to parse recommendations:', error);
        console.error('Original text:', text);
        
        return createDefaultRecommendations();
    }
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
    
    if (recommendations.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'message-box empty-state';
        emptyMessage.textContent = 'No recent recommendations found for this artist.';
        container.appendChild(emptyMessage);
        return;
    }
    
    // Add header to emphasize recency
    const headerEl = document.createElement('div');
    headerEl.className = 'recommendations-header';
    headerEl.innerHTML = `<p>Recent recommendations from the past 12 months</p>`;
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
        
        // Create simplified card with image and name at bottom
        recommendationCard.innerHTML = `
            <div class="card-image-container">
                ${imageUrl ? 
                    `<img src="${imageUrl}" alt="${recommendation.name}" loading="lazy" class="card-image-main">` : 
                    `<div class="placeholder-image">${svgIcon}</div>`
                }
                ${dateTag}
            </div>
            <div class="card-simple-info">
                <div class="card-name">${recommendation.name}</div>
                <div class="card-type">${recommendation.type === 'artist' ? 'Artist' : 'Album'}</div>
            </div>
            <div class="card-details">
                <div class="card-quote">${recommendation.description}</div>
                ${recommendation.source ? 
                    `<div class="card-source"><small>Source: ${recommendation.source}</small></div>` : 
                    ''
                }
            </div>
        `;
        
        // Add click event to open in Spotify if URL is available
        if (spotifyUrl) {
            recommendationCard.style.cursor = 'pointer';
            recommendationCard.addEventListener('click', () => {
                window.open(spotifyUrl, '_blank');
            });
            
            // Add a visual indicator that this is clickable
            const spotifyIndicator = document.createElement('div');
            spotifyIndicator.className = 'spotify-indicator';
            spotifyIndicator.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="%231DB954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"></path></svg>';
            recommendationCard.appendChild(spotifyIndicator);
        }
        
        // Add hover effect to show details
        recommendationCard.addEventListener('mouseenter', () => {
            const details = recommendationCard.querySelector('.card-details');
            if (details) details.classList.add('show-details');
        });
        
        recommendationCard.addEventListener('mouseleave', () => {
            const details = recommendationCard.querySelector('.card-details');
            if (details) details.classList.remove('show-details');
        });
        
        gridEl.appendChild(recommendationCard);
    }
}

function displayRecommendationsError(container) {
    container.innerHTML = '';
    
    const errorMessage = document.createElement('div');
    errorMessage.className = 'alert alert-error';
    errorMessage.textContent = 'Unable to load artist recommendations. Please check your API key or try again later.';
    
    container.appendChild(errorMessage);
}