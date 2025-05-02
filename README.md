# Artist Explorer

A web application that allows users to search for music artists and explore their recommendations and influences.

## Overview

Artist Explorer is a vanilla JavaScript application that provides users with information about music artists, including:

- Artist biographies
- Latest releases and albums
- Recommendations made by the artist to their fans
- Core influences that shaped the artist's music

The application uses a hybrid data retrieval strategy, combining structured data from music APIs (Spotify) with contextual information from LLM APIs (OpenAI) to provide a comprehensive view of artists and their musical connections.

## Key Features

- **Google-inspired search** with autocomplete for artist names
- **Clean, responsive UI** that works across desktop and mobile devices
- **Artist biography** section with concise information
- **Latest releases** display with album artwork
- **Artist recommendations** based on interviews and social media
- **Direct influences** derived from public sources and interviews
- **BYOK (Bring Your Own Key)** model for LLM API usage
- **Progressive enhancement** - basic functionality without API key, enhanced with user-provided key
- **Client-side caching** for efficient API usage

## Technology Stack

- **HTML5** for structure
- **CSS3** for styling (no frameworks)
- **Vanilla JavaScript (ES6+)** for functionality
- **Modular code organization** using ES6 modules
- **Node.js with Express** for server-side API proxy
- **Local Storage** for caching and API key management

## Getting Started

1. Clone the repository
2. Create a `.env` file in the root directory based on `.env.example`
3. Add your Spotify API credentials to the `.env` file
   ```
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   ```
4. Install dependencies
   ```
   npm install
   ```
5. Run the server
   ```
   npm start
   ```
6. Open http://localhost:3000 in your browser
7. Search for an artist
8. To unlock enhanced features (recommendations and influences), add your OpenAI API key through the UI

## API Usage

The application uses two primary data sources:

1. **Spotify API** for artist metadata, albums, and images (via server-side proxy)
2. **OpenAI API** (user-provided) for generating research-based information like recommendations and influences

## Project Structure

```
/artist-explorer
  /css
    main.css       - Base styles and variables
    search.css     - Search functionality styles
    results.css    - Results page styles
    components.css - Reusable component styles
  /js
    /components
      search-bar.js        - Search autocomplete functionality
      artist-bio.js        - Artist biography section
      album-grid.js        - Album display grid
      recommendations.js   - Artist recommendations section
      influences.js        - Artist influences section
      api-key-modal.js     - API key management modal
    /services
      spotify-service.js   - Spotify API interactions
      llm-service.js       - LLM API interactions
      cache-service.js     - Local storage caching
    /utils
      dom-helpers.js       - DOM utility functions
    main.js                - Main entry point
    results.js             - Results page logic
  server.js               - Express server for API proxy
  .env                    - Environment variables (not committed)
  .env.example            - Example environment variables
  index.html              - Search page
  results.html            - Artist details page
  package.json            - Dependencies and scripts
```

## Future Enhancements

- Add full OAuth flow for Spotify API authentication
- Include music preview functionality
- Expand artist relationships visualization
- Add more data sources for comprehensive artist information

## Security Notes

- All OpenAI API keys are stored client-side only
- Spotify API credentials are securely stored in server environment variables
- No user data is collected or stored on the server