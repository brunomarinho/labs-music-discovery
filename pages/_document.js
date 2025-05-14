import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Font stylesheets */}
        <link rel="stylesheet" href="https://use.typekit.net/jtt4bay.css" />
        
        {/* Favicon - moved from Layout since it's static */}
        <link rel="icon" href="/favicon.ico" />
        
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}