// Main entry point for the application
import { initSearchBar } from './components/search-bar.js';
import { initApiKeyModal } from './components/api-key-modal.js';
import { initFeaturedArtists } from './components/featured-artists.js';
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
    console.log('Artist Explorer initialized');
    
    // Initialize search functionality
    initSearchBar();
    
    // Initialize API key modal
    initApiKeyModal();
    
    // Get featured artists for homepage - these will be names now, not IDs
    const featuredArtistNames = getHomepageFeatured();
    
    // Initialize featured artists (will check server cache first then fall back to client-side)
    await initFeaturedArtists(featuredArtistNames);
    
    // Check if local prefetching is needed (for client-side fallback)
    const prefetchCompleted = isPrefetchCompleted();
    const apiKey = loadCachedApiKey();
    
    if (!prefetchCompleted) {
        console.log('Local cache needs initialization, checking for artist IDs...');
        
        // The featured artists component might have already loaded IDs from the server
        // We only need to prefetch if we don't have data
        const resolvedIds = getResolvedArtistIds();
        
        if (resolvedIds.length === 0) {
            console.log('No artist IDs resolved yet, initiating local prefetch...');
            
            try {
                // Use names to get artist data
                const artistsData = await prefetchArtistData(featuredArtistNames);
                
                // If we have an API key, also prefetch LLM data
                if (apiKey && artistsData.length > 0) {
                    setTimeout(async () => {
                        try {
                            await prefetchLLMData(artistsData, apiKey);
                        } catch (error) {
                            console.error('Error prefetching LLM data:', error);
                        }
                    }, 2000); // Small delay to ensure UI is responsive
                }
            } catch (error) {
                console.error('Error during prefetch initialization:', error);
            }
        } else {
            console.log(`Artists already resolved from server (${resolvedIds.length} IDs available)`);
        }
    } else {
        console.log('Local prefetch already completed, using cached data');
    }
    
    // Check if API key exists
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