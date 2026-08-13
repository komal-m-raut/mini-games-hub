/**
 * Per-game long-form content: the "About / Tips / FAQ / Related" article that
 * `components/seo/GameArticle.tsx` renders below every game. This is what
 * gives each game page genuine, unique, indexable content instead of a
 * near-empty canvas — see REDESIGN-PLAN.md's "Per-game content & SEO"
 * section for the brief this shape was written against.
 */

/** One FAQ entry. Also feeds the page's FAQPage structured data 1:1. */
export interface GameFaq {
  q: string;
  a: string;
}

export interface GameContent {
  /** 2–3 paragraphs, ~150–250 words total. What the game trains and how
   *  scoring actually works — written against the game's own constants.ts /
   *  types.ts, not paraphrased marketing copy. */
  intro: string[];
  /** 4–6 concrete strategy tips. At least one should cover the Daily
   *  Challenge or the leaderboard. */
  tips: string[];
  /** 4–6 real questions — scoring, difficulty, daily reset, offline/PWA,
   *  controls, free-to-play are the usual set. */
  faq: GameFaq[];
  /** 3–4 registry game ids to surface as "More games like this". May
   *  include ids that are `isAvailable: false` — `RelatedGames` filters
   *  those out itself, so listing a staged game here is safe and won't
   *  ever produce a dead link. */
  related: string[];
}
