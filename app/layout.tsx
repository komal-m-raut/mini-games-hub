import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import Script from 'next/script';
import { Fredoka, Nunito, JetBrains_Mono } from 'next/font/google';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';
import { RouteFocusManager } from '@/components/layout/RouteFocusManager';
import { ParticleBackground } from '@/components/ui/ParticleBackground';
import { MotionProvider } from '@/components/ui/MotionProvider';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from '@/lib/constants';
import './globals.css';

// Display: rounded and chunky rather than squared/technical. Orbitron's
// squared sci-fi letterforms were what made every heading read as a HUD
// readout instead of a game title.
const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-fredoka',
  display: 'swap',
});

// Body: humanist and soft-cornered, so it sits with the display face instead
// of fighting it.
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Tiny Arcadium — Free Mini Games You Can Play Instantly',
    template: '%s · Tiny Arcadium',
  },
  description:
    'Play free browser games instantly — no download, no signup. Tiny Arcadium collects quick memory, precision, and reflex games to relax and sharpen your mind.',
  keywords: [
    'free online games',
    'browser games no download',
    'mini games',
    'memory games',
    'quick games',
    'casual browser games',
    'brain games',
    'no signup games',
    'stress relief games',
    'balloon match',
    'reflex games',
    'precision games',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    siteName: 'Tiny Arcadium',
    title: 'Tiny Arcadium — Free Mini Games You Can Play Instantly',
    description:
      'Free browser games — memory, precision, and reflex challenges you can play instantly. No download, no signup.',
    type: 'website',
    url: '/',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Tiny Arcadium' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tiny Arcadium — Free Mini Games You Can Play Instantly',
    description:
      'Free browser games — memory, precision, and reflex challenges you can play instantly. No download, no signup.',
    images: ['/og.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Tiny Arcadium',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0F0F23',
  // Lets the page paint under the notch/status bar/home indicator in
  // installed standalone PWA mode (paired with `appleWebApp.statusBarStyle:
  // 'black-translucent'` above); content clears those areas via the
  // env(safe-area-inset-*) padding on the nav and footer (L15).
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${fredoka.variable} ${nunito.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/* Site-wide structured data so search engines understand what
            Tiny Arcadium is beyond the page copy. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
        {process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID}`}
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body className="scanlines">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-brand-purple focus:px-4 focus:py-2 focus:text-white focus:outline-none focus-visible:outline-2 focus-visible:outline-white"
        >
          Skip to content
        </a>
        <MotionProvider>
          <ServiceWorkerRegister />
          <RouteFocusManager />
          <ParticleBackground count={18} />
          <Navigation />
          <main
            id="main-content"
            tabIndex={-1}
            className="content-offset relative z-10 flex-1 flex flex-col"
          >
            {children}
          </main>
          <Footer />
          <Analytics />
        </MotionProvider>
      </body>
    </html>
  );
}
