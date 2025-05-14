import SEO from './SEO';
import Header from './Header';

export default function Layout({ 
  children, 
  title = "Rec'd - Music Discovery",
  description = "Discover new music artists based on your favorites",
  canonical,
  ogImage,
  ogType
}) {
  // Prepare only props that were passed to Layout
  const seoProps = {
    title,
    ...(description && { description }),
    ...(canonical && { canonical }),
    ...(ogImage && { ogImage }),
    ...(ogType && { ogType })
  };
  
  return (
    <>
      <SEO {...seoProps} />

      <div className="layout">
        <Header />

        <main className="main-content">
          {children}
        </main>

        <footer className="footer">
          <div className="footer-content">
            <p>&copy; {new Date().getFullYear()} Rec'd - Find your next favorite artist</p>
          </div>
        </footer>
      </div>
    </>
  );
}