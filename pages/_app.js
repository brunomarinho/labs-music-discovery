import '../styles/globals.css';
import '../styles/artist-page.css';
import '../styles/recommendations.css';
import { AuthProvider } from '../hooks/useAuth';
import Head from 'next/head';

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default MyApp;