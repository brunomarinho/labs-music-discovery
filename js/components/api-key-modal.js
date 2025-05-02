// API Key Modal component
import { saveApiKey, loadCachedApiKey } from '../services/cache-service.js';

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
        apiKeyInput.value = savedApiKey;
    }
    
    // Close modal when clicking the X
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // Close modal when clicking outside the content
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Handle form submission
    apiKeyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const apiKey = apiKeyInput.value.trim();
        if (apiKey && !apiKey.startsWith('sk-')) {
            alert('Invalid OpenAI API key format. OpenAI API keys typically begin with "sk-"');
            return;
        }
        
        // Save the OpenAI API key if provided
        if (apiKey) {
            saveApiKey(apiKey);
        }
        
        // Close the modal
        modal.style.display = 'none';
        
        // Reload the page to refresh with the new API key
        window.location.reload();
    });
    
    // Connect unlock buttons to open the modal
    document.querySelectorAll('.unlock-button').forEach(button => {
        button.addEventListener('click', () => {
            modal.style.display = 'block';
        });
    });
}