// LLM Service for API interactions

// OpenAI API endpoint
const API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

// Function to send requests to the LLM API
export async function getLLMResponse(prompt, apiKey) {
    if (!apiKey) {
        throw new Error('API key is required');
    }
    
    if (!prompt) {
        throw new Error('Prompt is required');
    }
    
    // No mock data usage, we always use the real API
    
    // In a production app, you'd want to implement proper security for API key handling
    // For demo purposes, we'll use it client-side, but in real-world scenarios, this would be a server-side call
    
    try {
        console.log('Making LLM API request with prompt:', prompt.substring(0, 100) + '...');
        
        // Always try to use web search for recommendations
        // For other types of queries, make a decision based on what we need
        const isRecommendationsQuery = prompt.includes('recommendations');
        const useWebSearch = isRecommendationsQuery || prompt.includes('influences');
        
        // Prepare the request data
        let requestData;
        
        if (useWebSearch) {
            // Web search requires specific models and configuration
            const systemPrompt = isRecommendationsQuery 
                ? 'You are a music knowledge expert with access to the latest information. You research the MOST RECENT artist recommendations and statements from the past 12 months. Your job is to find the most up-to-date information from recent interviews, social media, and news. Format responses in valid JSON as requested. Focus on verifiable recommendations from the past year, with clear sources and dates.'
                : 'You are a music knowledge expert that provides accurate information about artists, their influences, and relationships. Format your responses according to the user\'s requested format. ALWAYS RESPOND WITH VALID JSON when asked for JSON format.';
            
            requestData = {
                model: 'gpt-4o-search-preview', // Special model required for web search
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 2000,
                web_search_options: {
                    search_context_size: "high", // Use high for more thorough search results
                }
            };
            
            // Add location if it's for recommendations to get more relevant results
            if (isRecommendationsQuery) {
                requestData.web_search_options.user_location = {
                    type: "approximate",
                    approximate: {
                        country: "US",
                        city: "New York",
                        region: "New York",
                    }
                };
            }
        } else {
            // Standard request without web search
            requestData = {
                model: 'gpt-4-1106-preview', // More widely available model
                messages: [
                    {
                        role: 'system',
                        content: 'You are a music knowledge expert that provides accurate information about artists, their influences, and their recommendations. Format your responses according to the user\'s requested format. ALWAYS RESPOND WITH VALID JSON when asked for JSON format.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000
            };
        }
        
        // Make the actual API call
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('API error:', errorData);
            
            // Handle various API errors and retry with fallback options
            const errorMessage = errorData.error?.message || '';
            
            // Log the specific error for debugging
            console.log('API Error Type:', errorMessage);
            
            // Check if the error is related to web search, model availability, or incompatible parameters
            if (errorMessage.includes('web_search') || 
                errorMessage.includes('not available') || 
                errorMessage.includes('Invalid model') ||
                errorMessage.includes('incompatible') ||
                errorMessage.includes('temperature')) {
                
                console.log('Web search or model not available, retrying with standard model...');
                
                // Update system message to emphasize the importance of recent information
                const isRecommendationsQuery = prompt.includes('recommendations');
                const updatedSystemMessage = isRecommendationsQuery 
                    ? 'You are a music knowledge expert. CRITICALLY IMPORTANT: You must focus EXCLUSIVELY on the MOST RECENT artist recommendations from the past 12 months. Prioritize information from 2023-2024. Avoid including older recommendations. If you are not 100% certain of the recency, you must state that clearly. Format responses as valid JSON with explicit dates for each recommendation.'
                    : 'You are a music knowledge expert that provides accurate information about artists, their influences, and their recommendations. Format your responses according to the user\'s requested format. ALWAYS RESPOND WITH VALID JSON when asked for JSON format.';
                
                // Create a fallback request with a standard model and no web search
                const fallbackRequest = {
                    model: 'gpt-4-turbo-preview', // Try GPT-4 Turbo first for better reasoning
                    messages: [
                        {
                            role: 'system',
                            content: updatedSystemMessage
                        },
                        {
                            role: 'user',
                            content: prompt + (isRecommendationsQuery 
                                ? "\n\nCRITICALLY IMPORTANT: You MUST focus EXCLUSIVELY on recommendations from the past 12 months. ONLY include recommendations that you can verify are from 2023-2024. If there aren't enough recent recommendations, return fewer items rather than including older ones." 
                                : "")
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000
                };
                
                const retryResponse = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(fallbackRequest)
                });
                
                if (!retryResponse.ok) {
                    throw new Error(`Retry HTTP error! Status: ${retryResponse.status}`);
                }
                
                const retryData = await retryResponse.json();
                if (retryData.choices && retryData.choices.length > 0) {
                    return retryData.choices[0].message.content;
                }
            }
            
            throw new Error(errorData.error?.message || `HTTP error! Status: ${response.status}`);
        }
        
        const responseData = await response.json();
        
        // Extract the content from the response
        if (responseData.choices && responseData.choices.length > 0) {
            const message = responseData.choices[0].message;
            
            // Log any annotations (used in web search for citations)
            if (message.annotations && message.annotations.length > 0) {
                console.log('Response contains annotations/citations:', 
                    message.annotations.map(a => {
                        if (a.type === 'url_citation') {
                            return `Citation: ${a.url_citation.url} (${a.url_citation.title})`;
                        }
                        return a;
                    }).join('\n')
                );
            }
            
            // Handle tool calls if present (older API versions)
            if (message.tool_calls && message.tool_calls.length > 0) {
                console.log('Response contains tool calls:', message.tool_calls);
                
                // Just return the content as is for now
                return message.content || 'API response did not contain usable content.';
            } 
            // Handle normal content
            else if (message.content) {
                return message.content;
            } 
            // No content found
            else {
                throw new Error('No content in the API response message');
            }
        } else {
            throw new Error('No choices in the API response');
        }
    } catch (error) {
        console.error('Error making LLM API request:', error);
        
        // Return a formatted error response based on the content type
        console.warn('API error occurred. Returning formatted error response');
        
        // Super fallback - never return null/undefined/empty responses
        if (prompt.includes('influences')) {
            return `[
                {
                    "name": "Data unavailable",
                    "genre": "N/A",
                    "impact": "We couldn't retrieve influence data. Please try again later or check your API key.",
                    "connection": "API error"
                },
                {
                    "name": "Service issue",
                    "genre": "N/A",
                    "impact": "There was a problem connecting to the API service.",
                    "connection": "Connection error"
                }
            ]`;
        } else if (prompt.includes('recommendations')) {
            return `[
                {
                    "name": "Data unavailable",
                    "type": "error",
                    "description": "We couldn't retrieve recommendation data. Please try again later or check your API key.",
                    "year": "",
                    "month": "",
                    "source": "API error"
                },
                {
                    "name": "Service issue",
                    "type": "error",
                    "description": "There was a problem connecting to the API service.",
                    "year": "",
                    "month": "",
                    "source": "Connection error"
                }
            ]`;
        } else {
            return 'Error retrieving data. Please try again later.';
        }
    }
}

// No mock data functions - all data comes from the API