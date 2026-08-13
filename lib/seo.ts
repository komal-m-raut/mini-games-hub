import { GameContent } from '@/types/content';
import { GameMeta } from '@/types/game';
import { CATEGORY_META } from '@/lib/gameRegistry';
import { SITE_NAME, SITE_URL } from '@/lib/constants';

/**
 * Pure structured-data builders — no React, so they're unit-testable in
 * plain Node (see tests/seo.test.ts). Every page still owns rendering the
 * `<script>` tag itself via `jsonLdScriptProps`, matching the pattern
 * `app/layout.tsx` already uses for the site-wide WebSite block.
 */

interface BuildGameJsonLdInput {
  meta: GameMeta;
  content: GameContent;
  /** The long, keyword-bearing description — length isn't penalised in
   *  structured data the way it is in a meta description. */
  longDescription: string;
}

/**
 * [VideoGame, FAQPage, BreadcrumbList] for a single game page. VideoGame
 * carries the same fields the original per-page `jsonLd` constants did
 * (name/description/url/genre/applicationCategory/operatingSystem/
 * isAccessibleForFree/offers) — only `genre` now derives from the registry's
 * category label instead of being hand-picked per game, so it can never
 * drift from the category shown on the hub and in the footer directory.
 */
export function buildGameJsonLd({ meta, content, longDescription }: BuildGameJsonLdInput): object[] {
  const url = `${SITE_URL}${meta.href}`;

  const videoGame = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: meta.title,
    description: longDescription,
    url,
    genre: CATEGORY_META[meta.category].label,
    applicationCategory: 'Game',
    operatingSystem: 'Any',
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  const faqPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: content.faq.map((entry) => ({
      '@type': 'Question',
      name: entry.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.a,
      },
    })),
  };

  const breadcrumbList = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: meta.title, item: url },
    ],
  };

  return [videoGame, faqPage, breadcrumbList];
}

interface BuildArticleJsonLdInput {
  title: string;
  description: string;
  /** Route path from the site root, e.g. "/guides/reaction-time". */
  slug: string;
  /** ISO date string, e.g. "2026-08-13". */
  datePublished: string;
}

/** Article structured data for a guide page. */
export function buildArticleJsonLd({
  title,
  description,
  slug,
  datePublished,
}: BuildArticleJsonLdInput): object {
  const url = `${SITE_URL}${slug}`;
  const organization = { '@type': 'Organization', name: SITE_NAME, url: SITE_URL };

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url,
    datePublished,
    author: organization,
    publisher: organization,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  };
}

/**
 * Props for a native `<script type="application/ld+json">` tag. The `<`
 * escape is the same sanitisation `app/layout.tsx` and every game page
 * already apply by hand — centralised here so every JSON-LD emitter in the
 * app (including new ones) goes through one, tested implementation.
 */
export function jsonLdScriptProps(data: object | object[]): {
  type: string;
  dangerouslySetInnerHTML: { __html: string };
} {
  return {
    type: 'application/ld+json',
    dangerouslySetInnerHTML: { __html: JSON.stringify(data).replace(/</g, '\\u003c') },
  };
}
