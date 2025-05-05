// Results page entry point
import { initSearchBar } from './components/search-bar.js';
import { loadArtistData } from './services/spotify-service.js';
import { initApiKeyModal } from './components/api-key-modal.js';
import { loadArtistRecommendations } from './components/recommendations.js';
import { loadArtistInfluences } from './components/influences.js';
import { 
    loadCachedApiKey, 
    getCachedArtistRecommendations, 
    getCachedArtistInfluences 
} from './services/cache-service.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Artist Results Page initialized');
    
    // Get artist ID and name from URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const artistId = urlParams.get('id');
    let artistSlug = urlParams.get('artist');
    
    if (!artistId) {
        window.location.href = 'index.html';
        return;
    }
    
    // Initialize mini search bar
    initSearchBar('mini');
    
    // Initialize API key modal
    initApiKeyModal();
    
    // Load artist data
    try {
        const artistData = await loadArtistData(artistId);
        
        // Update the URL with the artist slug if not already present
        if (!artistSlug && artistData.name) {
            artistSlug = slugify(artistData.name);
            updateUrlWithArtistSlug(artistId, artistSlug);
        }
        
        // Update document title with artist name
        document.title = `${artistData.name} - Artist Explorer`;
        
        displayArtistHeader(artistData);
        
        // Check if we have cached data or an API key for enhanced features
        const apiKey = loadCachedApiKey();
        
        // Check for cached recommendations and influences first
        const cachedRecommendations = getCachedArtistRecommendations(artistData.id);
        const cachedInfluences = getCachedArtistInfluences(artistData.id);
        
        // Let's simplify and make sure all cached artists work
        try {
            // Check if this artist is in our predefined list of featured artists
            // This is a simple way to know if it's a cached artist
            const artistIsCached = await isArtistCached(artistId);
            console.log('Artist cached status check:', artistId, artistIsCached);
            
            if (artistIsCached) {
                console.log('This is a cached artist, loading content without API key');
                // For cached artists, pass the API key if available, but always load content
                loadArtistRecommendations(artistData, apiKey);
                loadArtistInfluences(artistData, apiKey);
            } else if (apiKey) {
                // For non-cached artists, we need an API key
                console.log('Non-cached artist but API key available, loading content');
                loadArtistRecommendations(artistData, apiKey);
                loadArtistInfluences(artistData, apiKey);
            } else {
                // For non-cached artists without API key, show limited content
                console.log('Non-cached artist and no API key, showing limited content');
            }
            
            // Only show prompts for API key if it's not a cached artist and we don't have an API key
            if (!artistIsCached && !apiKey) {
                console.log('Showing API key prompts for non-cached artist');
                
                // Set up unlock buttons event listeners
                document.querySelectorAll('.unlock-button').forEach(button => {
                    button.addEventListener('click', () => {
                        document.getElementById('apiKeyModal').style.display = 'block';
                    });
                });
                
                // Lock the content sections since this is a non-cached artist with no API key
                const recommendationsSection = document.getElementById('artistRecommendations');
                const influencesSection = document.getElementById('artistInfluences');
                const recommendationsContent = document.getElementById('recommendationsContent');
                const influencesVisualization = document.getElementById('influencesVisualization');
                const lockedContentRecs = document.getElementById('recommendationsLockedContent');
                const lockedContentInf = document.getElementById('influencesLockedContent');
                
                if (recommendationsSection && recommendationsContent && lockedContentRecs) {
                    recommendationsContent.classList.add('hidden');
                    lockedContentRecs.classList.remove('hidden');
                    recommendationsSection.classList.add('locked');
                }
                
                if (influencesSection && influencesVisualization && lockedContentInf) {
                    influencesVisualization.classList.add('hidden');
                    lockedContentInf.classList.remove('hidden');
                    influencesSection.classList.add('locked');
                }
            }
        } catch (error) {
            console.error('Error loading enhanced content:', error);
        }
    } catch (error) {
        console.error('Error loading artist data:', error);
        displayError();
    }
});

// Helper function to update the URL with artist slug
function updateUrlWithArtistSlug(artistId, artistSlug) {
    if (!artistSlug) return;
    
    // Create new URL with artist ID and slug
    const newUrl = `results.html?id=${encodeURIComponent(artistId)}&artist=${encodeURIComponent(artistSlug)}`;
    
    // Update browser history without reloading the page
    window.history.pushState({ artistId, artistSlug }, '', newUrl);
}

// Helper function to create a URL-friendly slug from a string
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')        // Replace spaces with dashes
        .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
        .replace(/\-\-+/g, '-')      // Replace multiple dashes with single dash
        .replace(/^-+/, '')          // Trim dash from start
        .replace(/-+$/, '');         // Trim dash from end
}

// Check if artist is one of our cached featured artists
async function isArtistCached(artistId) {
    // Check server cache first
    try {
        // First try a direct server-cache API call to see if the artist has cached server data
        const recommendationsResponse = await fetch(`/api/cached-recommendations/${artistId}`);
        const influencesResponse = await fetch(`/api/cached-influences/${artistId}`);
        
        if (recommendationsResponse.ok || influencesResponse.ok) {
            console.log('Artist has server-cached data available');
            return true;
        }
    } catch (error) {
        console.warn('Error checking server cache:', error);
    }
    
    // As a fallback, check for local cache
    try {
        const recommendationsData = getCachedArtistRecommendations(artistId);
        const influencesData = getCachedArtistInfluences(artistId);
        
        if (recommendationsData || influencesData) {
            console.log('Artist has locally cached data');
            return true;
        }
    } catch (error) {
        console.warn('Error checking local cache:', error);
    }
    
    // Last fallback: check if artist is in the featured artists data
    try {
        const response = await fetch('/api/featured');
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.data && Array.isArray(data.data)) {
                // Check if artist ID is in the featured artists list
                return data.data.some(artist => artist.id === artistId);
            }
        }
    } catch (error) {
        console.warn('Error checking featured artists:', error);
    }
    
    return false;
}

function displayArtistHeader(artistData) {
    document.getElementById('artistName').textContent = artistData.name;
    document.getElementById('artistName').classList.remove('skeleton-text');
    
    const artistImage = document.getElementById('artistImage');
    if (artistData.images && artistData.images.length > 0) {
        const img = document.createElement('img');
        img.src = artistData.images[0].url;
        img.alt = artistData.name;
        artistImage.appendChild(img);
    }
    
    const genresElement = document.getElementById('artistGenres');
    genresElement.innerHTML = '';
    genresElement.classList.remove('skeleton-text');
    
    if (artistData.genres && artistData.genres.length > 0) {
        artistData.genres.forEach(genre => {
            const genreTag = document.createElement('span');
            genreTag.className = 'genre-tag';
            genreTag.textContent = genre;
            genresElement.appendChild(genreTag);
        });
    } else {
        const genreTag = document.createElement('span');
        genreTag.className = 'genre-tag';
        genreTag.textContent = 'No genres available';
        genresElement.appendChild(genreTag);
    }
    
    // Remove loading state
    document.getElementById('artistHeader').classList.remove('loading');
}

function displayError() {
    const container = document.querySelector('.results-container');
    
    const errorMessage = document.createElement('div');
    errorMessage.className = 'message-box alert-error';
    errorMessage.innerHTML = `
        <h2>Oops! Something went wrong</h2>
        <p>We couldn't load the artist information. Please try again later or search for a different artist.</p>
        <a href="index.html" class="btn mt-2">Back to Search</a>
    `;
    
    // Clear the container and display error
    container.innerHTML = '';
    container.appendChild(errorMessage);
}