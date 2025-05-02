// Search bar component with autocomplete functionality
import { searchArtists } from '../services/spotify-service.js';
import { debounce } from '../utils/dom-helpers.js';
import { getCachedSearch, cacheSearchResults } from '../services/cache-service.js';

let currentSearchTerm = '';
let searchResults = [];
let isSearching = false;

export function initSearchBar(type = 'full') {
    const isMinSearch = type === 'mini';
    const searchInput = isMinSearch ? document.getElementById('miniArtistSearch') : document.getElementById('artistSearch');
    const searchResultsContainer = isMinSearch ? document.getElementById('miniSearchResults') : document.getElementById('searchResults');
    const searchButton = isMinSearch ? null : document.getElementById('searchButton');
    
    if (!searchInput || !searchResultsContainer) {
        console.error('Search elements not found');
        return;
    }
    
    // Debounced search function to prevent too many API calls
    const debouncedSearch = debounce(async (searchTerm) => {
        if (searchTerm.length < 2) {
            searchResultsContainer.innerHTML = '';
            searchResultsContainer.classList.remove('active');
            return;
        }
        
        // Check cache first
        const cachedResults = getCachedSearch(searchTerm);
        if (cachedResults) {
            searchResults = cachedResults;
            displaySearchResults(searchResults, searchResultsContainer);
            return;
        }
        
        try {
            isSearching = true;
            searchInput.classList.add('loading');
            
            const results = await searchArtists(searchTerm);
            searchResults = results;
            
            // Cache the results
            cacheSearchResults(searchTerm, results);
            
            displaySearchResults(results, searchResultsContainer);
        } catch (error) {
            console.error('Error searching artists:', error);
            searchResultsContainer.innerHTML = `
                <div class="search-results-empty">
                    <p>Error searching for artists. Please try again.</p>
                </div>
            `;
            searchResultsContainer.classList.add('active');
        } finally {
            isSearching = false;
            searchInput.classList.remove('loading');
        }
    }, 300);
    
    // Event listener for input changes
    searchInput.addEventListener('input', (e) => {
        currentSearchTerm = e.target.value.trim();
        debouncedSearch(currentSearchTerm);
    });
    
    // Event listener for focus
    searchInput.addEventListener('focus', () => {
        if (searchResults.length > 0) {
            searchResultsContainer.classList.add('active');
        }
    });
    
    // Handle clicks outside the search container to close results
    document.addEventListener('click', (e) => {
        const searchContainer = isMinSearch ? 
            document.querySelector('.mini-search-container') : 
            document.getElementById('searchBarContainer');
            
        if (!searchContainer.contains(e.target)) {
            searchResultsContainer.classList.remove('active');
        }
    });
    
    // Handle search button click (for the main search only)
    if (searchButton) {
        searchButton.addEventListener('click', () => {
            if (currentSearchTerm.length > 0 && searchResults.length > 0) {
                navigateToArtist(searchResults[0].id);
            }
        });
    }
    
    // Handle enter key
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' && currentSearchTerm.length > 0 && searchResults.length > 0) {
            navigateToArtist(searchResults[0].id);
        }
    });
}

function displaySearchResults(results, container) {
    if (results.length === 0) {
        container.innerHTML = `
            <div class="search-results-empty">
                <p>No artists found. Try another search.</p>
            </div>
        `;
        container.classList.add('active');
        return;
    }
    
    container.innerHTML = '';
    
    results.forEach(artist => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        
        const imageUrl = artist.images && artist.images.length > 0 ? 
            artist.images[artist.images.length - 1].url : 
            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%23777" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21v-2a7 7 0 0 0-14 0v2"/></svg>';
        
        // Include primary genre if available
        const genres = artist.genres && artist.genres.length > 0 
            ? artist.genres[0].charAt(0).toUpperCase() + artist.genres[0].slice(1) 
            : 'Artist';
        
        resultItem.innerHTML = `
            <img src="${imageUrl}" alt="${artist.name}" />
            <div class="result-info">
                <div class="result-name">${artist.name}</div>
                <div class="result-meta">${genres}</div>
            </div>
        `;
        
        resultItem.addEventListener('click', () => {
            navigateToArtist(artist.id);
        });
        
        container.appendChild(resultItem);
    });
    
    container.classList.add('active');
}

function navigateToArtist(artistId) {
    // Get the artist object from the search results
    const artist = searchResults.find(a => a.id === artistId);
    
    if (!artist) {
        console.error('Artist not found in search results');
        return;
    }
    
    // Create a slug from the artist name
    const artistSlug = slugify(artist.name);
    
    // Navigate to the results page with both ID and slug
    window.location.href = `results.html?id=${encodeURIComponent(artistId)}&artist=${encodeURIComponent(artistSlug)}`;
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