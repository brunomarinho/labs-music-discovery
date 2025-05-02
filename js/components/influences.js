// Artist influences component
import { getLLMResponse } from '../services/llm-service.js';
import { cacheArtistInfluences, getCachedArtistInfluences } from '../services/cache-service.js';
import { searchArtistByName } from '../services/spotify-service.js';

export async function loadArtistInfluences(artistData, apiKey, forceRefresh = false) {
    if (!artistData || !apiKey) {
        console.error('Artist data or API key missing');
        return;
    }
    
    const influencesSection = document.getElementById('artistInfluences');
    const influencesVisualization = document.getElementById('influencesVisualization');
    const lockedContent = document.getElementById('influencesLockedContent');
    const refreshButton = document.getElementById('refreshInfluences');
    
    if (!influencesSection || !influencesVisualization || !lockedContent || !refreshButton) {
        console.error('Influences section elements not found');
        return;
    }
    
    // Show content and hide locked message
    influencesVisualization.classList.remove('hidden');
    lockedContent.classList.add('hidden');
    influencesSection.classList.remove('locked');
    refreshButton.classList.remove('hidden');
    
    // Set up refresh button click handler
    refreshButton.onclick = () => {
        loadArtistInfluences(artistData, apiKey, true);
    };
    
    try {
        // Add loading state
        influencesVisualization.innerHTML = `
            <div class="spinner-container">
                <div class="spinner"></div>
            </div>
        `;
        
        // Check cache first (unless forcing refresh)
        if (!forceRefresh) {
            const cachedInfluences = getCachedArtistInfluences(artistData.id);
            if (cachedInfluences) {
                console.log('Using cached influence tree for', artistData.name);
                await displayInfluences(cachedInfluences, influencesVisualization);
                return;
            }
        } else {
            // Clear cache if forcing refresh
            import('../services/cache-service.js').then(cacheModule => {
                cacheModule.clearLLMCache(artistData.id);
                console.log('Cleared influences cache for', artistData.name);
            });
        }
        
        // Construct prompt for the LLM
        const prompt = generateInfluencesPrompt(artistData);
        
        // Get influences from LLM
        console.log('Fetching fresh influence tree for', artistData.name);
        const influencesText = await getLLMResponse(prompt, apiKey);
        
        // Parse the influences
        const influenceTree = parseInfluences(influencesText);
        
        // Cache the result
        cacheArtistInfluences(artistData.id, influenceTree);
        
        // Display the influence tree visualization
        await displayInfluences(influenceTree, influencesVisualization);
    } catch (error) {
        console.error('Error loading artist influence tree:', error);
        displayInfluencesError(influencesVisualization);
    }
}

function generateInfluencesPrompt(artistData) {
    // Add more context about the artist to help generate more accurate influences
    const genres = artistData.genres && artistData.genres.length > 0 
        ? `Known for music in these genres: ${artistData.genres.join(', ')}` 
        : '';
    
    return `You are a music historian with expertise in artist influences and musical lineage.
    
    Task: Create a hierarchical influence tree for ${artistData.name} that shows both their direct influences and the earlier influences that shaped those artists, creating a multi-generational map of musical inspiration.
    
    Artist context: ${artistData.name} is a professional musician. ${genres}
    
    Instructions:
    1. Create a 3-level influence tree with:
       - LEVEL 1: ${artistData.name} as the root
       - LEVEL 2: 3-4 direct influences on ${artistData.name}
       - LEVEL 3: Earlier artists who influenced those LEVEL 2 artists
    2. Focus on verified, documented influences when possible
    3. Ensure connections across generations are meaningful and show clear musical lineage
    4. For each artist, include their active era (decade range) and specific musical elements they contributed to this lineage
    5. If specific connections are unclear, make reasonable estimates based on genre, style, and historical context
    
    Format your response as a JSON object with this structure:
    {
      "root": {
        "name": "${artistData.name}",
        "era": "The active decade range of the artist (e.g., '2010s-present')",
        "genre": "Primary genre"
      },
      "influences": [
        {
          "name": "Direct Influence 1",
          "genre": "Their primary genre",
          "era": "Their active decade range (e.g., '1970s-1990s')",
          "impact": "How they influenced ${artistData.name} (specific musical elements)",
          "connection": "Evidence of influence (interviews, similarities, etc.)",
          "earlier_influences": [
            {
              "name": "Earlier Influence A",
              "genre": "Their primary genre",
              "era": "Their active decade range (e.g., '1950s-1960s')",
              "impact": "How they influenced Direct Influence 1",
              "connection": "Evidence of this connection"
            },
            {
              "name": "Earlier Influence B",
              "genre": "Their primary genre",
              "era": "Their active decade range",
              "impact": "How they influenced Direct Influence 1",
              "connection": "Evidence of this connection"
            }
          ]
        },
        {
          "name": "Direct Influence 2",
          "genre": "Their primary genre",
          "era": "Their active decade range",
          "impact": "How they influenced ${artistData.name}",
          "connection": "Evidence of influence",
          "earlier_influences": [
            // Similar structure for earlier influences
          ]
        }
        // Continue with additional direct influences
      ]
    }
    
    Return ONLY the JSON object with no additional text.`;
}

function parseInfluences(text) {
    try {
        // Handle null or empty responses immediately
        if (!text || typeof text !== 'string') {
            console.warn('Received null or non-string response:', text);
            return createDefaultInfluenceTree();
        }
        
        // Try to extract JSON if the response has additional text
        let jsonStr = text;
        
        // First try to find a JSON object (tree structure)
        const jsonObjectMatch = text.match(/\{[\s\S]*\}/);
        
        // If we find an object, use it
        if (jsonObjectMatch) {
            jsonStr = jsonObjectMatch[0];
            const influenceTree = JSON.parse(jsonStr);
            
            // Validate the structure
            if (influenceTree.root && influenceTree.influences) {
                return influenceTree;
            }
        }
        
        // If that fails, look for an array (old format or fallback)
        const jsonArrayMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonArrayMatch) {
            jsonStr = jsonArrayMatch[0];
            const influences = JSON.parse(jsonStr);
            
            // Check if it's an array
            if (Array.isArray(influences)) {
                // Convert old format array to new tree format
                console.log('Converting array format to tree format');
                return convertArrayToTree(influences);
            }
        }
        
        // If both failed, throw error to trigger fallback
        throw new Error('Could not find valid JSON in response');
    } catch (error) {
        console.error('Failed to parse influence tree:', error);
        console.error('Original text:', text);
        
        // If we have text, try one more parsing attempt
        if (text && typeof text === 'string') {
            try {
                const simplifiedMatch = text.match(/[\[\{][\s\S]*[\]\}]/);
                if (simplifiedMatch) {
                    const parsed = JSON.parse(simplifiedMatch[0]);
                    
                    // If it's an array, convert it to tree format
                    if (Array.isArray(parsed)) {
                        console.log('Found array, converting to tree format as fallback');
                        return convertArrayToTree(parsed);
                    }
                    
                    // If it's an object and has a root property, it might be a tree
                    if (parsed && typeof parsed === 'object' && parsed.root) {
                        return parsed;
                    }
                }
            } catch (innerError) {
                console.error('Failed secondary parsing attempt:', innerError);
            }
        }
        
        // Return a fallback structure with an error message
        return createDefaultInfluenceTree();
    }
}

// Helper function to create a default influence tree structure
function createDefaultInfluenceTree() {
    // Get artist name from the page if available
    const artistName = document.getElementById('artistName')?.textContent || 'Artist';
    
    return {
        root: {
            name: artistName,
            era: 'Present',
            genre: document.getElementById('artistGenres')?.textContent || 'Various'
        },
        influences: [
            {
                name: 'Data unavailable',
                genre: 'N/A',
                era: 'N/A',
                impact: 'We could not retrieve influence data at this time. Please try again later.',
                connection: 'Try refreshing the data',
                earlier_influences: []
            },
            {
                name: 'Try again',
                genre: 'N/A',
                era: 'N/A',
                impact: 'Click the refresh button to try again, or check your API key settings.',
                connection: 'API connection issue',
                earlier_influences: []
            }
        ]
    };
}

// Helper function to convert old array format to new tree format
function convertArrayToTree(influencesArray) {
    // If the array has at least 4 elements, we'll use the first as the main influences
    // and the rest as earlier influences
    if (!Array.isArray(influencesArray) || influencesArray.length < 2) {
        throw new Error('Invalid influences array');
    }
    
    // Create the tree structure
    const tree = {
        root: {
            name: document.getElementById('artistName')?.textContent || 'Artist',
            era: 'Present',
            genre: document.getElementById('artistGenres')?.textContent || 'Various'
        },
        influences: []
    };
    
    // Take the first 2-3 items as direct influences
    const directInfluences = influencesArray.slice(0, Math.min(3, influencesArray.length));
    
    // Take remaining items as earlier influences
    const earlierInfluences = influencesArray.slice(Math.min(3, influencesArray.length));
    
    // Add direct influences
    directInfluences.forEach(influence => {
        tree.influences.push({
            name: influence.name,
            genre: influence.genre || 'Unknown',
            era: getEraFromGenre(influence.genre) || '1980s-2010s',
            impact: influence.impact || 'Influenced the artist\'s sound and approach.',
            connection: influence.connection || 'Musical similarity',
            earlier_influences: []
        });
    });
    
    // Distribute earlier influences among direct influences
    if (earlierInfluences.length > 0 && tree.influences.length > 0) {
        let index = 0;
        earlierInfluences.forEach(influence => {
            // Add to the appropriate direct influence
            const targetInfluence = tree.influences[index % tree.influences.length];
            
            targetInfluence.earlier_influences.push({
                name: influence.name,
                genre: influence.genre || 'Unknown',
                era: getEraFromGenre(influence.genre) || '1950s-1970s',
                impact: influence.impact || `Influenced ${targetInfluence.name}'s sound and approach.`,
                connection: influence.connection || 'Musical lineage'
            });
            
            index++;
        });
    }
    
    return tree;
}

// Helper function to estimate era from genre
function getEraFromGenre(genre) {
    if (!genre) return null;
    
    const genreLower = genre.toLowerCase();
    
    if (genreLower.includes('rock and roll') || genreLower.includes('blues') || 
        genreLower.includes('jazz') || genreLower.includes('folk') || 
        genreLower.includes('country') && !genreLower.includes('country pop')) {
        return '1950s-1960s';
    }
    
    if (genreLower.includes('disco') || genreLower.includes('punk') || 
        genreLower.includes('progressive') || genreLower.includes('classic rock')) {
        return '1970s-1980s';
    }
    
    if (genreLower.includes('grunge') || genreLower.includes('hip-hop') || 
        genreLower.includes('rap') || genreLower.includes('alternative')) {
        return '1990s-2000s';
    }
    
    if (genreLower.includes('edm') || genreLower.includes('trap') || 
        genreLower.includes('indie') || genreLower.includes('pop')) {
        return '2000s-2020s';
    }
    
    return null;
}

/**
 * Get actual artist image URL from Spotify
 */
async function getArtistImageUrl(artistName) {
    try {
        const artist = await searchArtistByName(artistName);
        if (artist && artist.images && artist.images.length > 0) {
            return {
                imageUrl: artist.images[0].url,
                spotifyUrl: artist.external_urls ? artist.external_urls.spotify : null
            };
        }
    } catch (error) {
        console.error(`Error getting image for artist "${artistName}":`, error);
    }
    
    // Return null if no image found or on error
    return { imageUrl: null, spotifyUrl: null };
}

async function displayInfluences(influenceTree, container) {
    // Update the container to the visualization container
    const visualizationContainer = document.getElementById('influencesVisualization');
    if (!visualizationContainer) {
        console.error('Influence visualization container not found');
        return;
    }
    
    visualizationContainer.classList.remove('hidden');
    visualizationContainer.innerHTML = '';
    
    if (!influenceTree.influences || influenceTree.influences.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'message-box empty-state';
        emptyMessage.textContent = 'No influences found for this artist.';
        visualizationContainer.appendChild(emptyMessage);
        return;
    }
    
    // Set visualization container height based on number of influences
    const totalDirectInfluences = influenceTree.influences.length;
    const totalEarlierInfluences = influenceTree.influences.reduce(
        (sum, influence) => sum + (influence.earlier_influences ? influence.earlier_influences.length : 0),
        0
    );
    
    // Minimum height, but grow if we have many influences
    visualizationContainer.style.height = `${Math.max(600, 200 + (totalDirectInfluences * 120) + (totalEarlierInfluences * 40))}px`;
    
    // Root node (the main artist)
    const rootNode = await createInfluenceNode(
        influenceTree.root.name, 
        influenceTree.root.genre,
        influenceTree.root.era,
        '', // no impact for root
        '', // no connection for root
        50, // x percentage
        10, // y percentage
        120, // size
        true // is root
    );
    visualizationContainer.appendChild(rootNode);
    
    // Create nodes for direct influences (level 2)
    const directInfluencePromises = [];
    const directInfluenceWidth = 80 / (totalDirectInfluences + 1); // space them out horizontally
    
    for (let i = 0; i < influenceTree.influences.length; i++) {
        const influence = influenceTree.influences[i];
        const xPercentage = 10 + ((i + 1) * directInfluenceWidth); // distribute horizontally
        const yPercentage = 35; // all at same level
        
        const directInfluencePromise = createInfluenceNode(
            influence.name,
            influence.genre,
            influence.era,
            influence.impact,
            influence.connection,
            xPercentage,
            yPercentage,
            100 // slightly smaller than root
        );
        
        directInfluencePromises.push(directInfluencePromise);
    }
    
    const directInfluenceNodes = await Promise.all(directInfluencePromises);
    
    // Add direct influence nodes to container
    directInfluenceNodes.forEach(node => {
        visualizationContainer.appendChild(node);
    });
    
    // Create connections from root to direct influences
    directInfluenceNodes.forEach(node => {
        const connection = createConnection(rootNode, node);
        visualizationContainer.appendChild(connection);
    });
    
    // Create nodes for earlier influences (level 3)
    let earlierInfluencePromises = [];
    let earlierToDirectMap = []; // to track which earlier influence connects to which direct influence
    
    for (let i = 0; i < influenceTree.influences.length; i++) {
        const directInfluence = influenceTree.influences[i];
        const directInfluenceNode = directInfluenceNodes[i];
        
        if (!directInfluence.earlier_influences || directInfluence.earlier_influences.length === 0) {
            continue;
        }
        
        const earlierCount = directInfluence.earlier_influences.length;
        const sectWidth = 70 / (totalDirectInfluences); // width of section for this direct influence's earlier influences
        const xStart = 10 + (i * sectWidth); // start x position for this section
        
        for (let j = 0; j < earlierCount; j++) {
            const earlierInfluence = directInfluence.earlier_influences[j];
            const xPercentage = xStart + ((j + 1) * (sectWidth / (earlierCount + 1))); // space within section
            const yPercentage = 70; // all at same level
            
            const earlierInfluencePromise = createInfluenceNode(
                earlierInfluence.name,
                earlierInfluence.genre,
                earlierInfluence.era,
                earlierInfluence.impact,
                earlierInfluence.connection,
                xPercentage,
                yPercentage,
                80 // smallest size
            );
            
            earlierInfluencePromises.push(earlierInfluencePromise);
            earlierToDirectMap.push(directInfluenceNode); // track parent
        }
    }
    
    const earlierInfluenceNodes = await Promise.all(earlierInfluencePromises);
    
    // Add earlier influence nodes to container
    earlierInfluenceNodes.forEach(node => {
        visualizationContainer.appendChild(node);
    });
    
    // Create connections from direct influences to their earlier influences
    earlierInfluenceNodes.forEach((node, index) => {
        const parentNode = earlierToDirectMap[index];
        const connection = createConnection(parentNode, node);
        visualizationContainer.appendChild(connection);
    });
}

async function createInfluenceNode(name, genre, era, impact, connection, xPercentage, yPercentage, size, isRoot = false) {
    // Create node element
    const node = document.createElement('div');
    node.className = 'influence-node';
    node.style.width = `${size}px`;
    node.style.height = `${size}px`;
    node.style.left = `calc(${xPercentage}% - ${size/2}px)`;
    node.style.top = `calc(${yPercentage}% - ${size/2}px)`;
    
    if (isRoot) {
        node.classList.add('root-node');
        node.style.border = '3px solid var(--primary-color)';
        node.style.zIndex = '5';
    }
    
    // Try to get artist image
    const { imageUrl, spotifyUrl } = await getArtistImageUrl(name);
    
    // SVG placeholder if no image
    const svgIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="%23777" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21v-2a7 7 0 0 0-14 0v2"/></svg>';
    
    // Set node content
    node.innerHTML = `
        ${imageUrl ? 
            `<img src="${imageUrl}" alt="${name}" loading="lazy">` : 
            `<div class="placeholder-image">${svgIcon}</div>`
        }
        <div class="node-name">${name}</div>
        ${era ? `<div class="node-era">${era}</div>` : ''}
    `;
    
    // Create tooltip with additional information
    if (impact || connection) {
        const tooltip = document.createElement('div');
        tooltip.className = 'influence-tooltip';
        tooltip.style.left = `calc(${xPercentage}% + ${size/2 + 10}px)`;
        tooltip.style.top = `calc(${yPercentage}% - 40px)`;
        
        tooltip.innerHTML = `
            <strong>${name}</strong>
            <div><em>${genre}</em> · ${era}</div>
            ${impact ? `<div class="tooltip-impact">${impact}</div>` : ''}
            ${connection ? `<div class="tooltip-source"><small>${connection}</small></div>` : ''}
        `;
        
        // Add tooltip after node in the DOM for hover effects
        node.dataset.tooltip = tooltip.outerHTML;
    }
    
    // Add click event to open in Spotify if URL is available
    if (spotifyUrl) {
        node.style.cursor = 'pointer';
        node.addEventListener('click', () => {
            window.open(spotifyUrl, '_blank');
        });
    }
    
    return node;
}

function createConnection(sourceNode, targetNode) {
    // Get positions
    const sourceRect = sourceNode.getBoundingClientRect();
    const targetRect = targetNode.getBoundingClientRect();
    
    // This is a simplified connection that will be updated after nodes are rendered
    const connection = document.createElement('div');
    connection.className = 'influence-connection';
    
    // We'll position properly after a timeout to ensure nodes are fully rendered
    setTimeout(() => {
        updateConnectionPosition(connection, sourceNode, targetNode);
    }, 100);
    
    return connection;
}

function updateConnectionPosition(connection, sourceNode, targetNode) {
    const sourceRect = sourceNode.getBoundingClientRect();
    const targetRect = targetNode.getBoundingClientRect();
    
    // Calculate center points
    const sourceX = sourceRect.left + sourceRect.width / 2;
    const sourceY = sourceRect.top + sourceRect.height / 2;
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;
    
    // Calculate distance and angle
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Position the connection
    connection.style.width = `${length}px`;
    connection.style.height = '2px';
    connection.style.left = `${sourceX}px`;
    connection.style.top = `${sourceY}px`;
    connection.style.transform = `rotate(${angle}deg)`;
    connection.style.transformOrigin = '0 0';
    
    // Add arrow at the end
    connection.style.position = 'absolute';
}

function displayInfluencesError(container) {
    container.innerHTML = '';
    
    const errorMessage = document.createElement('div');
    errorMessage.className = 'alert alert-error';
    errorMessage.textContent = 'Unable to load artist influence tree. Please check your API key or try again later.';
    
    container.appendChild(errorMessage);
}