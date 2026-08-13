import type { MetadataRoute } from 'next';
import { GAME_REGISTRY } from '@/lib/gameRegistry';
import { SITE_URL } from '@/lib/constants';

/** Slugs under /guides/<slug> — kept in step with app/guides/page.tsx's own
 *  card list; there's no shared registry for guides (unlike games), so the
 *  two lists are hand-kept in sync the same way HOW_TO_PLAY_STEPS is
 *  duplicated per game page rather than centralised. */
const GUIDE_SLUGS = [
  'reaction-time',
  'working-memory',
  'color-perception',
  'mental-math',
  'stroop-effect',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const games = GAME_REGISTRY.filter((g) => g.isAvailable).map((g) => ({
    url: `${SITE_URL}${g.href}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const guides = GUIDE_SLUGS.map((slug) => ({
    url: `${SITE_URL}/guides/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // /profile and /daily ship from the parallel "meta" progression stream
  // (REDESIGN-PLAN.md) — listed here as plain URLs (this file doesn't
  // import their page components) so the sitemap is already correct once
  // those routes land, rather than needing a follow-up edit.
  const lowPriorityPages = ['/about', '/contact', '/profile', '/privacy', '/terms'].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.3,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...games,
    {
      url: `${SITE_URL}/guides`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    ...guides,
    {
      url: `${SITE_URL}/daily`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
    ...lowPriorityPages,
  ];
}
