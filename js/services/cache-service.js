// Cache Service for local storage

// Cache keys
const CACHE_KEYS = {
    API_KEY: 'artist_explorer_api_key',
    SEARCH_PREFIX: 'artist_explorer_search_',
    ARTIST_DATA_PREFIX: 'artist_explorer_artist_',
    ARTIST_ALBUMS_PREFIX: 'artist_explorer_albums_',
    ARTIST_BIO_PREFIX: 'artist_explorer_bio_',
    ARTIST_RECOMMENDATIONS_PREFIX: 'artist_explorer_recommendations_',
    ARTIST_INFLUENCES_PREFIX: 'artist_explorer_influences_',
    PREFETCH_STATUS: 'artist_explorer_prefetch_status'
};

// Cache expiration times (in milliseconds)
const CACHE_EXPIRATION = {
    SEARCH: 24 * 60 * 60 * 1000, // 24 hours
    ARTIST_DATA: 7 * 24 * 60 * 60 * 1000, // 7 days
    ARTIST_ALBUMS: 7 * 24 * 60 * 60 * 1000, // 7 days
    ARTIST_BIO: 30 * 24 * 60 * 60 * 1000, // 30 days
    ARTIST_RECOMMENDATIONS: 30 * 24 * 60 * 60 * 1000, // 30 days
    ARTIST_INFLUENCES: 30 * 24 * 60 * 60 * 1000, // 30 days
    PREFETCH_STATUS: 90 * 24 * 60 * 60 * 1000 // 90 days
};

// Helper function to save data to localStorage with expiration
function saveToCache(key, data, expirationTime) {
    const item = {
        data: data,
        timestamp: Date.now(),
        expiration: expirationTime
    };
    
    try {
        localStorage.setItem(key, JSON.stringify(item));
        return true;
    } catch (error) {
        console.error('Error saving to cache:', error);
        return false;
    }
}

// Helper function to get data from localStorage and check expiration
function getFromCache(key) {
    try {
        const item = localStorage.getItem(key);
        if (!item) return null;
        
        const parsedItem = JSON.parse(item);
        const now = Date.now();
        
        // Check if cache has expired
        if (now - parsedItem.timestamp > parsedItem.expiration) {
            localStorage.removeItem(key);
            return null;
        }
        
        return parsedItem.data;
    } catch (error) {
        console.error('Error retrieving from cache:', error);
        return null;
    }
}

// API Key Management
export function saveApiKey(apiKey) {
    return saveToCache(CACHE_KEYS.API_KEY, apiKey, Number.MAX_SAFE_INTEGER); // Never expires
}

export function loadCachedApiKey() {
    return getFromCache(CACHE_KEYS.API_KEY);
}


// Search Results Caching
export function cacheSearchResults(searchTerm, results) {
    const key = CACHE_KEYS.SEARCH_PREFIX + searchTerm.toLowerCase();
    return saveToCache(key, results, CACHE_EXPIRATION.SEARCH);
}

export function getCachedSearch(searchTerm) {
    const key = CACHE_KEYS.SEARCH_PREFIX + searchTerm.toLowerCase();
    return getFromCache(key);
}

// Artist Data Caching
export function cacheArtistData(artistId, data) {
    const key = CACHE_KEYS.ARTIST_DATA_PREFIX + artistId;
    return saveToCache(key, data, CACHE_EXPIRATION.ARTIST_DATA);
}

export function getCachedArtistData(artistId) {
    const key = CACHE_KEYS.ARTIST_DATA_PREFIX + artistId;
    return getFromCache(key);
}

// Artist Albums Caching
export function cacheArtistAlbums(artistId, albums) {
    const key = CACHE_KEYS.ARTIST_ALBUMS_PREFIX + artistId;
    return saveToCache(key, albums, CACHE_EXPIRATION.ARTIST_ALBUMS);
}

export function getCachedArtistAlbums(artistId) {
    const key = CACHE_KEYS.ARTIST_ALBUMS_PREFIX + artistId;
    return getFromCache(key);
}

// Artist Bio Caching
export function cacheArtistBio(artistId, bio) {
    const key = CACHE_KEYS.ARTIST_BIO_PREFIX + artistId;
    return saveToCache(key, bio, CACHE_EXPIRATION.ARTIST_BIO);
}

export function getCachedArtistBio(artistId) {
    const key = CACHE_KEYS.ARTIST_BIO_PREFIX + artistId;
    return getFromCache(key);
}

// Artist Recommendations Caching
export function cacheArtistRecommendations(artistId, recommendations) {
    const key = CACHE_KEYS.ARTIST_RECOMMENDATIONS_PREFIX + artistId;
    return saveToCache(key, recommendations, CACHE_EXPIRATION.ARTIST_RECOMMENDATIONS);
}

export function getCachedArtistRecommendations(artistId) {
    const key = CACHE_KEYS.ARTIST_RECOMMENDATIONS_PREFIX + artistId;
    return getFromCache(key);
}

// Artist Influences Caching
export function cacheArtistInfluences(artistId, influences) {
    const key = CACHE_KEYS.ARTIST_INFLUENCES_PREFIX + artistId;
    return saveToCache(key, influences, CACHE_EXPIRATION.ARTIST_INFLUENCES);
}

export function getCachedArtistInfluences(artistId) {
    const key = CACHE_KEYS.ARTIST_INFLUENCES_PREFIX + artistId;
    return getFromCache(key);
}

// Prefetch status management
export function setPrefetchStatus(status = true) {
    return saveToCache(CACHE_KEYS.PREFETCH_STATUS, { 
        completed: status,
        timestamp: Date.now() 
    }, CACHE_EXPIRATION.PREFETCH_STATUS);
}

export function getPrefetchStatus() {
    return getFromCache(CACHE_KEYS.PREFETCH_STATUS);
}

// Bulk artist data operations
export function bulkCacheArtistData(artistsData) {
    if (!artistsData || !Array.isArray(artistsData) || artistsData.length === 0) {
        console.error('Invalid artist data provided for bulk caching');
        return false;
    }
    
    try {
        let successCount = 0;
        
        artistsData.forEach(artistData => {
            if (artistData && artistData.id) {
                const success = cacheArtistData(artistData.id, artistData);
                if (success) successCount++;
            }
        });
        
        console.log(`Bulk cached ${successCount}/${artistsData.length} artists`);
        return successCount > 0;
    } catch (error) {
        console.error('Error during bulk artist caching:', error);
        return false;
    }
}

// Bulk recommendations and influences operations
export function bulkCacheArtistRecommendations(artistRecommendations) {
    if (!artistRecommendations || typeof artistRecommendations !== 'object') {
        return false;
    }
    
    try {
        let successCount = 0;
        
        Object.entries(artistRecommendations).forEach(([artistId, recommendations]) => {
            if (recommendations) {
                const success = cacheArtistRecommendations(artistId, recommendations);
                if (success) successCount++;
            }
        });
        
        console.log(`Bulk cached recommendations for ${successCount} artists`);
        return successCount > 0;
    } catch (error) {
        console.error('Error during bulk recommendations caching:', error);
        return false;
    }
}

export function bulkCacheArtistInfluences(artistInfluences) {
    if (!artistInfluences || typeof artistInfluences !== 'object') {
        return false;
    }
    
    try {
        let successCount = 0;
        
        Object.entries(artistInfluences).forEach(([artistId, influences]) => {
            if (influences) {
                const success = cacheArtistInfluences(artistId, influences);
                if (success) successCount++;
            }
        });
        
        console.log(`Bulk cached influences for ${successCount} artists`);
        return successCount > 0;
    } catch (error) {
        console.error('Error during bulk influences caching:', error);
        return false;
    }
}

// Clear all cache
export function clearAllCache() {
    try {
        // Keep API keys and prefetch status, clear everything else
        const apiKey = loadCachedApiKey();
        const prefetchStatus = getPrefetchStatus();
        
        localStorage.clear();
        
        // Restore keys and prefetch status after clearing
        if (apiKey) {
            saveApiKey(apiKey);
        }
        
        if (prefetchStatus) {
            setPrefetchStatus(prefetchStatus.data.completed);
        }
        
        return true;
    } catch (error) {
        console.error('Error clearing cache:', error);
        return false;
    }
}

// Clear specific cache for recommendations and influences
export function clearLLMCache(artistId) {
    try {
        if (artistId) {
            // Remove specific artist cache entries
            const recommendationsKey = CACHE_KEYS.ARTIST_RECOMMENDATIONS_PREFIX + artistId;
            const influencesKey = CACHE_KEYS.ARTIST_INFLUENCES_PREFIX + artistId;
            
            localStorage.removeItem(recommendationsKey);
            localStorage.removeItem(influencesKey);
            
            console.log(`Cleared LLM cache for artist ID: ${artistId}`);
        } else {
            // Remove all LLM-related cache entries
            const keys = Object.keys(localStorage);
            
            keys.forEach(key => {
                if (key.startsWith(CACHE_KEYS.ARTIST_RECOMMENDATIONS_PREFIX) || 
                    key.startsWith(CACHE_KEYS.ARTIST_INFLUENCES_PREFIX)) {
                    localStorage.removeItem(key);
                }
            });
            
            console.log('Cleared all LLM cache entries');
        }
        
        return true;
    } catch (error) {
        console.error('Error clearing LLM cache:', error);
        return false;
    }
}