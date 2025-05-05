/**
 * Shared Featured Artists Data
 * 
 * This file contains pre-selected artists for the featured section
 * and is used by both the client and server sides
 * 
 * - Contains just artist names for easy management
 * - Artists are organized by genre for easy categorization
 * - This data is used to pre-populate the cache for new users
 */

// Featured artists data structure
export const FEATURED_ARTISTS = {
    // Rock artists
    rock: [
        'blink-182',
        'Pete Townshend',
        'Steven Wilson'
    ],
    
    // Pop artists
    pop: [
        'Michael Jackson',
        'Madonna',
        'Bruce Springsteen'
    ],
    
    // Jazz artists
    jazz: [
        'Miles Davis',
        'John Coltrane',
        'Julian Lage'
    ]
};

// Internal cache mapping names to IDs, populated dynamically
const artistIdCache = new Map();

/**
 * Set the ID for a named artist
 * @param {string} artistName - The artist name
 * @param {string} id - The Spotify ID
 */
export function setArtistId(artistName, id) {
    if (artistName && id) {
        artistIdCache.set(artistName, id);
    }
}

/**
 * Get the ID for a named artist
 * @param {string} artistName - The artist name
 * @returns {string|null} The artist ID or null if not found
 */
export function getArtistId(artistName) {
    return artistIdCache.get(artistName) || null;
}

/**
 * Get a flat list of all featured artist names
 * @param {number} limit - Optional limit for the number of artists to return
 * @returns {Array} Array of artist names
 */
export function getFeaturedArtistNames(limit) {
    // Flatten the nested structure
    const allArtists = Object.values(FEATURED_ARTISTS).flat();
    
    // Return limited number or all
    return limit ? allArtists.slice(0, limit) : allArtists;
}

/**
 * Get a selection of featured artists with a specified number per category
 * @param {number} perCategory - Number of artists to include per category
 * @returns {Array} Array of artist names
 */
export function getCuratedFeaturedArtists(perCategory = 1) {
    const curated = [];
    
    // Get specified number of artists from each category
    Object.entries(FEATURED_ARTISTS).forEach(([category, artists]) => {
        const selected = artists.slice(0, perCategory);
        curated.push(...selected);
    });
    
    return curated;
}

/**
 * Get 3 featured artists for the homepage display
 * @returns {Array} Array of 3 artist names
 */
export function getHomepageFeatured() {
    // One artist from each of these three categories
    return [
        FEATURED_ARTISTS.rock[0],
        FEATURED_ARTISTS.pop[0],
        FEATURED_ARTISTS.jazz[0]
    ];
}

/**
 * Get all artist IDs that have been resolved
 * @returns {Array} Array of artist IDs
 */
export function getResolvedArtistIds() {
    return Array.from(artistIdCache.values());
}

// Add CommonJS compatibility for server-side use
if (typeof module !== 'undefined') {
    module.exports = {
        FEATURED_ARTISTS,
        getFeaturedArtistNames,
        getCuratedFeaturedArtists,
        getHomepageFeatured
    };
}