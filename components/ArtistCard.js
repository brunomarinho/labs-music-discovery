import Link from 'next/link';
import { slugify, formatNumber, getPlaceholderImage } from '../lib/utils';

export default function ArtistCard({ artist }) {
  // Extract artist data
  const {
    name,
    image,
    genres = [],
    popularity = 0,
    followers = 0,
    spotifyUrl
  } = artist;

  return (
    <Link href={`/${slugify(name)}`} className="artist-card">
      <div className="artist-image-container">
        <img
          src={image || getPlaceholderImage()}
          alt={name}
          className="artist-image"
          width={200}
          height={200}
        />
      </div>
      
      <div className="artist-info">
        <h3 className="artist-name">{name}</h3>
        
        {genres && genres.length > 0 && (
          <div className="artist-genres">
            {genres.slice(0, 3).map((genre, index) => (
              <span key={index} className="genre-tag">
                {genre}
              </span>
            ))}
          </div>
        )}
        
        <div className="artist-stats">
          {followers > 0 && (
            <span className="artist-followers">
              {formatNumber(followers)} followers
            </span>
          )}
          
          {popularity > 0 && (
            <span className="artist-popularity">
              <span className="popularity-bar" style={{ width: `${popularity}%` }}></span>
              <span className="popularity-text">{popularity}% popularity</span>
            </span>
          )}
        </div>
        
        {spotifyUrl && (
          <a
            href={spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="spotify-link"
            onClick={(e) => e.stopPropagation()}
          >
            Open in Spotify
          </a>
        )}
      </div>
    </Link>
  );
}