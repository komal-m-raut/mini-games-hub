import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import Script from 'next/script';
import { Bricolage_Grotesque, DM_Sans, JetBrains_Mono } from 'next/font/google';
import { Navigation } from '@/components/layout/Navigation';
import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { Footer } from '@/components/layout/Footer';
import { RouteFocusManager } from '@/components/layout/RouteFocusManager';
import { MotionProvider } from '@/components/ui/MotionProvider';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from '@/lib/constants';
import './globals.css';

/**
 * Two families, three jobs.
 *
 * Display — Space Grotesk. Geometric with enough personality in the a/g/y to
 * read as arcade rather than corporate, but with open counters and a normal
 * x-height, so it survives at 14px in a way Fredoka's bubbly forms did not.
 * Fredoka only really worked as a big heading face; anything small went soft.
 *
 * Body — Inter. Designed for UI at small sizes, which is most of this app:
 * hints, rules, leaderboard rows, captions.
 *
 * Both are on the same geometric-humanist axis, so they sit together without
 * one looking borrowed.
 */
const displayFont = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display-face',
  display: 'swap',
});

const bodyFont = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body-face',
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
    default: 'Tiny Arcadium — Small Games. Real Bragging Rights.',
    template: '%s · Tiny Arcadium',
  },
  description:
    'Play original browser skill games, take on the daily run, and challenge friends through private shareable leaderboards. No account or download.',
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
    'reflex games',
    'precision games',
    'puzzle games',
    'word games',
    'daily challenge games',
    'arcade games online',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    siteName: 'Tiny Arcadium',
    title: 'Tiny Arcadium — Small Games. Real Bragging Rights.',
    description:
      'Original quick skill games, daily runs, and private friend leaderboards. Play instantly with no account or download.',
    type: 'website',
    url: '/',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Tiny Arcadium games club' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tiny Arcadium — Small Games. Real Bragging Rights.',
    description:
      'Original quick skill games, daily runs, and private friend leaderboards. Play instantly.',
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
  themeColor: '#111815',
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
      className={`${displayFont.variable} ${bodyFont.variable} ${jetbrainsMono.variable}`}
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
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-brand-purple focus:px-4 focus:py-2 focus:text-white focus:outline-none focus-visible:outline-2 focus-visible:outline-white"
        >
          Skip to content
        </a>
        <MotionProvider>
          <ServiceWorkerRegister />
          <RouteFocusManager />
          <Navigation />
          <BottomTabBar />
          <main
            id="main-content"
            tabIndex={-1}
            className="content-offset hub-tabbar-pad relative z-10 flex-1 flex flex-col"
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
