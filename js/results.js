// Results page entry point
import { initSearchBar } from './components/search-bar.js';
import { loadArtistData } from './services/spotify-service.js';
import { initApiKeyModal } from './components/api-key-modal.js';
import { loadArtistRecommendations } from './components/recommendations.js';
import { loadArtistInfluences } from './components/influences.js';
import { loadCachedApiKey } from './services/cache-service.js';

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
        
        // Check if we have an API key for enhanced features
        const apiKey = loadCachedApiKey();
        if (apiKey) {
            // Load enhanced content with LLM
            loadArtistRecommendations(artistData, apiKey);
            loadArtistInfluences(artistData, apiKey);
        } else {
            console.log('No API key found, showing limited content');
            
            // Set up unlock buttons event listeners
            document.querySelectorAll('.unlock-button').forEach(button => {
                button.addEventListener('click', () => {
                    document.getElementById('apiKeyModal').style.display = 'block';
                });
            });
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