import Head from 'next/head';
import { useRouter } from 'next/router';

/**
 * SEO component for managing all page head elements
 * 
 * @param {Object} props
 * @param {string} props.title - Page title
 * @param {string} props.description - Page description
 * @param {string} props.canonical - Canonical URL (optional - auto-generated if not provided)
 * @param {string} props.ogImage - Open Graph image URL
 * @param {string} props.ogType - Open Graph type (default: website)
 */
export default function SEO({ 
  title = "Rec'd - Discover Your Next Favorite Artist",
  description = "Get personalized music artist recommendations based on your favorites",
  canonical,
  ogImage = "/og-image.jpg",
  ogType = "website"
}) {
  const router = useRouter();
  
  // Auto-generate canonical URL if not provided
  const canonicalUrl = canonical || 
    (router.pathname !== '/' ? `https://recd.app${router.asPath}` : 'https://recd.app');
  
  // Build the full title with brand
  const fullTitle = title.includes("Rec'd") ? title : `${title} | Rec'd`;
  
  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta property="og:url" content={canonicalUrl} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
    </Head>
  );
}