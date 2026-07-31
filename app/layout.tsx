import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import Script from 'next/script';
import { Orbitron, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';
import { ParticleBackground } from '@/components/ui/ParticleBackground';
import { MotionProvider } from '@/components/ui/MotionProvider';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import { SITE_URL } from '@/lib/constants';
import './globals.css';

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-orbitron',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-space',
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
    default: 'Mini Games Hub — Stress-Buster Games',
    template: '%s · Mini Games Hub',
  },
  description:
    'A collection of quick, relaxing mini-games to relieve stress and sharpen your mind. Play Balloon Match and more!',
  keywords: ['mini games', 'stress relief', 'balloon match', 'casual games', 'browser games'],
  alternates: { canonical: '/' },
  openGraph: {
    siteName: 'Mini Games Hub',
    title: 'Mini Games Hub',
    description: 'Stress-buster mini games — instantly playable in your browser.',
    type: 'website',
    url: '/',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Mini Games Hub' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mini Games Hub',
    description: 'Stress-buster mini games — instantly playable in your browser.',
    images: ['/og.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MiniGames',
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${orbitron.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <head>
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
        <MotionProvider>
          <ServiceWorkerRegister />
          <ParticleBackground count={18} />
          <Navigation />
          <main className="relative z-10 pt-16 flex-1 flex flex-col">
            {children}
          </main>
          <Footer />
          <Analytics />
        </MotionProvider>
      </body>
    </html>
  );
}
