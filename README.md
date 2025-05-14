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
node scripts/cache-featured-artists.js
```

This script will:
- Search for each artist on Spotify to get their ID
- Fetch artist details, top tracks, and related artists
- Generate AI recommendations using OpenAI
- Cache all this data in Supabase for faster page loads

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

1. Featured artists' recommendations are pre-cached using the `cache-featured-artists.js` script
2. The script fetches data from Spotify and generates AI recommendations
3. All data is stored in Supabase for fast access
4. The cache can be refreshed by running the script again

## License

MIT