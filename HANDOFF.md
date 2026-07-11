# Mini Games Hub — Session Handoff

## What's Built

**Stack:** Next.js (App Router) + TypeScript + Tailwind v4 + Framer Motion v12 + canvas-confetti + lucide-react + @vercel/analytics

**Fonts:** Orbitron (display), Space Grotesk (body), JetBrains Mono (mono) via next/font/google

---

## Pages & Routes

- `/` — Hub landing: hero (live player count), game card grid, ad banner, leaderboard
- `/games/balloon-match` — Balloon Match game + challenge launcher + leaderboard
- `/games/balloon-match/challenge/[code]` — seeded challenge (shareable link)
- `/api/scores/[gameId]/[board]` — GET/POST leaderboard entries, any game
- `/api/events` (POST play events) · `/api/stats` (GET site totals)
- `/manifest.webmanifest` — PWA manifest from `app/manifest.ts`

---

## Game: Balloon Match (`/games/balloon-match`)

**Flow:** Select difficulty → Observe target balloon (countdown) → Hold to inflate → Results

**Mechanics:**
- Press-and-hold inflate zone grows balloon at difficulty-based speed (wall-clock based, throttle-proof)
- `setPointerCapture` prevents premature release when balloon grows over touch area
- Inflate timer per difficulty (Easy none / Medium 5s / Hard 3s) — auto-locks the size at zero, both modes
- Accuracy % calculated vs target size → Rating: Perfect / Great / Good / Try Again
- **Scoring: every round is out of 10** (`calculateScore`: accuracy 100%→10, ≤50%→0), resets per game; no multipliers
- LocalStorage best single-round score (`mgh_balloon_best10`)
- Tolerance still drives ratings internally but is never displayed

**Difficulty config** (`lib/constants.ts`):
- Easy: 12 u/s, ±15% tolerance (hidden), no inflate limit
- Medium: 25 u/s, ±10% tolerance (hidden), 5s inflate limit
- Hard: 45 u/s, ±5% tolerance (hidden), 3s inflate limit
- Rule: inflationSpeed must reach maxUnits within ~70% of the window

UI copy is deliberately minimal — titles only, no instructional subtitles.

---

## Challenge Mode (`/games/balloon-match/challenge/[code]`)

- Seeded 3-round series (Easy → Medium → Hard), 10 pts each, total /30
- Code deterministically generates identical targets for everyone (xmur3 + mulberry32 in `lib/challenge.ts`)
- **Daily Challenge**: code `daily-YYYYMMDD` — same balloons worldwide each day (dialed.gg-style)
- **Challenge a Friend**: mints a random 6-char code, share the link
- Shared per-challenge leaderboard: `/api/scores/balloon-match/{code}` (GET list / POST submit)
- Anonymous identity: `crypto.randomUUID()` in localStorage + editable nickname (`lib/player.ts`); upsert keeps each player's best run
- Emoji result sharing (`buildShareText`) via Web Share API / clipboard

---

## Storage & Stats (same schema for every future game)

- `lib/server/scoreStore.ts` — boards of `ScoreEntry` keyed by gameId + board
  (board = challenge code, `daily-YYYYMMDD`, `global`, …); new games just add a
  `GAME_RULES` entry in the scores route
- `lib/server/statsStore.ts` — plays counter + unique players (HyperLogLog in Redis);
  game fires `POST /api/events` on each completed round; hub reads `GET /api/stats`
  via `hooks/useSiteStats.ts`
- Backends: `.data/*.json` for dev (gitignored); Upstash Redis via plain-fetch REST
  (`lib/server/redis.ts`, zero npm deps) when `UPSTASH_REDIS_REST_URL` +
  `UPSTASH_REDIS_REST_TOKEN` are set — see `.env.example`
- Visit analytics: `<Analytics />` in layout; activates on Vercel deploy

---

## PWA

- `app/manifest.ts` → served at `/manifest.webmanifest` (standalone, portrait, themed)
- Icons in `public/icons/` (192/512 + maskable + apple-icon), generated from balloon SVG
- `public/sw.js`: network-first pages, cache-first hashed assets, SWR rest; never caches `/api/`
- Registered by `components/pwa/ServiceWorkerRegister.tsx` — **production builds only**; in dev it actively unregisters stale SWs and clears `mgh-*` caches (a leftover prod SW on localhost once served stale chunks to the dev server); bump `CACHE_VERSION` on deploy

---

## Key Files

```
app/
  globals.css          # Full design system (tokens, components, animations)
  layout.tsx           # Fonts, ParticleBackground, Navigation, Footer
  page.tsx             # Hub landing page

games/balloon-match/
  BalloonGame.tsx      # Main game component
  BalloonCanvas.tsx    # SVG balloon + BalloonComparison
  ResultScreen.tsx     # Results with stats, comparison, confetti
  useBalloonGame.ts    # Game state hook (stateRef pattern, transitioningRef guard)
  types.ts             # BalloonGameState interface

components/
  ui/NeonButton.tsx         # 4 variants, 4 sizes
  ui/GlassCard.tsx          # Glassmorphism card
  ui/ParticleBackground.tsx # 18 particles + 3 ambient blobs (seeded RNG for SSR)
  ui/ConfettiEffect.tsx     # canvas-confetti (perfect/great/good presets)
  game/GameTimer.tsx        # SVG circular countdown
  game/ScoreCard.tsx        # Score/Best/Round/Accuracy display
  game/DifficultySelector.tsx # 3 animated cards with vertical stat pills
  leaderboard/Leaderboard.tsx # 4 tabs (Today/Week/All Time/Friends), mock data
  ads/AdBanner.tsx          # Placeholder in dev, real <ins> in production
  ads/AdConfig.ts           # Publisher ID + 3 slot IDs (all placeholder)
  layout/Navigation.tsx     # Fixed nav, mobile-responsive
  layout/Footer.tsx         # Footer ad + nav links

games/balloon-match/ (challenge UI)
  ChallengeLauncher.tsx # Daily / friend-challenge entry buttons
  ChallengeScreens.tsx  # Intro + completion (submit, share, leaderboard)

components/challenge/ChallengeLeaderboard.tsx # Shared per-code board

hooks/
  usePressAndHold.ts   # Pointer capture hold mechanic
  useLeaderboard.ts    # Mock leaderboard data + tabs (hub tabs still mock)
  useGameTimer.ts      # Countdown timer hook
  useSiteStats.ts      # GET /api/stats (players/plays totals)

lib/challenge.ts       # Seeded rounds, codes, share text
lib/player.ts          # Anonymous localStorage identity
lib/server/            # redis.ts + scoreStore.ts + statsStore.ts

lib/
  constants.ts         # UNIT_TO_PX=2.8, BALLOON_COLORS, DIFFICULTY_CONFIG, ad placeholders
  gameRegistry.ts      # 6 games (1 live, 5 coming-soon)
  utils.ts             # cn(), randomPick(), randomInt(), clamp()

utils/
  accuracy.ts          # calculateAccuracy(), getRating(), getSizeDiffLabel()
  scoring.ts           # calculateScore(), getLocalHighScore(), saveHighScore()

types/game.ts          # Shared types: Difficulty, Rating, GameResult, GameMeta, etc.
```

---

## Ad Setup (Ready, Needs Real IDs)

All ad infrastructure is built. To go live:
1. Replace `'ca-pub-XXXXXXXXXXXXXXXXX'` in `AdConfig.ts` with real Publisher ID
2. Replace 3 slot ID placeholders with real Ad Unit IDs
3. Add AdSense `<Script>` tag to `app/layout.tsx`

---

## Game Registry (for adding new games)

Add entry to `lib/gameRegistry.ts` + create `games/<slug>/` folder. Hub auto-renders it.

---

## Pending / Next Session

1. **Upstash Redis** — create free db (Vercel → Storage → Upstash for Redis injects
   the env vars), then deploy; file store doesn't persist on serverless
2. **Deploy on Vercel** + enable Analytics in the dashboard
3. **Hub leaderboard tabs still mock data** (`useLeaderboard.ts`) — real boards
   (`daily-…`/`global`) already supported server-side, just needs wiring
4. **Ads** — still placeholder IDs (see Ad Setup above)
5. **Streaks** — localStorage daily-challenge streak counter would pair well with the
   Daily Challenge (dialed.gg-style); not built yet
6. **Lint** — 5 pre-existing `react-hooks` errors remain (localStorage-hydration and
   stateRef mirror patterns); build/typecheck are clean
