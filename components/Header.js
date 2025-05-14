import Link from 'next/link';

export default function Header() {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <Link href="/" className="logo">
            Rec'd
          </Link>
        </div>
        
        <div className="header-right">
          <div className="nav-links">
            <Link href="/test/openai-debug" className="nav-link">
              Test Page
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}