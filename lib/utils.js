/**
 * Converts artist name to a URL-friendly slug
 * @param {string} name - Artist name
 * @returns {string} - URL-friendly slug
 */
export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with single hyphen
    .trim();
}

/**
 * Converts a slug back to a readable name
 * @param {string} slug - URL-friendly slug
 * @returns {string} - Readable name
 */
export function deslugify(slug) {
  return slug
    .replace(/-/g, ' ') // Replace hyphens with spaces
    .replace(/\b\w/g, c => c.toUpperCase()); // Capitalize first letter of each word
}

/**
 * Formats large numbers for display
 * @param {number} num - Number to format
 * @returns {string} - Formatted number (e.g., "1.2M")
 */
export function formatNumber(num) {
  if (!num) return '0';
  
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  
  return num.toString();
}

/**
 * Truncates text to a specified length
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @returns {string} - Truncated text
 */
export function truncateText(text, length = 100) {
  if (!text || text.length <= length) return text;
  
  return text.substring(0, length - 3) + '...';
}

/**
 * Gets a placeholder image URL for artists without images
 * @returns {string} - Placeholder image URL
 */
export function getPlaceholderImage() {
  return '/placeholder-artist.jpg';
}

/**
 * Validates an email address
 * @param {string} email - Email to validate
 * @returns {boolean} - Whether email is valid
 */
export function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Validates a password for strength
 * @param {string} password - Password to validate
 * @returns {boolean} - Whether password is strong enough
 */
export function isValidPassword(password) {
  return password && password.length >= 8;
}

/**
 * Generates a random string for IDs
 * @param {number} length - Length of ID
 * @returns {string} - Random ID string
 */
export function generateId(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}