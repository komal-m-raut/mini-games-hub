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

**Flow:** Select difficulty → 5-round session (observe → hold to inflate → **adjust** → results) → Session Complete

**Mechanics:**
- **Normal mode is a fixed 5-round session, /50 total** (`NORMAL_ROUND_COUNT` in
  `utils/scoring.ts`) — ends on the shared `SessionSummary` screen (total, per-round
  chips, best-session from localStorage `mgh_balloon_best_session`, share text, replay)
- Press-and-hold inflate zone grows balloon at difficulty-based speed (wall-clock based, throttle-proof)
- `setPointerCapture` prevents premature release when balloon grows over touch area
- Inflate timer per difficulty (Easy none / Medium 5s / Hard 3s) — auto-locks the size at zero, both modes
- **Adjust phase**: after locking in, a fine-adjust controller (`BALLOON_ADJUST_STEP` per
  difficulty) lets the player nudge the size up/down before confirming — `+`/`-` buttons
  via `useHoldRepeat` (press-and-hold auto-repeats after an initial delay), keyboard-
  operable like the inflate hold itself (Space/Enter start/stop a hold; buttons are
  natively focusable/activatable). Readout decimal places match the step size (1 → whole
  units, 0.5 → 1dp, 0.25 → 2dp) so it never implies more precision than a nudge can produce.
- Accuracy % calculated vs target size → Rating: Perfect / Great / Good / Try Again
- **Scoring: every round is out of 10, to 2 decimal places** (`calculateScore`: accuracy
  100%→10, ≤50%→0, float-safe `round2`), resets per game; no multipliers
- LocalStorage best single-round score (`mgh_balloon_best10`) — powers the "New High Score" badge on results
- Top bar shows Score /10 · Total /max · Round x/y in both modes (no Best chip)
- Tolerance still drives ratings internally but is never displayed

**Tests** (`npm test`, vitest, `tests/`): golden-value determinism for
`getChallengeRounds` (seeded RNG — never change outputs without invalidating
shared links knowingly), scoring/accuracy/rating boundaries, share text.
Score boards are capped at top 100 entries (`MAX_BOARD_SIZE` in scoreStore).

**Difficulty config** (`lib/constants.ts`):
- Easy: 12 u/s, no inflate limit
- Medium: 25 u/s, 5s inflate limit
- Hard: 45 u/s, 3s inflate limit
- Rule: inflationSpeed must reach maxUnits within ~70% of the window
- Per-difficulty `tolerancePercent`/`description` fields were removed as dead code —
  ratings are derived purely from the score curve (`ratingFromScore` in `utils/scoring.ts`),
  not a tolerance comparison, and the difficulty cards no longer render a description line.

UI copy is deliberately minimal — titles only, no instructional subtitles.

---

## Challenge Mode (`/games/balloon-match/challenge/[code]`)

- Seeded 3-round series (Easy → Medium → Hard), up to 10 pts each (2dp), total /30
- Code deterministically generates identical targets for everyone (xmur3 + mulberry32 in `lib/challenge.ts`)
- **Daily Challenge**: code `daily-YYYYMMDD` computed from the **UTC** date, not host-local
  time (`getDailyChallengeCode` in `lib/challenge.ts`) — everyone worldwide gets the same
  board on the same calendar day regardless of timezone (dialed.gg-style); label formats
  straight off the code digits (no `Date`/`Intl`) so it renders identically server/client
  with no hydration mismatch
- **Challenge a Friend**: mints a random 6-char code, share the link
- Shared per-challenge leaderboard: `/api/scores/balloon-match/{code}` (GET list / POST submit)
- Anonymous identity: `crypto.randomUUID()` in localStorage + editable nickname (`lib/player.ts`); upsert keeps each player's best run
- Emoji result sharing (`buildChallengeShareText` in `lib/challenge.ts`) via Web Share API / clipboard

---

## Game: Perfect Pour (`/games/perfect-pour`)

**Flow:** Select difficulty → 5-round session (observe fill level → pour to match → **adjust** → results) → Session Complete

**Mechanics:**
- Watch the glass fill to a random target (25–85%) during a brief observe window
- Press and hold the **tap lever** to pour; release to lock in; fill drains to 0 before pouring so there's no info leak — the hold is keyboard-operable (Space/Enter) via the same `usePressAndHold` used by Balloon Match's inflate zone
- **Adjust phase**: fine-adjust the poured level with `+`/`-` buttons (`POUR_ADJUST_STEP` per difficulty) before confirming, same `useHoldRepeat` pattern as Balloon Match
- Scoring identical to Balloon Match: `calculateScore(accuracy)` → 0–10 per round, to 2 decimal places
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
  constants.ts         # POUR_DIFFICULTY (no `tolerance`/`description` — dead, removed),
                       # getPourRating, getPourAccuracy, MIN/MAX_TARGET_FILL
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
- **Trace phase**: drag to paint cells, or use arrow keys (`PathGrid.tsx` `onKeyDown` — `role="application"`, focusable grid) to move a keyboard cursor and paint by traversal; the last traced cell can be walked back to erase a wrong turn; sparkle trail follows the pointer; reaching the last cell auto-scores (after 380ms beat)
- **Clear** button wipes the trace mid-round; **Submit** forces early scoring
- Scoring: `calculateScore(accuracy)` → 0–10 (2dp); accuracy = correct positional matches / path length
- Rating: Perfect (100% & 0 mistakes), Great (≥80%), Good (≥60%), Try Again
- Best session stored in localStorage key `mgh_best_session_memory-path`
- Ambient synth pad loops (`loop('ambient')`) during play; stops on menu return

**Difficulty config** (`games/memory-path/constants.ts`):
- Easy: 9×9 grid, 6-cell path, 520ms/cell reveal, 2.4s memorize window
- Medium: 12×12 grid, 8-cell path, 440ms/cell reveal, 2.7s memorize window
- Hard: 16×16 grid, 11-cell path, 320ms/cell reveal, 3.2s memorize window

Grid sizes were cut down from 9/16/25 (R3) — at a 375px viewport the old Hard
tap target was 12.4px, far under the WCAG 2.5.8 24px floor. Post-change tap
targets at 375px are Easy 34.6px, Medium 25.9px, Hard 19.4px — much better,
but Hard still lands under the 24px floor; closing that gap needs a smaller
grid or a full-bleed mobile layout, both out of scope here. Note this also
means existing seeded challenge codes (including the daily) now generate
different paths, since the RNG stream draws depend on grid size and path
length — a deliberate one-time reset, not a bug.

**Big-grid performance & tracing** (`PathGrid.tsx`): tiles are plain divs in a
`useMemo`'d layer so sparkle updates don't re-render the 144/256 cells; the few
active overlays (traced ripple, start hint) keep framer-motion. `gridMetrics(size)`
scales tile inset/radius, connector stroke, and grid max-width per difficulty
(tiers re-cut to `<= 9` / `<= 12` / else after the resize). Sparkles now run on
all three sizes — the old 25×25 board was the only one that dropped them, and
it no longer exists. Fast drags fill colinear gaps via `straightRun()` (in `pathGen.ts`,
unit-tested) so tracing tiny tiles completes runs instead of erroring on skipped cells.

**Key files:**
```
games/memory-path/
  MemoryPathGame.tsx      # Main game component
  PathGrid.tsx            # Grid rendering, pointer tracing, sparkle trail, SVG path overlay
  PathResultScreen.tsx    # Results (stats, grid replay with correct/wrong marks, confetti)
  useMemoryPathGame.ts    # Game state hook (stateRef + tracedRef for pointer-move perf)
  pathGen.ts              # generatePath() DFS, comparePaths(), isAdjacent(), Cell type
  constants.ts            # PATH_DIFFICULTY (no `description` — dead, removed),
                          # PATH_FADE_MS, getPathRating()
  types.ts                # PathGameState, PathResult, PathPhase
```

**Tests** (`tests/memoryPath.test.ts`): path generation (length, no revisits, orthogonal steps, inside grid, difficulty presets), `comparePaths` (exact, divergence, short/long traces), `getPathRating` boundaries. Runs in the existing `npm test` suite (139 tests across 11 files, as of this branch).

---

## Cross-cutting: decimal scoring, ratings, and keyboard play

- **Decimal scoring (R2)**: every round score carries up to 2 decimal places
  (`calculateScore`/`round2`/`formatScore` in `utils/scoring.ts`) instead of whole
  integers — `round2` routes through a string round-trip so float artefacts (e.g.
  `7.1 * 100 === 709.9999999999999`) never leak into a displayed or submitted score.
  `formatScore` trims a bare `.00` but keeps real decimals (`.50`, `.46`) so whole
  numbers still read clean.
- **Rating bands are derived from the same score curve everywhere**
  (`ratingFromScore` in `utils/scoring.ts`): Perfect ≥9.5, Great ≥8, Good ≥6, else Try
  Again. All three games' per-difficulty tolerance/description fields that used to
  drive ratings independently are gone — a label can no longer disagree with the
  number shown beside it.
- **Keyboard play in all three games**: Balloon Match's inflate hold and Perfect
  Pour's pour hold both go through `usePressAndHold` (`hooks/usePressAndHold.ts`),
  which drives the same start/end pair from Space/Enter as from pointer events — a
  `<button>` alone only fires a discrete `click`, never a continuous press. Both
  games' post-lock fine-adjust `+`/`-` controls use `useHoldRepeat` from the same
  file (initial delay, then auto-repeat on hold). Memory Path's grid is keyboard-
  focusable (`role="application"`, `tabIndex`) with arrow-key cursor movement that
  paints cells by traversal (`PathGrid.tsx`).

---

## Shared Infrastructure

### Sounds (`lib/sounds.ts`, `hooks/useSound.ts`)

Zero-asset Web Audio synthesis. All sounds generated at runtime:
- **One-shots:** `click`, `tick`, `glow` (path reveal shimmer), `whoosh` (per-segment), `trace` (cell tap), `splash`, `success` (major arpeggio), `celebrate` (full octave arpeggio), `fail`, `error`
- **Loops:** `water` (low-passed brown noise, LFO wobble), `ambient` (Am9-ish detuned sine pad)
- Mute persists in localStorage (`mgh_muted`); `SoundToggle` component (`components/ui/SoundToggle.tsx`)
- **Audio rework this branch**: a document-level, one-time `pointerdown` listener
  now unlocks/resumes the context on the first real user gesture, since WebKit
  silently rejects `ctx.resume()` calls that don't originate from a gesture (was
  previously attempted from interval callbacks and could leave audio dead for the
  session); a master-bus `DynamicsCompressor` limiter now sits before
  `ctx.destination` so overlapping one-shots (e.g. splash + celebrate within
  260ms) can't clip; Perfect Pour's glass-fill got resonance shaping and the
  splash gained a distinct onset transient plus a settle tail instead of a flat
  loop-and-stop.

### Session Summary (`components/game/SessionSummary.tsx`)

Generic end-of-session screen used by **all three** round-based games (Balloon
Match included as of this branch — it used to fork its own `SessionComplete.tsx`
with a separate share-text builder; that duplicate is gone, see below): total
score, per-round breakdown, personal best, share text (`buildSessionShare` in
`lib/share.ts`), replay/menu buttons, confetti for ≥70% or new best.

### Difficulty Selector (`components/game/DifficultySelector.tsx`)

Generic 3-card selector; each game passes its own `DifficultyOption[]` with stat pills.

### Score Card (`components/game/ScoreCard.tsx`)

Top-bar Score /10 · Total /max · Round x/y display, shared across all games.

---

## Storage & Stats (same schema for every future game)

- `lib/server/scoreStore.ts` — boards of `ScoreEntry` keyed by gameId + board
  (board = challenge code, `daily-YYYYMMDD`, `global`, …); new games just add a
  `GAME_RULES` entry in the scores route. **Upserts are atomic** (`upsertScore` →
  `scoreStore.upsertBoard`) — the previous read-modify-write had a race under
  concurrent writers on the file-backed dev store.
- `lib/server/statsStore.ts` — plays counter + unique players (HyperLogLog in Redis);
  game fires `POST /api/events` on each completed round; hub reads `GET /api/stats`
  via `hooks/useSiteStats.ts`
- Backends: `.data/*.json` for dev (gitignored); Upstash Redis via plain-fetch REST
  (`lib/server/redis.ts`, zero npm deps) when `UPSTASH_REDIS_REST_URL` +
  `UPSTASH_REDIS_REST_TOKEN` are set — see `.env.example`
- Visit analytics: `<Analytics />` in layout; activates on Vercel deploy

### API hardening (this branch)

- **Rate limiting**: `lib/server/rateLimit.ts` — an in-memory fixed-window
  limiter, keyed by client IP, applied to `POST /api/scores/[gameId]/[board]`
  (10/min) and `POST /api/events`. It's per-process (resets on cold start, doesn't
  share state across serverless instances), so treat it as a floor against casual
  abuse, not a real defence against a determined multi-IP attacker — a proper fix
  is a shared Redis counter via the same Upstash REST client used for scores/stats.
- **Nickname sanitisation**: `lib/moderation.ts` — `sanitizeName()` strips
  zero-width/bidi-override characters and control characters, folds leetspeak
  before matching, and rejects a short conservative profanity blocklist. Runs on
  every score submission before the name is written to a public leaderboard;
  previously `POST /api/scores/[gameId]/[board]` only did `name.trim().slice(0, 20)`.
- **Score submission validation**: `isValidRoundScore()` in the scores route
  accepts 2dp scores via the same float-safe `round2` check used for display,
  rather than a naive integer check that would reject legitimate decimal scores.

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
  usePressAndHold.ts   # usePressAndHold (pointer + keyboard hold) and
                       # useHoldRepeat (press-and-hold auto-repeat for +/- adjust controls)
  useLeaderboard.ts    # Fetches real boards from /api/scores
  useSiteStats.ts      # GET /api/stats (players/plays totals)
  useSound.ts          # Sound controls hook; wraps lib/sounds.ts singleton
  # useGameTimer.ts was removed this branch — dead code, zero imports anywhere

lib/
  sounds.ts            # Zero-asset Web Audio synthesis engine
  share.ts             # scoreEmoji(), buildSessionShare() for share text
  challenge.ts         # Seeded rounds, codes, DIFFICULTY_ACCENT (derived from
                       # DIFFICULTY_CONFIG, not re-declared), buildChallengeShareText()
  moderation.ts        # sanitizeName() — nickname content filtering for public boards
  player.ts            # Anonymous localStorage identity
  constants.ts         # Game constants (balloon): DIFFICULTY_CONFIG, RANK_COLORS
                       # (shared gold/silver/bronze — see Pending / Next Session #10)
  gameRegistry.ts      # 3 games, all live; hub copy still says "More Coming Soon"
                       # with nothing unavailable to back it (see Pending / Next Session #12)
  utils.ts             # cn(), randomPick(), randomInt(), clamp()
  server/              # redis.ts + scoreStore.ts + statsStore.ts
  server/rateLimit.ts  # createRateLimiter() — in-memory per-IP fixed window

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
10. **`RANK_COLORS` duplication** — `lib/constants.ts` now exports a shared `RANK_COLORS`,
    but `components/leaderboard/Leaderboard.tsx` and
    `components/challenge/ChallengeLeaderboard.tsx` still each declare their own copy
    verbatim; swap both to import the shared one.
11. **Redundant adjacent headings** — every game page renders its own
    `<h2>{Game} — Leaderboard</h2>` directly above `Leaderboard`'s internal
    `<h3>Leaderboard</h3>`. Fix is either drop the page-level `<h2>` (Leaderboard's own
    heading already says enough) or have `Leaderboard` accept a `title` prop and drop its
    hardcoded `<h3>` — page files weren't touched this branch, so this is still open.
12. **"More Coming Soon" is currently untrue** — `gameRegistry.ts` lists exactly 3 games,
    all `isAvailable: true`. The hub's "More Coming Soon" stat tile and copy imply
    unavailable/greyed-out cards that don't exist right now (there's no
    `isAvailable: false` entry to render one). Either add upcoming-game placeholder
    entries or drop the "coming soon" framing from the hub copy — `app/page.tsx` is
    out of scope for this cleanup branch.
