/**
 * Server-side cache for featured artists data
 * 
 * This module provides functions to:
 * 1. Cache artist data from Spotify
 * 2. Cache recommendations and influences from LLM
 * 3. Serve this cached data to clients
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Cache directory path
const CACHE_DIR = path.join(__dirname, 'server-cache');
const ARTIST_DATA_FILE = path.join(CACHE_DIR, 'artist-data.json');
const RECOMMENDATIONS_FILE = path.join(CACHE_DIR, 'recommendations.json');

// In-memory cache
let artistDataCache = {};
let recommendationsCache = {};

// Load shared artists data
const { FEATURED_ARTISTS, getHomepageFeatured, getFeaturedArtistNames } = require('./js/data/featured-artists');

// Artists for homepage display
const HOMEPAGE_FEATURED = getHomepageFeatured();

// Use the shared function to get all artist names
function getAllArtistNames() {
    return getFeaturedArtistNames();
}

// Initialize cache directory
function initCache() {
    if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
        console.log(`Created cache directory: ${CACHE_DIR}`);
    }
    
    // Load existing cache from disk if available
    try {
        if (fs.existsSync(ARTIST_DATA_FILE)) {
            artistDataCache = JSON.parse(fs.readFileSync(ARTIST_DATA_FILE, 'utf8'));
            console.log(`Loaded ${Object.keys(artistDataCache).length} artists from cache file`);
        }
        
        if (fs.existsSync(RECOMMENDATIONS_FILE)) {
            recommendationsCache = JSON.parse(fs.readFileSync(RECOMMENDATIONS_FILE, 'utf8'));
            console.log(`Loaded ${Object.keys(recommendationsCache).length} artist recommendations from cache file`);
        }
    } catch (error) {
        console.error('Error loading cache files:', error);
    }
}

// Save cache to disk
function saveCache() {
    try {
        fs.writeFileSync(ARTIST_DATA_FILE, JSON.stringify(artistDataCache, null, 2));
        fs.writeFileSync(RECOMMENDATIONS_FILE, JSON.stringify(recommendationsCache, null, 2));
        console.log('Cache saved to disk');
    } catch (error) {
        console.error('Error saving cache to disk:', error);
    }
}

/**
 * Get artist data from cache
 * @param {string} artistId - Spotify artist ID
 * @returns {Object|null} Artist data or null if not in cache
 */
function getArtistData(artistId) {
    return artistId && artistDataCache[artistId] ? artistDataCache[artistId] : null;
}

/**
 * Get artist by name from cache
 * @param {string} artistName - Artist name
 * @returns {Object|null} Artist data or null if not in cache
 */
function getArtistByName(artistName) {
    if (!artistName) return null;
    
    // Convert to lowercase for case-insensitive comparison
    const nameLower = artistName.toLowerCase();
    
    // Find in cache by name
    for (const artistId in artistDataCache) {
        const artist = artistDataCache[artistId];
        if (artist && artist.name && artist.name.toLowerCase() === nameLower) {
            return artist;
        }
    }
    
    return null;
}

/**
 * Get recommendations for an artist
 * @param {string} artistId - Spotify artist ID
 * @returns {Array|null} Recommendations or null if not in cache
 */
function getArtistRecommendations(artistId) {
    return artistId && recommendationsCache[artistId] ? recommendationsCache[artistId] : null;
}

/**
 * Save artist data to cache
 * @param {string} artistId - Spotify artist ID
 * @param {Object} data - Artist data
 */
function saveArtistData(artistId, data) {
    if (artistId && data) {
        artistDataCache[artistId] = data;
        saveCache();
    }
}

/**
 * Save recommendations for an artist
 * @param {string} artistId - Spotify artist ID
 * @param {Array} recommendations - Recommendations data
 */
function saveArtistRecommendations(artistId, recommendations) {
    if (artistId && recommendations) {
        recommendationsCache[artistId] = recommendations;
        saveCache();
    }
}


/**
 * Get all cached artists
 * @returns {Object} Map of artist IDs to artist data
 */
function getAllCachedArtists() {
    return { ...artistDataCache };
}

/**
 * Get all artist recommendations
 * @returns {Object} Map of artist IDs to recommendation data
 */
function getAllRecommendations() {
    return { ...recommendationsCache };
}

/**
 * Get homepage featured artists with full data
 * @returns {Array} Array of artist data objects with ID, name, images, etc.
 */
function getHomepageFeaturedArtists() {
    const result = [];
    
    // First try to get by exact name match
    HOMEPAGE_FEATURED.forEach(artistName => {
        const artist = getArtistByName(artistName);
        if (artist) {
            result.push(artist);
        }
    });
    
    return result;
}

/**
 * Clear all cache data
 */
function clearCache() {
    artistDataCache = {};
    recommendationsCache = {};
    saveCache();
}

// Initialize cache on module load
initCache();

// Export functions for use in server
module.exports = {
    getAllArtistNames,
    getArtistData,
    getArtistByName,
    getArtistRecommendations,
    saveArtistData,
    saveArtistRecommendations,
    getAllCachedArtists,
    getAllRecommendations,
    getHomepageFeaturedArtists,
    clearCache,
    HOMEPAGE_FEATURED
};