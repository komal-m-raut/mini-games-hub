import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // API endpoints and per-code challenge pages (unbounded unique URLs)
      disallow: ['/api/', '/games/balloon-match/challenge/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
