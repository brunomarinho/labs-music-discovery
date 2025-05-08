// Main entry point for the application
import { initSearchBar } from './components/search-bar.js';
import { initApiKeyModal } from './components/api-key-modal.js';
import { initExamples } from './components/examples.js';
import { 
    loadCachedApiKey, 
    getCachedArtistData
} from './services/cache-service.js';
import { 
    isPrefetchCompleted, 
    prefetchArtistData,
    prefetchLLMData
} from './services/prefetch-service.js';
import { 
    getHomepageFeatured,
    getResolvedArtistIds
} from './data/featured-artists.js';

// Redirect to results page
export function redirectToResults(artistId, artistSlug) {
    if (!artistId) return;
    
    const url = `results.html?id=${encodeURIComponent(artistId)}` + 
                (artistSlug ? `&artist=${encodeURIComponent(artistSlug)}` : '');
    
    window.location.href = url;
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Rec\'d initialized');
    
    // Initialize search functionality
    initSearchBar();
    
    // Initialize API key modal
    initApiKeyModal();
    
    // Initialize examples section
    initExamples();
    
    // Get featured artists for homepage - these will be names now, not IDs
    const featuredArtistNames = getHomepageFeatured();
    
    // Check if API key exists - but don't prefetch data automatically on homepage
    const apiKey = loadCachedApiKey();
    
    if (apiKey) {
        console.log('API key found in cache');
    } else {
        console.log('No API key found in cache');
        
        // If on the homepage and we have no key, wait for user interaction
        // before showing the API key modal to avoid overwhelming new users
        const modalTriggered = sessionStorage.getItem('api_key_modal_triggered');
        if (!modalTriggered) {
            // Just record we've handled this session
            sessionStorage.setItem('api_key_modal_triggered', 'false');
        }
    }
    
});