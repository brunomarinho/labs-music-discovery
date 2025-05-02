// Main entry point for the application
import { initSearchBar } from './components/search-bar.js';
import { initApiKeyModal } from './components/api-key-modal.js';
import { loadCachedApiKey } from './services/cache-service.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('Artist Explorer initialized');
    
    // Initialize search functionality
    initSearchBar();
    
    // Initialize API key modal
    initApiKeyModal();
    
    // Check if API key exists
    const apiKey = loadCachedApiKey();
    if (apiKey) {
        console.log('API key found in cache');
    } else {
        console.log('No API key found in cache');
    }
});