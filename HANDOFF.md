# Mini Games Hub — Session Handoff

## What's Built

**Stack:** Next.js (App Router) + TypeScript + Tailwind v4 + Framer Motion v12 + canvas-confetti + lucide-react + @vercel/analytics

**Fonts:** Orbitron (display), Space Grotesk (body), JetBrains Mono (mono) via next/font/google

---

## Pages & Routes

- `/` — Hub landing: hero (live player count), game card grid, ad banner, leaderboard
- `/games/balloon-match` — Balloon Match game + challenge launcher + leaderboard
- `/games/balloon-match/challenge/[code]` — seeded challenge (shareable link)
- `/games/perfect-pour` — Perfect Pour game (observe fill level → pour to match)
- `/games/memory-path` — Memory Path game (watch neon path → trace it back)
- `/api/scores/[gameId]/[board]` — GET/POST leaderboard entries, any game
- `/api/events` (POST play events) · `/api/stats` (GET site totals)
- `/manifest.webmanifest` — PWA manifest from `app/manifest.ts`

---

## Game: Balloon Match (`/games/balloon-match`)

**Flow:** Select difficulty → 5-round session (observe → hold to inflate → results) → Session Complete

**Mechanics:**
- **Normal mode is a fixed 5-round session, /50 total** (`NORMAL_ROUND_COUNT` in
  `utils/scoring.ts`) — ends on a SessionComplete screen (total, per-round chips,
  best-session from localStorage `mgh_balloon_best_session`, share text, replay)
- Press-and-hold inflate zone grows balloon at difficulty-based speed (wall-clock based, throttle-proof)
- `setPointerCapture` prevents premature release when balloon grows over touch area
- Inflate timer per difficulty (Easy none / Medium 5s / Hard 3s) — auto-locks the size at zero, both modes
- Accuracy % calculated vs target size → Rating: Perfect / Great / Good / Try Again
- **Scoring: every round is out of 10** (`calculateScore`: accuracy 100%→10, ≤50%→0), resets per game; no multipliers
- LocalStorage best single-round score (`mgh_balloon_best10`) — powers the "New High Score" badge on results
- Top bar shows Score /10 · Total /max · Round x/y in both modes (no Best chip)
- Tolerance still drives ratings internally but is never displayed

**Tests** (`npm test`, vitest, `tests/`): golden-value determinism for
`getChallengeRounds` (seeded RNG — never change outputs without invalidating
shared links knowingly), scoring/accuracy/rating boundaries, share text.
Score boards are capped at top 100 entries (`MAX_BOARD_SIZE` in scoreStore).

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

## Game: Perfect Pour (`/games/perfect-pour`)

**Flow:** Select difficulty → 5-round session (observe fill level → pour to match → results) → Session Complete

**Mechanics:**
- Watch the glass fill to a random target (25–85%) during a brief observe window
- Press and hold the **tap lever** to pour; release to lock in; fill drains to 0 before pouring so there's no info leak
- Scoring identical to Balloon Match: `calculateScore(accuracy)` → 0–10 per round
- Best session stored in localStorage key `mgh_best_session_perfect-pour`

**Water/faucet (`GlassCanvas.tsx`):** `<Glass faucet pouring>` draws a chrome tap
above the glass (viewBox gains upward headroom; glass body stays the same on-screen
size). While pouring, a tapering water stream falls from the spout with a bright
core, a subtle sway, falling droplets, a splash crown, a pulsing impact point and
continuous surface ripples (plus the stop-ripple burst). The tap lever tilts open
via the `pouring` prop. Live level tracks the readout exactly (`duration 0`) so the
player can aim; the `water` loop sound is synced to the hold. `GlassComparison`
(results) renders faucet-free.

**Key files:**
```
games/perfect-pour/
  PerfectPourGame.tsx  # Main game component
  GlassCanvas.tsx      # SVG glass + GlassComparison (side-by-side diff view)
  PourResultScreen.tsx # Results (accuracy, diff label, glass comparison, confetti)
  usePourGame.ts       # Game state hook
  constants.ts         # POUR_DIFFICULTY, getPourRating, getPourAccuracy, MIN/MAX_TARGET_FILL
  types.ts             # PourGameState, PourResult, PourPhase
```

---

## Game: Memory Path (`/games/memory-path`)

**Flow:** Select difficulty → 5-round session (reveal path → memorize → fade → trace → results) → Session Complete

**Mechanics:**
- A random non-self-intersecting orthogonal path is generated on an N×N grid (DFS with backtracking; guaranteed to find a path of the requested length)
- **Reveal phase**: cells light up one-by-one with neon glow + connecting SVG polyline; whoosh sound per cell
- **Memorize phase**: full path glows; a draining neon bar shows how long is left to memorize
- **Fade phase** (700ms): path dissolves before tracing opens
- **Trace phase**: drag to paint cells; the last traced cell can be walked back to erase a wrong turn; sparkle trail follows the pointer; reaching the last cell auto-scores (after 380ms beat)
- **Clear** button wipes the trace mid-round; **Submit** forces early scoring
- Scoring: `calculateScore(accuracy)` → 0–10; accuracy = correct positional matches / path length
- Rating: Perfect (100% & 0 mistakes), Great (≥80%), Good (≥60%), Try Again
- Best session stored in localStorage key `mgh_best_session_memory-path`
- Ambient synth pad loops (`loop('ambient')`) during play; stops on menu return

**Difficulty config** (`games/memory-path/constants.ts`):
- Easy: 9×9 grid, 6-cell path, 520ms/cell reveal, 2.4s memorize window
- Medium: 16×16 grid, 9-cell path, 340ms/cell reveal, 2.8s memorize window
- Hard: 25×25 grid, 12-cell path, 300ms/cell reveal, 3.4s memorize window

**Big-grid performance & tracing** (`PathGrid.tsx`): tiles are plain divs in a
`useMemo`'d layer so sparkle updates don't re-render the 256/625 cells; the few
active overlays (traced ripple, start hint) keep framer-motion. `gridMetrics(size)`
scales tile inset/radius, connector stroke, grid max-width, and drops sparkles on
the 25×25 board. Fast drags fill colinear gaps via `straightRun()` (in `pathGen.ts`,
unit-tested) so tracing tiny tiles completes runs instead of erroring on skipped cells.

**Key files:**
```
games/memory-path/
  MemoryPathGame.tsx      # Main game component
  PathGrid.tsx            # Grid rendering, pointer tracing, sparkle trail, SVG path overlay
  PathResultScreen.tsx    # Results (stats, grid replay with correct/wrong marks, confetti)
  useMemoryPathGame.ts    # Game state hook (stateRef + tracedRef for pointer-move perf)
  pathGen.ts              # generatePath() DFS, comparePaths(), isAdjacent(), Cell type
  constants.ts            # PATH_DIFFICULTY, PATH_FADE_MS, getPathRating()
  types.ts                # PathGameState, PathResult, PathPhase
```

**Tests** (`tests/memoryPath.test.ts`): path generation (length, no revisits, orthogonal steps, inside grid, difficulty presets), `comparePaths` (exact, divergence, short/long traces), `getPathRating` boundaries. Runs in the existing `npm test` suite (42 tests total across 3 files).

---

## Shared Infrastructure

### Sounds (`lib/sounds.ts`, `hooks/useSound.ts`)

Zero-asset Web Audio synthesis. All sounds generated at runtime:
- **One-shots:** `click`, `tick`, `glow` (path reveal shimmer), `whoosh` (per-segment), `trace` (cell tap), `splash`, `success` (major arpeggio), `celebrate` (full octave arpeggio), `fail`, `error`
- **Loops:** `water` (low-passed brown noise, LFO wobble), `ambient` (Am9-ish detuned sine pad)
- Mute persists in localStorage (`mgh_muted`); `SoundToggle` component (`components/ui/SoundToggle.tsx`)

### Session Summary (`components/game/SessionSummary.tsx`)

Generic end-of-session screen used by all round-based games: total score, per-round breakdown, personal best, share text (`lib/share.ts`), replay/menu buttons, confetti for ≥70% or new best.

### Difficulty Selector (`components/game/DifficultySelector.tsx`)

Generic 3-card selector; each game passes its own `DifficultyOption[]` with stat pills.

### Score Card (`components/game/ScoreCard.tsx`)

Top-bar Score /10 · Total /max · Round x/y display, shared across all games.

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
                       # Includes .path-grid, .path-cell, .path-tile classes
  layout.tsx           # Fonts, ParticleBackground, Navigation, Footer
  page.tsx             # Hub landing page

games/balloon-match/   # See Game: Balloon Match above
games/perfect-pour/    # See Game: Perfect Pour above
games/memory-path/     # See Game: Memory Path above

components/
  ui/NeonButton.tsx         # 4 variants, 4 sizes
  ui/GlassCard.tsx          # Glassmorphism card
  ui/ParticleBackground.tsx # 18 particles + 3 ambient blobs (seeded RNG for SSR)
  ui/ConfettiEffect.tsx     # canvas-confetti (perfect/great/good presets)
  ui/SoundToggle.tsx        # Mute/unmute (persisted to localStorage)
  game/GameTimer.tsx        # SVG circular countdown
  game/ScoreCard.tsx        # Score/Best/Round/Accuracy display
  game/DifficultySelector.tsx # 3 animated cards with vertical stat pills
  game/SessionSummary.tsx   # Generic end-of-session screen (all round-based games)
  leaderboard/Leaderboard.tsx # 4 tabs (Today/Week/All Time/Friends)
  challenge/ChallengeLeaderboard.tsx # Shared per-code board
  ads/AdBanner.tsx          # Placeholder in dev, real <ins> in production
  ads/AdConfig.ts           # Publisher ID + 3 slot IDs (all placeholder)
  layout/Navigation.tsx     # Fixed nav, mobile-responsive
  layout/Footer.tsx         # Footer ad + nav links

hooks/
  usePressAndHold.ts   # Pointer capture hold mechanic
  useLeaderboard.ts    # Fetches real boards from /api/scores
  useGameTimer.ts      # Countdown timer hook
  useSiteStats.ts      # GET /api/stats (players/plays totals)
  useSound.ts          # Sound controls hook; wraps lib/sounds.ts singleton

lib/
  sounds.ts            # Zero-asset Web Audio synthesis engine
  share.ts             # buildSessionShare() for share text
  challenge.ts         # Seeded rounds, codes, share text
  player.ts            # Anonymous localStorage identity
  constants.ts         # Game constants (balloon)
  gameRegistry.ts      # 8 games (3 live, 5 coming-soon)
  utils.ts             # cn(), randomPick(), randomInt(), clamp()
  server/              # redis.ts + scoreStore.ts + statsStore.ts

utils/
  accuracy.ts          # calculateAccuracy(), getRating(), getSizeDiffLabel()
  scoring.ts           # calculateScore(), NORMAL_ROUND_COUNT, getLocalBestSession/saveBestSession

types/game.ts          # Shared types: Difficulty, Rating, GameResult, GameMeta, etc.
tests/
  scoring.test.ts      # calculateScore, calculateAccuracy, getRating boundaries
  challenge.test.ts    # Seeded round determinism, share text
  memoryPath.test.ts   # Path generation, comparePaths, getPathRating
```

---

## Ad Setup (Ready, Needs Real IDs)

All ad infrastructure is built. To go live:
1. Replace `'ca-pub-XXXXXXXXXXXXXXXXX'` in `AdConfig.ts` with real Publisher ID
2. Replace 3 slot ID placeholders with real Ad Unit IDs
3. Add AdSense `<Script>` tag to `app/layout.tsx`

---

## Adding a New Game

1. Add entry to `lib/gameRegistry.ts` (set `isAvailable: true`)
2. Create `games/<slug>/` with: `<Name>Game.tsx`, `use<Name>Game.ts`, `types.ts`, `constants.ts`
3. Create `app/games/<slug>/page.tsx` — import the game component + `AdBanner`
4. Follow the session pattern: `NORMAL_ROUND_COUNT` rounds, `calculateScore`, `getLocalBestSession`/`saveBestSession`, `SessionSummary` at end
5. Use `DifficultySelector`, `ScoreCard`, `SoundToggle`, `NeonButton` from shared components

---

## Pending / Next Session

1. ~~Upstash Redis~~ — DONE
2. ~~Deploy on Vercel~~ — DONE
3. ~~Hub leaderboard tabs~~ — DONE
4. ~~Perfect Pour game~~ — DONE
5. ~~Memory Path game~~ — DONE (3 games live)
6. **Ads** — still placeholder IDs (see Ad Setup above)
7. **Custom domain** — user is picking one; wire it up in Vercel when shared
8. **Game 4** — Color Match or Rhythm Tap are next candidates in `gameRegistry.ts`
9. **Challenge mode for Perfect Pour / Memory Path** — infrastructure exists (`/api/scores/[gameId]/[board]`), just needs `ChallengeLauncher` + `ChallengeScreens` wired per game
