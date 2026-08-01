import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // API endpoints. Per-code challenge pages (unbounded unique URLs) are
      // kept out of the index via page-level `robots: { index: false }`
      // instead of a disallow here — combining both would be self-defeating,
      // since a crawler obeying disallow never sees the noindex tag.
      disallow: ['/api/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
