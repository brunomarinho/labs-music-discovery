# Music Discovery App

A music recommendation application built with Next.js that combines Spotify data and AI-powered recommendations.

## Features

- Spotify authentication and integration
- Personalized music recommendations
- AI-generated artist recommendations using OpenAI
- Featured artists with cached recommendations
- Responsive, mobile-first design

## Tech Stack

- Next.js
- React
- Spotify Web API
- OpenAI API
- Supabase (for caching recommendations)

## Getting Started

### Prerequisites

- Node.js 14.x or higher
- npm or yarn
- Spotify Developer account
- OpenAI API key
- Supabase account

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/music-discovery-nextjs.git
cd music-discovery-nextjs
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

Create a `.env.local` file in the root directory with the following variables:

```
# Spotify API Credentials
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key

# Supabase settings
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/api/auth/callback/spotify
```

4. Set up your featured artists

Edit the `data/featured-artists.json` file to include the artists you want to feature:

```json
[
  "Artist Name 1",
  "Artist Name 2",
  "Artist Name 3"
]
```

5. Cache featured artists' recommendations

```bash
npm run cache
```

This script will:
- Search for each artist on Spotify to get their ID
- Fetch artist details and basic info
- Generate AI-powered recommendations using OpenAI
- Cache all this data for faster page loads

**Important:** This is the ONLY way to refresh recommendations. The application UI does not include any functionality to refresh recommendations - all updates must be done by admins running this script.

6. Run the development server

```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

- `/components` - Reusable UI components
- `/pages` - Next.js pages and API routes
- `/lib` - Utilities and API clients
- `/styles` - CSS files and styling
- `/hooks` - Custom React hooks
- `/data` - JSON data files including featured artists
- `/scripts` - Utility scripts for caching and data management

## Caching System

The application uses a caching system to improve performance:

1. Featured artists' recommendations are pre-cached using the cache script
2. Run the script with: `npm run cache`
3. The script fetches basic artist data from Spotify
4. AI-powered recommendations are generated via OpenAI
5. All data is cached for fast access
6. **Admin Only:** The cache can only be refreshed by running the script again, there is no user-facing refresh functionality

### Advanced Cache Options

For debugging or development purposes:

```bash
# Show verbose output during caching
npm run cache -- --debug

# Force refresh of all artists even if they're already cached
npm run cache -- --force
```

## License

MIT