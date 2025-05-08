/**
 * Simple build script to generate the HTML files with common components
 * This script creates the final HTML files by combining components
 */

const fs = require('fs');
const path = require('path');

// Read a file
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

// Write a file
function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Created ${filePath}`);
}

// Build the index.html file
function buildIndexHtml() {
  const head = readFile(path.join(__dirname, 'components', 'head.html'));
  const apiKeyModal = readFile(path.join(__dirname, 'components', 'api-key-modal.html'));
  const footer = readFile(path.join(__dirname, 'components', 'footer.html'));
  
  // Custom parts for index.html
  const indexContent = `<!DOCTYPE html>
<html lang="en">
<head>
    ${head}
    <title>Rec'd</title>
    <link rel="stylesheet" href="css/search.css">
    <link rel="stylesheet" href="css/featured-artists.css">
</head>
<body>
    <header>
        <div class="logo">Rec'd</div>
    </header>
    
    <main class="container">
        <section class="search-container">
            <h1>Find out what your favorite artists are listening</h1>
            
            <div class="search-bar-container" id="searchBarContainer">
                <input type="text" id="artistSearch" class="search-input" placeholder="Search (i.e. Foo Fighters)" autocomplete="off">
                <button class="search-button" id="searchButton">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </button>
                <div id="searchResults" class="search-results"></div>
            </div>
        </section>
        
        <section class="examples-section">
            <h2>Check some examples</h2>
            
            <div id="examples-container" class="examples-container">
                <!-- Examples will be loaded dynamically -->
                <div class="loading-indicator">
                    <div class="spinner"></div>
                    <p>Loading examples...</p>
                </div>
            </div>
        </section>
    </main>

    ${apiKeyModal}

    ${footer}
    
    <script type="module" src="js/main.js"></script>
</body>
</html>`;

  writeFile(path.join(__dirname, 'index.html'), indexContent);
}

// Build the results.html file
function buildResultsHtml() {
  const head = readFile(path.join(__dirname, 'components', 'head.html'));
  const apiKeyModal = readFile(path.join(__dirname, 'components', 'api-key-modal.html'));
  const footer = readFile(path.join(__dirname, 'components', 'footer.html'));
  
  // Custom parts for results.html
  const resultsContent = `<!DOCTYPE html>
<html lang="en">
<head>
    ${head}
    <title>Artist Recommendations - Rec'd</title>
    <link rel="stylesheet" href="css/results.css">
</head>
<body>
    <header>
        <div class="logo"><a href="index.html">Rec'd</a></div>
        
        <div class="mini-search-container">
            <input type="text" id="miniArtistSearch" class="mini-search-input" placeholder="Search (i.e. Foo Fighters)" autocomplete="off">
            <div id="miniSearchResults" class="search-results mini"></div>
        </div>
    </header>
    
    <main class="container results-container">
        <div class="back-button">
            <a href="index.html">&larr; Back to search</a>
        </div>
        
        <section id="artistHeader" class="artist-header loading">
            <div class="artist-info">
                <h1 id="artistName" class="skeleton-text">Artist Name</h1>
            </div>
        </section>
        
        <section id="artistRecommendations" class="artist-recommendations section-card">
            <h2>Recommends</h2>
            <p class="subtitle">Found in the past 12 months from interviews, social media and videos.</p>
            
            <button id="refreshRecommendations" class="refresh-button hidden">Refresh Recommendations</button>
            
            <div class="locked-content" id="recommendationsLockedContent">
                <p>Unlock artist recommendations by adding your OpenAI API key.</p>
                <button id="unlockRecommendations" class="unlock-button">Add API Key</button>
            </div>
            <div id="recommendationsContent" class="recommendations-content">
                <!-- Recommendations will be populated here -->
            </div>
        </section>
    </main>

    ${apiKeyModal}

    ${footer}
    
    <script type="module" src="js/results.js"></script>
</body>
</html>`;

  writeFile(path.join(__dirname, 'results.html'), resultsContent);
}

// Run the build process
console.log('Building HTML files with shared components...');
buildIndexHtml();
buildResultsHtml();
console.log('Build complete!');