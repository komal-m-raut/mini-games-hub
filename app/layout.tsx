import type { Metadata, Viewport } from 'next';
import { Orbitron, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';
import { ParticleBackground } from '@/components/ui/ParticleBackground';
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
  title: 'Mini Games Hub — Stress-Buster Games',
  description:
    'A collection of quick, relaxing mini-games to relieve stress and sharpen your mind. Play Balloon Match and more!',
  keywords: ['mini games', 'stress relief', 'balloon match', 'casual games', 'browser games'],
  openGraph: {
    title: 'Mini Games Hub',
    description: 'Stress-buster mini games — instantly playable in your browser.',
    type: 'website',
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
      className={`${orbitron.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="scanlines">
        <ParticleBackground count={18} />
        <Navigation />
        <main className="relative z-10 pt-16 flex-1 flex flex-col">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
