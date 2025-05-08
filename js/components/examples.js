// Examples Component
import { FEATURED_ARTISTS } from '../data/featured-artists.js';
import { redirectToResults } from '../main.js';
import { searchArtistByName } from '../services/spotify-service.js';
import { setArtistId, getArtistId } from '../data/featured-artists.js';
import { getCachedArtistData } from '../services/cache-service.js';
import { fetchServerCachedArtist } from '../services/prefetch-service.js';

/**
 * Initialize the examples section
 */
export async function initExamples() {
    const container = document.getElementById('examples-container');
    if (!container) {
        console.error('Examples container not found in DOM');
        return;
    }
    
    renderExampleCategories(container);
    
    // Prefetch artist IDs for the examples
    await prefetchExampleArtistIds();
    
    // Add click event listeners to example items
    setupExampleClickHandlers();
}

/**
 * Render the example categories from FEATURED_ARTISTS
 * @param {HTMLElement} container - Container element
 */
function renderExampleCategories(container) {
    // Clear any existing content
    container.innerHTML = '';
    
    // Create a category section for each genre
    Object.entries(FEATURED_ARTISTS).forEach(([genre, artists]) => {
        const categoryEl = document.createElement('div');
        categoryEl.classList.add('example-category');
        
        const heading = document.createElement('h3');
        heading.textContent = genre.charAt(0).toUpperCase() + genre.slice(1); // Capitalize first letter
        categoryEl.appendChild(heading);
        
        const list = document.createElement('ul');
        
        // Add each artist to the list
        artists.forEach(artistName => {
            const item = document.createElement('li');
            item.textContent = artistName;
            item.dataset.artist = artistName;
            item.classList.add('example-item');
            list.appendChild(item);
        });
        
        categoryEl.appendChild(list);
        container.appendChild(categoryEl);
    });
}

/**
 * Prefetch artist IDs for all examples to ensure they're in the cache
 */
async function prefetchExampleArtistIds() {
    const allArtists = Object.values(FEATURED_ARTISTS).flat();
    const promises = [];
    
    for (const artistName of allArtists) {
        // Check if we already have the artist ID in cache
        const cachedId = getArtistId(artistName);
        
        if (!cachedId) {
            // If not, create a promise to fetch it
            const promise = (async () => {
                try {
                    // Try to get from server cache first, but this might not be available
                    const serverData = await fetchServerCachedArtist(artistName).catch(() => null);
                    
                    if (serverData && serverData.id) {
                        setArtistId(artistName, serverData.id);
                        return serverData;
                    }
                    
                    // If server cache fails, search Spotify API
                    const searchData = await searchArtistByName(artistName);
                    if (searchData && searchData.id) {
                        setArtistId(artistName, searchData.id);
                        return searchData;
                    }
                    
                    console.warn(`Could not find artist: ${artistName}`);
                    return null;
                } catch (error) {
                    console.warn(`Error prefetching artist ID for ${artistName}:`, error);
                    return null;
                }
            })();
            
            promises.push(promise);
        }
    }
    
    // Only wait for all promises if there are any
    if (promises.length > 0) {
        try {
            console.log(`Prefetching ${promises.length} artist IDs for examples...`);
            await Promise.allSettled(promises);
            console.log('Artist ID prefetching complete');
        } catch (error) {
            console.error('Error prefetching artist IDs:', error);
        }
    } else {
        console.log('All artist IDs already in cache');
    }
}

/**
 * Set up click handlers for examples
 */
function setupExampleClickHandlers() {
    document.querySelectorAll('.example-item').forEach(item => {
        item.addEventListener('click', async () => {
            const artistName = item.dataset.artist;
            if (!artistName) return;
            
            // Show loading state on the item
            const originalText = item.textContent;
            item.innerHTML = `${originalText} <span class="loading-dot">...</span>`;
            item.style.pointerEvents = 'none';
            
            try {
                // First check if we already have the ID cached
                let artistId = getArtistId(artistName);
                
                if (!artistId) {
                    // If not in cache, try to get from server or search
                    try {
                        // Try server cache first
                        const serverData = await fetchServerCachedArtist(artistName);
                        if (serverData && serverData.id) {
                            artistId = serverData.id;
                            setArtistId(artistName, artistId);
                        }
                    } catch (serverError) {
                        console.log('Server cache miss for', artistName);
                        
                        // Fall back to search API
                        const searchData = await searchArtistByName(artistName);
                        if (searchData && searchData.id) {
                            artistId = searchData.id;
                            setArtistId(artistName, artistId);
                        }
                    }
                }
                
                if (artistId) {
                    // Redirect to the results page
                    redirectToResults(artistId, createSlug(artistName));
                } else {
                    console.error(`Could not find artist: ${artistName}`);
                    // Reset the item state
                    item.textContent = originalText;
                    item.style.pointerEvents = 'auto';
                    alert(`Could not find artist: ${artistName}`);
                }
            } catch (error) {
                console.error(`Error searching for artist ${artistName}:`, error);
                // Reset the item state
                item.textContent = originalText;
                item.style.pointerEvents = 'auto';
            }
        });
    });
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