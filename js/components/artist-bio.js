// Artist biography component
import { getLLMResponse } from '../services/llm-service.js';
import { getArtistBiography } from '../services/lastfm-service.js';
import { cacheArtistBio, getCachedArtistBio } from '../services/cache-service.js';

export async function loadArtistBio(artistData, apiKey) {
    const bioSection = document.getElementById('artistBio');
    const biographyContent = document.getElementById('biographyContent');
    
    if (!bioSection || !biographyContent) {
        console.error('Biography section elements not found');
        return;
    }
    
    try {
        // Check cache first
        const cachedBio = getCachedArtistBio(artistData.id);
        if (cachedBio) {
            displayBiography(cachedBio, biographyContent);
            bioSection.classList.remove('loading');
            return;
        }
        
        // Try to get biography from Last.fm
        let biography = await getArtistBiography(artistData.name);
        
        // If Last.fm biography is not available and we have an API key, use OpenAI
        if ((!biography || biography.length < 50) && apiKey) {
            console.log('Last.fm bio not found or too short, using OpenAI');
            const prompt = generateBioPrompt(artistData);
            biography = await getLLMResponse(prompt, apiKey);
        } else if (!biography && !apiKey) {
            // No Last.fm bio and no API key
            biography = generateDefaultBio(artistData);
        }
        
        // Cache the result
        cacheArtistBio(artistData.id, biography);
        
        // Display the biography
        displayBiography(biography, biographyContent);
    } catch (error) {
        console.error('Error loading artist biography:', error);
        
        // Generate a fallback bio based on available data
        const fallbackBio = generateDefaultBio(artistData);
        displayBiography(fallbackBio, biographyContent);
    } finally {
        bioSection.classList.remove('loading');
        bioSection.classList.remove('locked');
    }
}

// Generate a simple biography based on available artist data
function generateDefaultBio(artistData) {
    const genres = artistData.genres && artistData.genres.length > 0 
        ? artistData.genres.join(', ') 
        : 'various genres';
    
    const popularity = artistData.popularity
        ? getPopularityDescription(artistData.popularity)
        : 'notable';
    
    return `${artistData.name} is a ${popularity} music artist known for their work in ${genres}. ` +
           `With ${artistData.followers?.total ? numberWithCommas(artistData.followers.total) + ' followers' : 'a significant following'} ` +
           `on Spotify, they have established a presence in the music industry. ` +
           `Explore their albums and tracks to discover their unique musical style and artistic evolution.`;
}

// Format large numbers with commas
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Get a description based on popularity score
function getPopularityDescription(popularity) {
    if (popularity >= 85) return 'highly acclaimed';
    if (popularity >= 70) return 'popular';
    if (popularity >= 50) return 'established';
    if (popularity >= 30) return 'emerging';
    return 'up-and-coming';
}

function generateBioPrompt(artistData) {
    return `Write a concise, single paragraph biography (100-150 words) for the music artist ${artistData.name}. 
    Focus on their musical style, career highlights, and cultural impact.
    
    Include information about:
    - Musical genres: ${artistData.genres ? artistData.genres.join(', ') : 'various genres'}
    - Formation/origin
    - Major achievements
    - Artistic evolution
    
    Keep the tone informative and engaging. Do not use promotional language.
    Format as plain text with no headings or bullet points.`;
}

function displayBiography(biography, container) {
    container.innerHTML = '';
    
    const paragraph = document.createElement('p');
    paragraph.textContent = biography;
    container.appendChild(paragraph);
}

function displayBiographyError(container) {
    container.innerHTML = '';
    
    const errorMessage = document.createElement('div');
    errorMessage.className = 'alert alert-error';
    errorMessage.textContent = 'Unable to load artist biography. Please check your API key or try again later.';
    
    container.appendChild(errorMessage);
}