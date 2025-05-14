import '../styles/globals.css';
import '../styles/artist-page.css';
import '../styles/recommendations.css';
import '../styles/error-fallbacks.css';
import '../styles/debug.css';
import { AuthProvider } from '../hooks/useAuth';
import Head from 'next/head';
import ErrorBoundary from '../components/ErrorBoundary';

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    </AuthProvider>
  );
}

export default MyApp;