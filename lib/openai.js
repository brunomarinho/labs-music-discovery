import OpenAI from 'openai';
import logger from './logger';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Get artist recommendations from OpenAI using web search capability
 * @param {string} artistName - The name of the artist
 * @param {string} artistId - Spotify ID of the artist (for tracking in logs)
 * @param {boolean} useWebSearch - Whether to use web search capability (default: true)
 * @returns {Promise<Array>} - Array of artist recommendations
 */
export async function getArtistRecommendations(artistName, artistId = null, useWebSearch = true) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    // System prompt for web search
    const systemPrompt = useWebSearch ? 
      `You are a music-industry research specialist with full websearch access. ` +
      `Find the MOST RECENT (past 12 months) instances where ${artistName} has ` +
      `EXPLICITLY recommended another artist, album, or song—only in interviews, podcasts, ` +
      `YouTube videos, or social-media posts (no hearsay). ` +
      `For each entry you must:` +
      `\n  • Verify that the sourceUrl responds over HTTPS with HTTP 200.` +
      `\n  • Only use domains ending in .com, .org, or .net.` +
      `\n  • Extract: name, type (artist|album|song), exact quote, year, month, source type, domain, author (if known).` +
      `\nCRITICAL:` +
      `\n 1) Output only valid JSON: an array starting with "[" and ending with "]".` +
      `\n 2) Do NOT wrap in code fences or add any text before/after.` +
      `\n 3) If nothing is found, return \`[]\` exactly.` :
      
      // Fallback system prompt for when web search is not available
      `You are an expert on modern music. ` +
      `Provide 6 artists, albums, or songs similar to ${artistName}. ` +
      `Return ONLY a JSON array with objects containing "name" (artist/album/song name), ` +
      `"type" (artist|album|song), and "reason" (brief explanation why it's similar). ` +
      `Each reason should be conversational and limited to 100 characters max. ` +
      `Output format: [{name:"Name", type:"artist|album|song", reason:"Brief reason"}]. ` +
      `No text or code fences before or after the JSON.`;

    // User prompt for web search
    const userPrompt = useWebSearch ?
      `Search for instances in the last 12 months where ${artistName}${artistId ? ` (id: ${artistId})` : ''} ` +
      `has explicitly recommended music to others (artist, album, or song) in interviews, ` +
      `podcasts, YouTube videos, or social-media posts.  

       For each recommendation, verify that the URL:  
       • Uses HTTPS  
       • Returns HTTP status 200  
       • Is on a .com, .org, or .net domain  

       Output **only** a JSON array of objects with exactly these fields:
       [
         {
           "name":        "Artist/Album/Song Name",
           "type":        "artist|album|song",
           "quote":       "Exact excerpt of recommendation",
           "year":        "YYYY",
           "month":       "MM",
           "source":      "Interview|Podcast|YouTube|Social media",
           "domain":      "example.com", 
           "author":      "Interviewer or poster name (if known)",
           "sourceUrl":   "https://…"
         },
         …
       ]

       **IMPORTANT:**
       - Do not include any text before or after the JSON.
       - If any record fails URL or domain validation, omit it.
       - If you find no valid recommendations, return \`[]\`.` :
      
      // Fallback user prompt
      `Give me 6 music recommendations similar to ${artistName}. Include only artists, albums, or songs that real fans of ${artistName} would enjoy, with a focus on similar style and sound.`;

    logger.log(`Making OpenAI request for artist ${artistName}${artistId ? ` (${artistId})` : ''} with web search: ${useWebSearch}`);

    // Create the OpenAI chat completion with web search
    const response = await openai.chat.completions.create({
      model: "gpt-4o-search-preview",  // Use gpt-4o-search-preview for all requests
      messages: [
        { 
          role: "system", 
          content: systemPrompt
        },
        { 
          role: "user", 
          content: userPrompt
        }
      ],
      // Note: temperature parameter removed as it's not supported with search-preview model
      max_tokens: 4000,
      web_search_options: useWebSearch ? {
        search_context_size: "medium"  // Balanced context, cost, and latency
      } : undefined
    });

    // Extract response content and any citations
    const responseText = response.choices[0].message.content;
    const annotations = response.choices[0].message.annotations || [];
    
    // Log citations if available
    if (annotations && annotations.length > 0) {
      logger.log(`Found ${annotations.length} citations in OpenAI response`);
    }
    
    // Handle any text before or after the JSON array
    let jsonString = responseText.trim();
    
    // If response has backticks or other formatting, extract just the JSON part
    if (jsonString.includes('```')) {
      jsonString = jsonString.split('```')[1].replace('json', '').trim();
    }
    
    try {
      // Parse and validate the JSON
      const recommendations = JSON.parse(jsonString);
      
      // Validate the response structure
      if (!Array.isArray(recommendations)) {
        throw new Error('Invalid response format - not an array');
      }
      
      // If no recommendations found, return empty array
      if (recommendations.length === 0) {
        logger.log(`No recommendations found for ${artistName}`);
        return [];
      }
      
      // If we're using web search, validate the structure with required fields
      if (useWebSearch) {
        const validatedRecommendations = recommendations.filter(rec => {
          const hasRequiredFields = rec.name && rec.type && (rec.quote || rec.reason);
          const validType = ['artist', 'album', 'song'].includes(rec.type.toLowerCase());
          return hasRequiredFields && validType;
        });
        
        // Process citations if available
        if (annotations && annotations.length > 0) {
          // Add citation data to recommendations where applicable
          validatedRecommendations.forEach(rec => {
            // Add a sources array to track citations
            rec.sources = extractSourcesForRecommendation(rec.name, responseText, annotations);
          });
        }
        
        // Limit to 10 recommendations
        return validatedRecommendations.slice(0, 10);
      }
      
      // For non-web search, ensure we have exactly 6 recommendations
      return recommendations.slice(0, 6);
    } catch (parseError) {
      logger.error('Error parsing OpenAI response:', parseError);
      logger.error('Raw response:', responseText);
      throw new Error('Failed to parse recommendation data');
    }
  } catch (error) {
    logger.error('OpenAI API error:', error);
    throw error;
  }
}

/**
 * Extract sources/citations for a specific recommendation
 * @param {string} artistName - The name of the artist in the recommendation
 * @param {string} content - The full response text
 * @param {Array} annotations - The annotations from the OpenAI response
 * @returns {Array} - Array of source objects with url and title
 */
function extractSourcesForRecommendation(artistName, content, annotations) {
  if (!annotations || !annotations.length || !artistName || !content) {
    return [];
  }
  
  const sources = [];
  const artistNameLower = artistName.toLowerCase();
  
  // Process URL citations
  annotations.forEach(annotation => {
    if (annotation.type === 'url_citation' && annotation.url_citation) {
      const { url, title, start_index, end_index } = annotation.url_citation;
      
      // Get the cited text
      const citedText = content.substring(start_index, end_index).toLowerCase();
      
      // Check if this citation mentions our artist
      if (citedText.includes(artistNameLower)) {
        sources.push({
          url,
          title: title || url
        });
      }
    }
  });
  
  return sources;
}