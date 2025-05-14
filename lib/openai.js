import OpenAI from 'openai';
import logger from './logger';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Get artist recommendations from OpenAI
 * @param {string} artistName - The name of the artist
 * @returns {Promise<Array>} - Array of artist recommendations
 */
export async function getArtistRecommendations(artistName) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    const prompt = `Give me 6 music artist recommendations similar to ${artistName}. Return only a JSON array with objects containing "name" (the artist name) and "reason" (a brief 1-2 sentence reason why this artist is similar). Format as [{name: "Artist Name", reason: "Brief reason"}]. Use a conversational, friendly tone and limit each reason to 100 characters max.`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: "You are a music recommendation expert. Provide accurate, thoughtful recommendations based on the artist name provided. Respond only with the requested JSON format." 
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    // Extract and parse the JSON from the response
    const responseText = response.choices[0].message.content;
    
    // Handle any text before or after the JSON array
    let jsonString = responseText.trim();
    
    // If response has backticks or other formatting, extract just the JSON part
    if (jsonString.includes('```')) {
      jsonString = jsonString.split('```')[1].replace('json', '').trim();
    }
    
    try {
      const recommendations = JSON.parse(jsonString);
      
      // Validate the response structure
      if (!Array.isArray(recommendations) || recommendations.length === 0) {
        throw new Error('Invalid response format');
      }
      
      // Ensure we have exactly 6 recommendations
      return recommendations.slice(0, 6);
    } catch (parseError) {
      logger.error('Error parsing OpenAI response:', parseError);
      throw new Error('Failed to parse recommendation data');
    }
  } catch (error) {
    logger.error('OpenAI API error:', error);
    throw error;
  }
}