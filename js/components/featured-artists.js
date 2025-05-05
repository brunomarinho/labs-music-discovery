// Featured Artists Component
import { redirectToResults } from '../main.js';
import { getCachedArtistData, cacheArtistData } from '../services/cache-service.js';
import { setArtistId } from '../data/featured-artists.js';

// DOM selectors 
const SELECTORS = {
    FEATURED_CONTAINER: 'featured-artists-container',
    ARTIST_CARD: 'artist-card',
    ARTIST_IMAGE: 'artist-image',
    ARTIST_NAME: 'artist-name',
    ARTIST_GENRES: 'artist-genres',
};

// Server API endpoints
const API_ENDPOINTS = {
    FEATURED: '/api/featured',
    CACHED_ARTIST: '/api/cached-artist'
};

/**
 * Initialize the featured artists section
 * @param {Array} artistNames - Array of artist names to display (optional)
 * @returns {Promise<void>}
 */
export async function initFeaturedArtists(artistNames = []) {
    const container = document.getElementById(SELECTORS.FEATURED_CONTAINER);
    if (!container) {
        console.error('Featured artists container not found in DOM');
        return;
    }
    
    // Show loading state
    showLoadingState(container);
    
    try {
        // First try to get featured artists from server cache
        const featuredArtists = await fetchFeaturedArtistsFromServer();
        
        if (featuredArtists && featuredArtists.length > 0) {
            console.log('Using server-cached featured artists');
            
            // Cache the artists locally
            featuredArtists.forEach(artist => {
                if (artist && artist.id) {
                    cacheArtistData(artist.id, artist);
                    setArtistId(artist.name, artist.id); // Update name-to-id mapping
                }
            });
            
            // Render the featured artists
            renderFeaturedArtistsFromData(container, featuredArtists);
        } 
        // Fallback to client-side rendering with provided artist names or IDs
        else if (artistNames && artistNames.length > 0) {
            console.log('Using client-side artist names/IDs');
            renderFeaturedArtists(container, artistNames);
        } 
        // No artists available
        else {
            console.warn('No artists available for featured section');
            showEmptyState(container);
        }
    } catch (error) {
        console.error('Error initializing featured artists:', error);
        showErrorState(container);
    }
}

/**
 * Fetch featured artists from server cache
 * @returns {Promise<Array>} Array of artist data objects
 */
async function fetchFeaturedArtistsFromServer() {
    try {
        const response = await fetch(API_ENDPOINTS.FEATURED);
        
        if (!response.ok) {
            console.warn(`Server returned ${response.status} when fetching featured artists`);
            return [];
        }
        
        const data = await response.json();
        
        if (data.success && data.data && Array.isArray(data.data)) {
            return data.data;
        }
        
        return [];
    } catch (error) {
        console.error('Error fetching featured artists from server:', error);
        return [];
    }
}

/**
 * Fetch artist data from server cache by ID
 * @param {string} artistId - Spotify artist ID
 * @returns {Promise<Object|null>} Artist data or null if not found
 */
export async function fetchArtistDataFromServer(artistId) {
    if (!artistId) return null;
    
    try {
        const response = await fetch(`${API_ENDPOINTS.CACHED_ARTIST}/${artistId}`);
        
        if (!response.ok) {
            return null;
        }
        
        const data = await response.json();
        
        if (data.success && data.data) {
            return data.data;
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching artist data from server:', error);
        return null;
    }
}

/**
 * Show loading state in container
 * @param {HTMLElement} container - Container element
 */
function showLoadingState(container) {
    container.innerHTML = `
        <div class="loading-indicator">
            <div class="spinner"></div>
            <p>Loading featured artists...</p>
        </div>
    `;
}

/**
 * Show empty state in container
 * @param {HTMLElement} container - Container element
 */
function showEmptyState(container) {
    container.innerHTML = `
        <div class="message-box empty-state">
            <h2>No Featured Artists</h2>
            <p>Try searching for your favorite artists above!</p>
        </div>
    `;
}

/**
 * Show error state in container
 * @param {HTMLElement} container - Container element
 */
function showErrorState(container) {
    container.innerHTML = `
        <div class="message-box alert-error">
            <h2>Could Not Load Featured Artists</h2>
            <p>Please try refreshing the page.</p>
        </div>
    `;
}

/**
 * Render featured artists directly from artist data
 * @param {HTMLElement} container - Container element
 * @param {Array} artistsData - Array of artist data objects
 */
function renderFeaturedArtistsFromData(container, artistsData) {
    // Clear any existing content
    container.innerHTML = '';
    
    // Add section heading
    const heading = document.createElement('h2');
    heading.textContent = 'Featured Artists';
    heading.classList.add('featured-heading');
    container.appendChild(heading);
    
    // Add section description
    const description = document.createElement('p');
    description.textContent = 'Explore these artists to discover their influences and recommendations';
    description.classList.add('featured-description');
    container.appendChild(description);
    
    // Create grid container
    const grid = document.createElement('div');
    grid.classList.add('featured-grid');
    container.appendChild(grid);
    
    // Add artist cards to grid
    artistsData.forEach(artistData => {
        grid.appendChild(createArtistCard(artistData));
    });
}

/**
 * Render featured artists from names or IDs (loads from cache or adds placeholders)
 * @param {HTMLElement} container - Container element
 * @param {Array} artistNamesOrIds - Array of artist names or IDs to display
 */
function renderFeaturedArtists(container, artistNamesOrIds) {
    // Clear any existing content
    container.innerHTML = '';
    
    // Add section heading
    const heading = document.createElement('h2');
    heading.textContent = 'Featured Artists';
    heading.classList.add('featured-heading');
    container.appendChild(heading);
    
    // Add section description
    const description = document.createElement('p');
    description.textContent = 'Explore these artists to discover their influences and recommendations';
    description.classList.add('featured-description');
    container.appendChild(description);
    
    // Create grid container
    const grid = document.createElement('div');
    grid.classList.add('featured-grid');
    container.appendChild(grid);
    
    // Add artist cards to grid
    artistNamesOrIds.forEach(nameOrId => {
        // Try to get from cache first
        const artistData = getCachedArtistData(nameOrId);
        if (artistData) {
            grid.appendChild(createArtistCard(artistData));
        } else {
            // Add placeholder for artists not yet cached
            grid.appendChild(createArtistPlaceholder(nameOrId));
        }
    });
}

/**
 * Create artist card element
 * @param {Object} artistData - Artist data from cache or API
 * @returns {HTMLElement} The artist card element
 */
function createArtistCard(artistData) {
    const card = document.createElement('div');
    card.classList.add(SELECTORS.ARTIST_CARD);
    card.dataset.artistId = artistData.id;
    
    // Create card content
    const imageContainer = document.createElement('div');
    imageContainer.classList.add(`${SELECTORS.ARTIST_IMAGE}-container`);
    
    const image = document.createElement('img');
    image.classList.add(SELECTORS.ARTIST_IMAGE);
    image.src = artistData.images && artistData.images.length 
        ? artistData.images[0].url 
        : 'https://via.placeholder.com/300?text=Artist+Image';
    image.alt = `${artistData.name}`;
    imageContainer.appendChild(image);
    
    const content = document.createElement('div');
    content.classList.add('artist-card-content');
    
    const name = document.createElement('h3');
    name.classList.add(SELECTORS.ARTIST_NAME);
    name.textContent = artistData.name;
    
    const genres = document.createElement('p');
    genres.classList.add(SELECTORS.ARTIST_GENRES);
    genres.textContent = artistData.genres && artistData.genres.length 
        ? artistData.genres.slice(0, 3).join(', ') 
        : 'Music';
    
    content.appendChild(name);
    content.appendChild(genres);
    
    // Add elements to card
    card.appendChild(imageContainer);
    card.appendChild(content);
    
    // Add click event
    card.addEventListener('click', () => {
        redirectToResults(artistData.id, createSlug(artistData.name));
    });
    
    return card;
}

/**
 * Create a placeholder for artists not yet cached
 * @param {string} artistId - The artist ID
 * @returns {HTMLElement} The placeholder element
 */
function createArtistPlaceholder(artistId) {
    const placeholder = document.createElement('div');
    placeholder.classList.add(SELECTORS.ARTIST_CARD, 'skeleton');
    placeholder.dataset.artistId = artistId;
    
    // Add placeholder elements
    const imageContainer = document.createElement('div');
    imageContainer.classList.add(`${SELECTORS.ARTIST_IMAGE}-container`, 'skeleton');
    
    const content = document.createElement('div');
    content.classList.add('artist-card-content');
    
    const nameSkele = document.createElement('div');
    nameSkele.classList.add('skeleton-text');
    
    const genreSkele = document.createElement('div');
    genreSkele.classList.add('skeleton-text');
    
    content.appendChild(nameSkele);
    content.appendChild(genreSkele);
    
    placeholder.appendChild(imageContainer);
    placeholder.appendChild(content);
    
    return placeholder;
}

/**
 * Create URL-friendly slug from artist name
 * @param {string} name - Artist name
 * @returns {string} URL-friendly slug
 */
function createSlug(name) {
    return name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}