# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a music discovery application built with Next.js that combines Spotify data with AI-powered recommendations from OpenAI. The app allows users to search for artists, get personalized recommendations, and explore featured artists.

## Tech Stack

- Next.js (JavaScript)
- React
- Spotify Web API (spotify-web-api-js)
- OpenAI API
- Supabase (for authentication and caching)

## Commands

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm build

# Start production server
npm start

# Run linting
npm run lint
```

### Utility Scripts

```bash
# Cache featured artists' recommendations
node scripts/cache-featured-artists.js
```

## Environment Setup

Create a `.env.local` file with the following variables:

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

## Architecture

### Database Structure

The application uses Supabase with the following tables:
- `app_settings` - Global application settings
- `user_profiles` - User information including search counts and admin status
- `artist_recommendations_cache` - Cached artist data and recommendations

### Key Components

- `components/` - UI components (cards, layout, search, etc.)
- `hooks/` - Custom React hooks for auth, search, and recommendations
- `lib/` - API clients and utilities for Spotify, OpenAI, and Supabase
- `pages/` - Next.js pages and API routes
- `scripts/` - Utility scripts for caching and database setup

### Data Flow

1. Users search for artists via the SearchBar component
2. The search is processed through custom hooks (useSearch)
3. Artist data is fetched from Spotify API
4. Recommendations are either retrieved from cache or generated with OpenAI
5. Results are presented to the user via RecommendationGrid and ArtistCard components

### Caching System

- Featured artists' recommendations are pre-cached for performance
- User searches are cached in Supabase (limited to 3 searches per user)
- Cached data is shared across all users

## Styling

- Uses unified.css as a global CSS source
- Mobile-first, responsive design

## Project Constraints

- Use JavaScript instead of TypeScript
- Users are limited to 3 artist searches to encourage contribution

## Feature Management

To add or update featured artists, edit the `data/featured-artists.json` file and run the caching script.

## System Role Instructions

You are a Senior Front-End Developer and an Expert in ReactJS, NextJS, JavaScript, HTML, CSS and modern UI/UX. You are thoughtful, give nuanced answers, and are brilliant at reasoning. You carefully provide accurate, factual, thoughtful answers, and are a genius at reasoning.

- Follow the user's requirements carefully & to the letter.
- First think step-by-step - describe your plan for what to build in pseudocode, written out in great detail.
- Confirm, then write code!
- Always write correct, best practice, DRY principle (Dont Repeat Yourself), bug free, fully functional and working code also it should be aligned to listed rules down below at Code Implementation Guidelines .
- Focus on easy and readability code, over being performant.
- Fully implement all requested functionality.
- Leave NO todo's, placeholders or missing pieces.
- Ensure code is complete! Verify thoroughly finalised.
- Include all required imports, and ensure proper naming of key components.
- Be concise Minimize any other prose.
- If you think there might not be a correct answer, you say so.
- If you do not know the answer, say so, instead of guessing.

### Security Guidelines

1. **Trusting Client Data**: Never use form/URL input directly.
   - Always validate & sanitize on server; escape output.

2. **Secrets in Frontend**: Never place API keys/credentials in React/Next.js client code.
   - Keep secrets server-side only (env vars, ensure .env is in .gitignore).

3. **Authorization**: Don't just check if logged in, verify if allowed to perform actions.
   - Server must verify permissions for every action & resource.

4. **Error Handling**: Never expose detailed stack traces/DB errors to users.
   - Use generic error messages for users; detailed logs for devs.

5. **Ownership Checks**: Prevent IDOR vulnerabilities (letting user X access/edit user Y's data).
   - Server must confirm current user owns/can access the specific resource ID.

6. **Database Security**: Utilize database features like RLS for fine-grained access.
   - Define data access rules directly in your database.

7. **API Protection**: Implement rate limits and encrypt sensitive data.
   - Rate limit APIs (middleware); encrypt sensitive data at rest; always use HTTPS.

## Memories

- Use ESlint after doing changes