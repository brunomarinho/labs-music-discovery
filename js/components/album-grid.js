// Album grid component
import { getArtistAlbums } from '../services/spotify-service.js';
import { cacheArtistAlbums, getCachedArtistAlbums } from '../services/cache-service.js';

export async function loadArtistAlbums(artistId) {
    if (!artistId) {
        console.error('Artist ID is required');
        return;
    }
    
    const albumsSection = document.getElementById('artistAlbums');
    const albumsGrid = document.getElementById('albumsGrid');
    
    if (!albumsSection || !albumsGrid) {
        console.error('Albums section elements not found');
        return;
    }
    
    try {
        // Check cache first
        const cachedAlbums = getCachedArtistAlbums(artistId);
        if (cachedAlbums) {
            displayAlbums(cachedAlbums, albumsGrid);
            albumsSection.classList.remove('loading');
            return;
        }
        
        // Get albums from Spotify API
        const albums = await getArtistAlbums(artistId);
        
        // Filter to show only albums and singles, not compilations
        const filteredAlbums = albums.filter(album => 
            album.album_type === 'album' || album.album_type === 'single'
        );
        
        // Sort by release date (newest first)
        filteredAlbums.sort((a, b) => {
            return new Date(b.release_date) - new Date(a.release_date);
        });
        
        // Limit to the 8 most recent albums
        const recentAlbums = filteredAlbums.slice(0, 8);
        
        // Cache the result
        cacheArtistAlbums(artistId, recentAlbums);
        
        // Display the albums
        displayAlbums(recentAlbums, albumsGrid);
    } catch (error) {
        console.error('Error loading artist albums:', error);
        displayAlbumsError(albumsGrid);
    } finally {
        albumsSection.classList.remove('loading');
    }
}

function displayAlbums(albums, container) {
    container.innerHTML = '';
    
    if (albums.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'message-box empty-state';
        emptyMessage.textContent = 'No albums found for this artist.';
        container.appendChild(emptyMessage);
        return;
    }
    
    albums.forEach(album => {
        const albumCard = document.createElement('div');
        albumCard.className = 'album-card';
        
        const albumYear = album.release_date ? new Date(album.release_date).getFullYear() : 'Unknown';
        const imageUrl = album.images && album.images.length > 0 ? 
            album.images[0].url : 
            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 24 24" fill="none" stroke="%23777" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>';
        
        albumCard.innerHTML = `
            <div class="album-cover">
                <img src="${imageUrl}" alt="${album.name}" loading="lazy" />
            </div>
            <div class="album-info">
                <div class="album-title">${album.name}</div>
                <div class="album-year">${albumYear}</div>
            </div>
        `;
        
        // Add click event to open album in Spotify
        albumCard.addEventListener('click', () => {
            if (album.external_urls && album.external_urls.spotify) {
                window.open(album.external_urls.spotify, '_blank');
            }
        });
        
        container.appendChild(albumCard);
    });
}

function displayAlbumsError(container) {
    container.innerHTML = '';
    
    const errorMessage = document.createElement('div');
    errorMessage.className = 'alert alert-error';
    errorMessage.textContent = 'Unable to load artist albums. Please try again later.';
    
    container.appendChild(errorMessage);
}