import { describe, expect, it } from 'vitest';
import { buildArticleJsonLd, buildGameJsonLd, jsonLdScriptProps } from '@/lib/seo';
import { GAME_REGISTRY } from '@/lib/gameRegistry';
import { SITE_URL } from '@/lib/constants';
import { GameContent } from '@/types/content';
import { GameMeta } from '@/types/game';
import sitemap from '@/app/sitemap';

const FIXTURE_META: GameMeta = {
  id: 'test-game',
  title: 'Test Game',
  category: 'memory',
  description: 'A fixture game used only by tests.',
  tagline: 'Focus & recall',
  howTo: 'Do the thing.',
  emoji: '🧪',
  accent: '#123456',
  isAvailable: true,
  href: '/games/test-game',
};

const FIXTURE_CONTENT: GameContent = {
  intro: ['Paragraph one.', 'Paragraph two.'],
  tips: ['Tip one.', 'Tip two.'],
  faq: [
    { q: 'How is scoring calculated?', a: 'Accuracy converts to a score out of 10.' },
    { q: 'Is it free?', a: 'Yes, completely free.' },
  ],
  related: ['balloon-match', 'timing-tap'],
};

describe('buildGameJsonLd', () => {
  const result = buildGameJsonLd({
    meta: FIXTURE_META,
    content: FIXTURE_CONTENT,
    longDescription: 'The long, keyword-bearing description of the fixture game.',
  });

  it('returns exactly [VideoGame, FAQPage, BreadcrumbList], in that order', () => {
    expect(result).toHaveLength(3);
    expect((result[0] as { '@type': string })['@type']).toBe('VideoGame');
    expect((result[1] as { '@type': string })['@type']).toBe('FAQPage');
    expect((result[2] as { '@type': string })['@type']).toBe('BreadcrumbList');
  });

  it('VideoGame carries the correct name, url and genre', () => {
    const videoGame = result[0] as Record<string, unknown>;
    expect(videoGame.name).toBe('Test Game');
    expect(videoGame.url).toBe(`${SITE_URL}/games/test-game`);
    // genre comes from CATEGORY_META[meta.category].label, not a hand-picked
    // per-game string — 'memory' -> 'Memory'.
    expect(videoGame.genre).toBe('Memory');
    expect(videoGame.description).toBe('The long, keyword-bearing description of the fixture game.');
    expect(videoGame.applicationCategory).toBe('Game');
    expect(videoGame.operatingSystem).toBe('Any');
    expect(videoGame.isAccessibleForFree).toBe(true);
    expect(videoGame.offers).toEqual({ '@type': 'Offer', price: '0', priceCurrency: 'USD' });
  });

  it('FAQPage mirrors the content.faq array 1:1', () => {
    const faqPage = result[1] as { mainEntity: Array<Record<string, unknown>> };
    expect(faqPage.mainEntity).toHaveLength(FIXTURE_CONTENT.faq.length);
    faqPage.mainEntity.forEach((entry, i) => {
      expect(entry['@type']).toBe('Question');
      expect(entry.name).toBe(FIXTURE_CONTENT.faq[i].q);
      expect(entry.acceptedAnswer).toEqual({
        '@type': 'Answer',
        text: FIXTURE_CONTENT.faq[i].a,
      });
    });
  });

  it('BreadcrumbList goes Home -> SITE_URL, then the game title -> its page URL', () => {
    const breadcrumbs = result[2] as { itemListElement: Array<Record<string, unknown>> };
    expect(breadcrumbs.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Test Game', item: `${SITE_URL}/games/test-game` },
    ]);
  });

  it('derives genre from the registry category for a real game too', () => {
    const timingTap = GAME_REGISTRY.find((g) => g.id === 'timing-tap')!;
    const [videoGame] = buildGameJsonLd({
      meta: timingTap,
      content: FIXTURE_CONTENT,
      longDescription: 'x',
    }) as [Record<string, unknown>, unknown, unknown];
    expect(videoGame.genre).toBe('Reflex');
  });
});

describe('buildArticleJsonLd', () => {
  const article = buildArticleJsonLd({
    title: 'How to Improve Your Reaction Time',
    description: 'A short, honest guide to reaction time.',
    slug: '/guides/reaction-time',
    datePublished: '2026-08-13',
  }) as Record<string, unknown>;

  it('has the right @type, headline, description and dates', () => {
    expect(article['@context']).toBe('https://schema.org');
    expect(article['@type']).toBe('Article');
    expect(article.headline).toBe('How to Improve Your Reaction Time');
    expect(article.description).toBe('A short, honest guide to reaction time.');
    expect(article.datePublished).toBe('2026-08-13');
    expect(article.url).toBe(`${SITE_URL}/guides/reaction-time`);
  });

  it('author and publisher are both the Mettle organization', () => {
    const org = { '@type': 'Organization', name: 'Mettle', url: SITE_URL };
    expect(article.author).toEqual(org);
    expect(article.publisher).toEqual(org);
  });

  it('mainEntityOfPage points at the article URL', () => {
    expect(article.mainEntityOfPage).toEqual({
      '@type': 'WebPage',
      '@id': `${SITE_URL}/guides/reaction-time`,
    });
  });
});

describe('jsonLdScriptProps', () => {
  it('sets type to application/ld+json', () => {
    expect(jsonLdScriptProps({ a: 1 }).type).toBe('application/ld+json');
  });

  it('serialises the data as the __html payload', () => {
    const props = jsonLdScriptProps({ a: 1, b: 'two' });
    expect(props.dangerouslySetInnerHTML.__html).toBe(JSON.stringify({ a: 1, b: 'two' }));
  });

  it("escapes '<' so a string value can't close out of the script tag", () => {
    const props = jsonLdScriptProps({ text: '</script><script>alert(1)</script>' });
    // Only '<' is escaped (matching the repo-wide pattern in app/layout.tsx
    // and every game page) — that alone is enough to stop a "</script>"
    // sequence from closing the tag early, since '>' on its own is inert.
    expect(props.dangerouslySetInnerHTML.__html).not.toContain('<');
    expect(props.dangerouslySetInnerHTML.__html).toContain('\\u003cscript>');
    expect(props.dangerouslySetInnerHTML.__html).toContain('\\u003c/script>');
  });

  it('accepts an array (the buildGameJsonLd shape) as well as a single object', () => {
    const props = jsonLdScriptProps([{ '@type': 'A' }, { '@type': 'B' }]);
    expect(JSON.parse(props.dangerouslySetInnerHTML.__html)).toEqual([
      { '@type': 'A' },
      { '@type': 'B' },
    ]);
  });
});

describe('sitemap', () => {
  // The default export is a plain function returning a static array — pure,
  // so it's called directly rather than hit over HTTP.
  const entries = sitemap();
  const urls = entries.map((e) => e.url);

  it('includes the homepage at the top priority', () => {
    const home = entries.find((e) => e.url === SITE_URL);
    expect(home).toBeTruthy();
    expect(home?.priority).toBe(1);
    expect(home?.changeFrequency).toBe('weekly');
  });

  it('lists every available game at priority 0.8, and no unavailable ones', () => {
    for (const game of GAME_REGISTRY.filter((g) => g.isAvailable)) {
      const entry = entries.find((e) => e.url === `${SITE_URL}${game.href}`);
      expect(entry, `expected a sitemap entry for ${game.id}`).toBeTruthy();
      expect(entry?.priority).toBe(0.8);
      expect(entry?.changeFrequency).toBe('weekly');
    }
    for (const game of GAME_REGISTRY.filter((g) => !g.isAvailable)) {
      expect(urls).not.toContain(`${SITE_URL}${game.href}`);
    }
  });

  it('lists the guides hub and all five articles at priority 0.7', () => {
    const guideSlugs = [
      'reaction-time',
      'working-memory',
      'color-perception',
      'mental-math',
      'stroop-effect',
    ];
    const hub = entries.find((e) => e.url === `${SITE_URL}/guides`);
    expect(hub?.priority).toBe(0.7);

    for (const slug of guideSlugs) {
      const entry = entries.find((e) => e.url === `${SITE_URL}/guides/${slug}`);
      expect(entry, `expected a sitemap entry for /guides/${slug}`).toBeTruthy();
      expect(entry?.priority).toBe(0.7);
      expect(entry?.changeFrequency).toBe('monthly');
    }
  });

  it('lists /daily at priority 0.6 with a daily change frequency', () => {
    const daily = entries.find((e) => e.url === `${SITE_URL}/daily`);
    expect(daily?.priority).toBe(0.6);
    expect(daily?.changeFrequency).toBe('daily');
  });

  it('lists about/contact/profile/privacy/terms at priority 0.3', () => {
    for (const path of ['/about', '/contact', '/profile', '/privacy', '/terms']) {
      const entry = entries.find((e) => e.url === `${SITE_URL}${path}`);
      expect(entry, `expected a sitemap entry for ${path}`).toBeTruthy();
      expect(entry?.priority).toBe(0.3);
      expect(entry?.changeFrequency).toBe('monthly');
    }
  });
});
