# Adding a game to Tiny Arcadium — the canonical checklist

Every game is a self-contained vertical slice. `<slug>` = kebab id from
`lib/gameRegistry.ts`, `<Name>` = PascalCase. Use `timing-tap` as the living
example of every convention below.

## Files a game owns (create exactly these; touch nothing else)

| File | Purpose |
|---|---|
| `games/<slug>/types.ts` | `<Name>Phase`, `<Name>GameState`, `<Name>Result`, game-local types |
| `games/<slug>/constants.ts` | Difficulty configs + PURE scoring/generation functions (no React — vitest runs in node) |
| `games/<slug>/challenge.ts` | `make<Name>Round(difficulty, rand)` + `get<Name>ChallengeRounds(code)` seeded via `makeChallengeRand(code, '<slug>')` — **never omit the slug salt** |
| `games/<slug>/use<Name>Game.ts` | `'use client'` hook — the whole state machine |
| `games/<slug>/<Name>Game.tsx` | `'use client'` orchestrator: ModeSelector → DifficultySelector → play → result → summary |
| `games/<slug>/components/*.tsx` | Game-specific visuals (canvas/SVG/DOM) |
| `games/<slug>/content.ts` | `CONTENT: GameContent` (intro/tips/faq/related) — see types/content.ts |
| `app/games/<slug>/page.tsx` | Server page: metadata + JSON-LD + GameHeader + game + HowToPlay + GameArticle + Leaderboard + AdBanner |
| `app/games/<slug>/challenge/[code]/page.tsx` | Challenge route (async params, noindex) |
| `tests/<slug>.test.ts` | Pure-logic tests (node env, no DOM) |

Also: add one import line for your `CONTENT` to the map in
`components/seo/GameArticle.tsx` (a comment marks the spot).

**Never touch:** `lib/gameRegistry.ts` (the lead flips `isAvailable` after
review), `public/sw.js`, `app/globals.css` (use Tailwind utilities, inline
styles or `games/<slug>/styles.module.css`), shared components, other games,
`package.json`.

## The hook — non-negotiable patterns (all five live games do this)

- `const GAME_ID = '<slug>'` at the top; signature
  `use<Name>Game({ challengeCode }: { challengeCode?: string } = {})`.
- Initial state: `mode: challengeCode ? 'challenge' : 'normal'`, `phase:
  challengeCode ? 'challenge-intro' : 'selecting-difficulty'` (or your menu
  phase), `totalRounds: challengeCode ? CHALLENGE_ROUND_COUNT : <solo count>`.
- `usePlayBeacon(GAME_ID)` once (from `hooks/usePlayBeacon`).
- Personal bests: `useSyncExternalStore(noopSubscribe, () =>
  getLocalBestSession(GAME_ID), () => 0)`; save via
  `saveBestSession(GAME_ID, total)` — both from `utils/scoring`.
- Countdowns derive from a stored deadline (`performance.now() + n*1000`),
  never `n-1` per tick. rAF loops clamp `dt` (max 1/15s). Pause on
  `visibilitychange` instead of scoring a phantom input.
- Per-round idempotency ref (`resolvedRef`) so double taps can't score twice;
  ~500ms `transitioningRef` guard on advancing.
- Sounds: `const { play } = useSound()` — names in `lib/sounds.ts`
  ('click','success','fail','tick','celebrate','sparkle', …). New synth sounds
  belong in lib/sounds.ts ONLY if truly needed — prefer existing ones.
- Round scores use the shared scale: accuracy 0–100 → `calculateScore()` →
  0–10 with 2 decimals (`round2`). Challenge = exactly 3 rounds.

## Modes

Every game ships all three (via `ModeSelector` with the game's accent):
- **Solo** — free format (5 scored rounds by default; endless/arcade formats
  welcome where they fit the game). Ends in `SessionSummary` (it auto-grants
  XP/quests via `recordGameResult` — do not call it yourself when using
  SessionSummary) or a custom result screen that calls
  `recordGameResult({ gameId, mode: 'solo', totalScore, maxScore, ... })`
  directly (from `lib/recordResult`).
- **Daily Challenge** — `getDailyChallengeCode()` → `router.push(challengePath(GAME_ID, code))`.
- **Friend Challenge** — `generateChallengeCode()` → same navigation. The
  challenge flow is: `ChallengeIntro` → 3 seeded rounds → `ChallengeComplete`
  (it posts to the leaderboard and grants XP itself).

## The two pages

Copy `app/games/timing-tap/page.tsx` structure exactly, with these updates:
- jsonLd comes from `buildGameJsonLd({ meta, content, longDescription })` +
  `jsonLdScriptProps(...)` (lib/seo) — meta via `getGameMeta('<slug>')`.
- `<GameArticle gameId="<slug>" />` goes between `HowToPlay` and the
  `Leaderboard` section.
- metadata: unique `title` (short — the layout template appends the site
  name), ≤160-char `description`, `alternates.canonical: '/games/<slug>'`,
  openGraph + twitter blocks with `/og.png`.

Challenge page: copy timing-tap's `challenge/[code]/page.tsx` —
`params: Promise<{ code: string }>` + `await params` (Next 16),
`isValidChallengeCode` → `notFound()`, `robots: { index: false, follow: false }`.

## Content (`content.ts`)

Real, accurate writing — this is the AdSense-facing substance:
- `intro`: 2–3 paragraphs (~150–250 words) on what the game is and what skill
  it exercises. `tips`: 4–6 concrete strategies. `faq`: 4–6 accurate Q&As
  (scoring numbers must match your constants; daily resets midnight UTC;
  bests stored on-device; challenge boards keep 7 days; free, no signup).
  `related`: 3–4 registry ids.
- `HOW_TO_PLAY_STEPS` on the page: 4–6 full prose sentences (they double as
  indexable copy).

## Tests (`tests/<slug>.test.ts`)

Node environment — pure logic only (why scoring/generation live in
`constants.ts`/`challenge.ts`): challenge rounds deterministic per code,
case-insensitive, differ across codes, in-range; scoring boundaries and
clamps; any board/bot/generation logic (e.g. solvability, bot never makes an
illegal move). 30+ assertions is typical here.

## Acceptance gate (run before reporting)

`npx tsc --noEmit` · `npm test` · `npx eslint <your files>` — all clean, and
`npm run build` must not be broken by your files (the lead runs it per wave).
