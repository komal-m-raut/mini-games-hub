# Mettle — Gamified Expansion Plan

Goal: grow from 5 games to 26, add a progression layer (XP, streaks, daily quests,
achievements), redesign the hub into a playful arcade, and add enough genuine,
useful content per page to clear AdSense's "low value content" rejection.

Scope decisions (locked):

- **No live multiplayer.** "Play with friends" = the existing async challenge-link
  system (seeded rounds + shared leaderboard per code). Duel games ship with bots.
- **Uniform challenge format.** Every game's Daily/Friend challenge is exactly
  3 seeded rounds scored 0–10 each (existing API contract, `CHALLENGE_RULES`).
  Solo mode may be freeform (endless snake, full 2048 run, 60s typing sprint).
- **Local-first progression.** XP/quests/streaks/achievements live in
  localStorage; no accounts. Leaderboards stay challenge-based (existing API).
- **Original implementations only.** Mechanics are inspired by classic games and
  the reference sites, but all names, copy, art and code are ours.

## Game roster (26)

Existing 5: balloon-match (precision), perfect-pour (precision),
memory-path (memory), color-match (perception), timing-tap (reflex).

New 21 (id · title · emoji · accent · category · mechanic):

| id | title | emoji | accent | category | mechanic / challenge rounds |
|---|---|---|---|---|---|
| math-sprint | Math Sprint | 🔢 | #84CC16 | speed | 30s arithmetic sprint; solve as many as possible. Round score = curve(correct − wrong). 3 seeded question sets (easy/medium/hard ops). |
| tap-frenzy | Tap Frenzy | ⚡ | #EAB308 | reflex | Targets pop up one at a time for 30s; tap fast, chain combos. Round = seeded target sequence; score from avg reaction + combo. |
| grid-flash | Grid Flash | 🟦 | #3B82F6 | memory | 5×5 grid flashes N lit tiles; recall by tapping. 3 lives per round; level climbs. Round score from peak level reached. |
| number-recall | Number Recall | 🔟 | #14B8A6 | memory | A number appears briefly; type it back. Digits grow each level. Round score from digit span reached. |
| stroop-snap | Stroop Snap | 🎭 | #D946EF | speed | Word "RED" shown in blue ink etc.; tap the INK colour, 30s. Score = correct − wrong with speed bonus. |
| block-count | Block Count | 🧮 | #EF4444 | perception | Blocks sweep across the screen; count the red ones among decoys. 3 sweeps per round, accuracy-scored. |
| pair-chase | Pair Chase | 🃏 | #F472B6 | memory | Card-pair matching against the clock; fewer flips + faster = higher score. Seeded layouts. |
| echo-steps | Echo Steps | 🚦 | #22C55E | memory | Simon-style: 4 pads light up with tones in a growing sequence; repeat it. Round score from sequence length. |
| time-sense | Time Sense | ⏱️ | #38BDF8 | perception | A duration is shown (bar fills for X ms), then recreate it by holding. Accuracy-scored per dialed.gg "time". |
| echo-ear | Echo Ear | 🎵 | #A78BFA | perception | Hear a tone, then recreate its pitch on a slider (Web Audio). Accuracy from cents offset. |
| bullseye | Bullseye | 🎯 | #F43F5E | precision | Two-tap darts: first tap locks vertical aim on an oscillating bar, second locks horizontal; dart lands, closer = more points. 5 darts per round. |
| type-storm | Type Storm | ⌨️ | #06B6D4 | speed | 30s typing sprint over common words; WPM × accuracy → score. Seeded word streams. Desktop-first; on touch, shows a friendly note + still playable. |
| rps-arena | RPS Arena | ✊ | #F59E0B | duel | Rock-paper-scissors vs a pattern-reading bot; best-of-9 round, win margin → score. |
| hand-cricket | Hand Cricket | 🏏 | #10B981 | duel | Classic schoolyard hand cricket vs bot: pick 1–6, same number = out; innings runs → score curve. |
| xo-shift | XO Shift | ⚔️ | #8B5CF6 | duel | Three-piece XO: place 3 marks, then slide to make a line; no immediate move-back. Vs bot with 3 difficulties; round = best-of-3 games. |
| fading-xo | Fading XO | 👻 | #64748B | duel | XO where your oldest mark fades and must be moved; first line wins. Vs bot; round = best-of-3. |
| shape-echo | Shape Echo | 🔷 | #0EA5E9 | perception | A shape (size/position/rotation) shows briefly; recreate it by drag/resize/rotate. Accuracy from param deltas. |
| word-quest | Word Quest | 📝 | #34D399 | word | Daily 5-letter word in 6 guesses with keyboard heat; solo = random word, daily = date-seeded from curated list. Round score from guesses left + speed. |
| 2048 | 2048 | 🧩 | #FB923C | puzzle | Classic merge grid. Solo endless; challenge rounds = 90s seeded sprints, score curve on points. |
| snake | Snake | 🐍 | #4ADE80 | arcade | Grid snake, swipe/arrows/WASD. Solo endless; challenge = seeded food layout, 60s sprint ×3. |
| minesweeper | Minesweeper | 💣 | #CBD5E1 | puzzle | Classic 9×9/12 mines (medium 12×12/28); first click always safe; flags, chording. Challenge = seeded boards, score from time + completion. |

Category union: `'reflex' | 'speed' | 'memory' | 'puzzle' | 'duel' | 'precision' | 'perception' | 'word' | 'arcade'`.
Existing games get categories as noted above.

## Meta-systems contracts (lib/, all client-safe, localStorage, hydration-safe)

```ts
// lib/progress.ts
export interface ProgressState { xp: number; level: number; playsByGame: Record<string, number>; totalPlays: number }
export function getProgress(): ProgressState
export function levelForXp(xp: number): number        // level n needs 100·n(n−1)/2 total XP → L2=100, L5=1000-ish curve
export function xpIntoLevel(xp: number): { into: number; needed: number }
export function useProgress(): ProgressState          // useSyncExternalStore, server snapshot = zeroed state

// lib/streak.ts
export interface StreakState { current: number; best: number; lastDay: string /* local YYYY-MM-DD */ }
export function getStreak(): StreakState
export function useStreak(): StreakState

// lib/quests.ts — 3 quests/day, seeded by makeChallengeRand(getDailyChallengeCode(), 'quests')
export interface Quest { id: string; label: string; target: number; xp: number;
  kind: 'plays' | 'distinct-games' | 'daily-challenge' | 'category-plays' | 'score-total' | 'new-best' }
export interface QuestProgress extends Quest { progress: number; done: boolean }
export function getTodaysQuests(): QuestProgress[]
export function useQuests(): QuestProgress[]

// lib/achievements.ts — static catalog, unlocked ids in localStorage
export interface AchievementDef { id: string; title: string; blurb: string; emoji: string;
  check(ctx: RecordCtx, totals: ProgressState, streak: StreakState): boolean }
export function getUnlocked(): string[]
export function useAchievements(): { defs: AchievementDef[]; unlocked: Set<string> }

// lib/recordResult.ts — THE single integration point games call on completion
export interface GameResultInput {
  gameId: string; mode: 'solo' | 'daily' | 'friend';
  roundScores?: number[];             // when the 0–10 round model applies
  totalScore: number; maxScore: number;
  isNewBest?: boolean;
}
export interface GameResultOutcome { xpGained: number; leveledUpTo?: number;
  questsCompleted: QuestProgress[]; achievementsUnlocked: AchievementDef[] }
export function recordGameResult(input: GameResultInput): GameResultOutcome
```

- `recordGameResult` is invoked automatically inside `SessionSummary` (derives
  gameId from `gamePath`) and `ChallengeComplete` (has gameId) — so all games,
  old and new, feed progression with zero per-game wiring. Freeform games that
  use custom result screens call it directly.
- `components/meta/RewardToast.tsx` renders the outcome (XP float-up, quest
  ticks, badge unlock) and is composed into both summary components.
- Every game fires the existing `/api/events` play beacon via a shared
  `usePlayBeacon(gameId)` hook (copied from balloon-match's effect) so hub
  stats stop undercounting.

localStorage keys: `mgh_progress`, `mgh_streak`, `mgh_quests_<YYYYMMDD>`,
`mgh_achievements`, `mgh_avatar`. All reads via `useSyncExternalStore` with
server snapshot = empty/zero (no hydration mismatch). All writes wrapped in
try/catch (quota).

## Pages

- `/daily` — today's 3 quests, streak flame + month calendar of played days,
  and a "Daily gauntlet" grid linking every available game's
  `/games/<id>/challenge/<daily-code>`.
- `/profile` — nickname (reuses lib/player), avatar emoji picker, level ring +
  XP bar, badge grid (locked/unlocked), per-game bests, share-profile text.
- `/guides` + 5 articles (see SEO).
- `/contact` — real contact page (reuse address already published on privacy page).

## Per-game content & SEO (the AdSense fix)

Every game page (existing 5 retrofitted, new 21 from birth) renders below the game:

```ts
// games/<slug>/content.ts
export const CONTENT: GameContent = {
  intro: [/* 2–3 paragraphs, ~150–250 words, genuinely informative */],
  tips: [/* 4–6 concrete strategy tips */],
  faq: [/* 4–6 {q, a} — real questions (scoring, difficulty, daily reset, offline) */],
  related: [/* 3–4 game ids */],
}
```

- `components/seo/GameArticle.tsx` renders intro/tips/FAQ/related-game cards.
- `lib/seo.ts` exports `buildGameJsonLd(meta, content)` → `[VideoGame, FAQPage,
  BreadcrumbList]` and `buildArticleJsonLd(...)` for guides.
- Guides (600–1000 words each, interlinked with games): reaction time, working
  memory training, colour perception, mental math speed, the Stroop effect.
- Sitemap: home 1.0 · games 0.8 · guides 0.7 · daily 0.6 · about/profile/
  contact/privacy/terms 0.3. Challenge pages stay noindex.
- AdBanner: observe `data-ad-status`, collapse unfilled units (issues.md #1/#8).

## Hub shell redesign (gamified arcade)

- Nav: logo · Daily (with quest-count pip) · Guides · Profile (level chip +
  streak flame 🔥N). Mobile: bottom tab bar (Home / Daily / Profile).
- Home: compact hero ("26 free mini-games. No downloads, no signups."), live
  stats, daily quest strip, category filter chips + search, game grid grouped
  by category (registry `category`), coming-soon cards dimmed.
- Footer: full game directory columns by category + guides + contact + legal.
- Juice: card hover tilt/sheen, count-up stats, all gated by
  `prefers-reduced-motion`. Keep scanlines + particles identity, Space Grotesk.

## File ownership (parallel-safety)

- Scaffold agent: `types/game.ts` (category), `lib/gameRegistry.ts` (21 new
  entries, `isAvailable:false`), scores route `GAME_RULES` (21 keys).
- Meta agent: `lib/{progress,streak,quests,achievements,recordResult}.ts`,
  `components/meta/*`, `app/{profile,daily}/*`, `hooks/usePlayBeacon.ts`,
  edits `SessionSummary` + `ChallengeComplete` only.
- SEO agent: `types/content.ts`, `lib/seo.ts`, `components/seo/*`,
  `app/{guides,contact}/*`, `app/sitemap.ts`, existing 5 game pages +
  `games/<existing>/content.ts`, `components/ads/AdBanner.tsx`.
- Shell agent: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`,
  `components/layout/*`.
- Each game agent: `games/<slug>/**`, `app/games/<slug>/**`,
  `tests/<slug>.test.ts`, its own registry entry flip (`isAvailable: true`).
  **Never** edits `globals.css` (use Tailwind utilities / inline styles /
  `styles.module.css`), never touches shared components or other games.
- Final QA agent: `public/sw.js` (CORE_ASSETS from available registry +
  version bump), `README.md`, `HANDOFF.md`.

## Waves & commits

0. scaffold → commit `chore(registry): stage 21 upcoming games`
1. meta + seo agents (parallel) → 2 commits
2. shell agent → 1 commit (runs alongside wave 1 games)
3. game waves: 6 · 6 · 5 · 4 agents → one commit per game
4. QA: `npm run build` + `npm test` + lint gate per wave; browser sweep;
   sw.js/README; final commit.

## QA gates

- `npm run build` green (typecheck), `npm test` green (existing golden tests
  untouched), `eslint` clean on new files.
- Browser: every new game playable end-to-end (solo + daily challenge),
  keyboard accessible, no console errors, reduced-motion respected.
- SEO: every page unique title/description/canonical; FAQ JSON-LD parses;
  sitemap lists all public routes; challenge pages noindex.

## Post-deploy AdSense checklist (user actions)

1. Deploy, verify sitemap.xml + robots.txt on production domain.
2. Google Search Console: submit sitemap, request indexing of key pages.
3. Let the site sit until pages are indexed (days, not hours) — AdSense
   re-reviews against the crawled site.
4. In AdSense: confirm site ownership, then "I confirm I have fixed the
   issues" → Request review.
5. Keep ads.txt as-is; unfilled units now collapse (no blank boxes).
