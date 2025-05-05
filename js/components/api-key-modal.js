// API Key Modal component
import { saveApiKey, loadCachedApiKey, getPrefetchStatus } from '../services/cache-service.js';

export function initApiKeyModal() {
    const modal = document.getElementById('apiKeyModal');
    const closeModal = document.getElementById('closeModal');
    const apiKeyForm = document.getElementById('apiKeyForm');
    const apiKeyInput = document.getElementById('apiKeyInput');
    
    if (!modal || !closeModal || !apiKeyForm || !apiKeyInput) {
        console.error('API key modal elements not found');
        return;
    }
    
    // Check if credentials are already saved
    const savedApiKey = loadCachedApiKey();
    if (savedApiKey) {
        apiKeyInput.value = maskApiKey(savedApiKey);
    }
    
    // Check if we have prefetched or cached data
    const prefetchStatus = getPrefetchStatus();
    const hasPrefetchedData = prefetchStatus && prefetchStatus.data && prefetchStatus.data.completed;
    
    // On results page, the API key is only needed if user clicked the unlock button
    // On homepage, don't show at all (featured artists use cached data)
    const isResultsPage = window.location.pathname.includes('results.html');
    
    // Only show the modal on the results page if the user explicitly clicked an unlock button
    // This is now handled by the unlock button click handler in the components
    
    // Never automatically show the modal - it should only appear when user clicks an unlock button
    
    // Close modal when clicking the X
    closeModal.addEventListener('click', () => {
        hideModal();
    });
    
    // Close modal when clicking outside the content
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideModal();
        }
    });
    
    // Handle form submission
    apiKeyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const apiKey = apiKeyInput.value.trim();
        // If the key is masked, don't validate or save (they didn't change it)
        if (apiKey.includes('•')) {
            hideModal();
            return;
        }
        
        if (apiKey && !apiKey.startsWith('sk-')) {
            alert('Invalid OpenAI API key format. OpenAI API keys typically begin with "sk-"');
            return;
        }
        
        // Save the OpenAI API key if provided
        if (apiKey) {
            saveApiKey(apiKey);
        }
        
        // Close the modal
        hideModal();
        
        // Reload the page to refresh with the new API key
        window.location.reload();
    });
    
    // Connect unlock buttons to open the modal
    document.querySelectorAll('.unlock-button').forEach(button => {
        button.addEventListener('click', () => {
            showModal();
        });
    });
    
    // Export API key modal controls
    window.apiKeyControls = {
        showModal,
        hideModal
    };
}

/**
 * Show the API key modal
 */
export function showModal() {
    const modal = document.getElementById('apiKeyModal');
    if (modal) {
        modal.style.display = 'block';
        // Update session storage to track that modal was shown
        sessionStorage.setItem('api_key_modal_triggered', 'true');
    }
}

/**
 * Hide the API key modal
 */
export function hideModal() {
    const modal = document.getElementById('apiKeyModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Mask an API key for display
 * @param {string} apiKey - The API key to mask
 * @returns {string} Masked API key
 */
function maskApiKey(apiKey) {
    // Show only the first 8 and last 4 characters of the API key
    if (!apiKey || apiKey.length < 12) return '•••••••••••••••';
    
    const first = apiKey.substring(0, 8);
    const last = apiKey.substring(apiKey.length - 4);
    const masked = '•'.repeat(Math.max(8, apiKey.length - 12));
    
    return `${first}${masked}${last}`;
}