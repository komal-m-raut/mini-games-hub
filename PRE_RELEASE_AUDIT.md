# Pre-Release QA & Polish Audit

**Build audited:** branch `feat/per-game-modes-challenges` @ `8f2b118`
**Date:** 2026-07-31
**Scope:** all 3 live games (Balloon Match, Perfect Pour, Memory Path), hub, challenge flows, shared design system, API, PWA
**Status:** Phase 1 — audit only. **Nothing has been implemented.**

---

## 1. Executive summary

The app is well built. Types are clean (`tsc --noEmit` passes), tests pass (55/55), there are no console errors, no XSS holes, and score submission is already server-derived so totals can't be forged. The architecture (shared scoring, shared session/challenge components, per-game registry) is sound and the fixes below are mostly surgical.

But it is **not yet a release candidate.** Five things would be noticed by real users or would quietly undermine the product on day one:

1. **The Daily Challenge is not actually daily-worldwide.** It's keyed to each player's *local* midnight, so the "same rounds worldwide today · shared board" promise is false and the leaderboard silently splits by timezone.
2. **Every page is server-rendered at `opacity: 0`** and only revealed by JavaScript animation. If the JS bundle fails or stalls, users get a **completely blank page** — verified: 12 elements on the hub, including the `<h1>` and all game cards, stay invisible. The service worker's `CACHE_VERSION` has never been bumped across many deploys, which makes serving a stale/broken chunk a live possibility.
3. **None of the three games can be played with a keyboard.** The core mechanic in all three (hold-to-inflate, hold-to-pour, drag-to-trace) is pointer-only.
4. **Memory Path on Hard is effectively unplayable on a phone** — 12.4px tiles at 375px, about a quarter of the recommended touch target. (Your requested 9/12/16 change fixes this.)
5. **Balloon Match has no sound at all**, while the other two games are fully scored with audio. It reads as broken, not as a design choice.

Alongside those, `prefers-reduced-motion` is ignored by every animation in the app (all motion is Framer Motion / canvas, which the existing CSS-only reduced-motion rule cannot touch), and low-opacity text fails WCAG AA contrast in dozens of places.

Separately, your own design review (§6.4) calls for a **screen-density pass**: the mode and difficulty cards carry explanatory copy and stat pills that aren't earning their space, the in-game top bar packs three numeric readouts into 375px, and the result screen's accuracy/difference stat row should go. That review also surfaced two real defects I'd missed — a **clipped "Next Challenge" button** and an **unfilled AdSense slot rendering as a full-width white slab on the dark theme** — and one feature request (**fine-adjust controllers**) that happens to be the cheapest credible fix for the keyboard gap in C4.

**Counts:** 5 Critical · 14 High · 29 Medium · 15 Low — **63 findings** (C1–C5, H1–H14, M1–M29, L1–L15), plus 4 directed changes (R1–R4).
**Estimated effort to zero known issues:** roughly 4–5 focused working sessions, parallelisable across ~6 workstreams (see §7).

### How this audit was produced
- **Static audit:** 4 Sonnet subagents read every file in their area line-by-line (Balloon Match; Perfect Pour + audio engine; Memory Path + grid sizing; shared infra/design system/API/PWA), and ran `tsc`, `eslint`, `vitest`.
- **Live audit:** dev server driven in-browser at 375×812 (primary), 768 and 1280, plus DOM measurement scripts for overflow, touch-target size, font size, heading structure, and metadata; SSR HTML inspected via `curl`.
- **Design review:** annotated screenshots from your own device pass (production build with ads live), written up in §6.4 and cross-referenced into the findings tables.
- **Verification:** every Critical and High finding below was re-confirmed by me directly against source before inclusion. Findings I could not visually confirm (because of a tooling limitation, see §10) are labelled **[computed]** and carry their derivation.

---

## 2. Severity & priority definitions

| Severity | Meaning |
|---|---|
| **Critical (P0)** | Breaks a core product promise, locks out a whole user group, or risks a blank/broken page in production. Must fix before launch. |
| **High (P1)** | A defect most users on the primary (mobile) target will hit, or a visible unfairness/inconsistency. Should fix before launch. |
| **Medium (P2)** | Polish, consistency, robustness, accessibility gaps. Fix before launch if time allows. |
| **Low (P3)** | Cosmetic, dead code, or nice-to-have. Can ship after. |

Priority = severity, except where a fix is nearly free (bundled into the same file touch) — those are pulled forward in §7.

---

## 3. Critical findings (P0)

### C1 — "Daily Challenge" uses local device time, so the worldwide board splits by timezone
- **Area:** Challenge system (all games) · **Severity:** Critical
- **Evidence:** `lib/challenge.ts:91-96`
  ```ts
  export function getDailyChallengeCode(date: Date = new Date()): string {
    const y = date.getFullYear();          // local, not UTC
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `daily-${y}${m}${d}`;
  }
  ```
  Marketed as **"Same rounds worldwide today · shared board"** — `components/game/ModeSelector.tsx:31`.
- **Root cause:** Local `Date` getters instead of `getUTC*`. The code rolls over at each player's local midnight.
- **Impact:** Two players in different timezones can be on different boards at the same moment, and the same player crossing local midnight jumps boards. `hooks/useLeaderboard.ts:11` (`boardFor('today')`) inherits the same bug, so the hub's "Today" tab is really "today in your timezone."
- **Fix:** Switch to `getUTCFullYear()/getUTCMonth()/getUTCDate()`. Add a unit test pinning a known instant in two timezones to the same code.
- **Note:** This changes today's daily code for anyone not already on UTC — acceptable pre-launch, see §6.5.

### C2 — Pages are server-rendered invisible; any JS failure yields a blank page
- **Area:** Site-wide (layout / all pages) · **Severity:** Critical
- **Evidence:** SSR HTML contains `opacity:0` on real content — 9 occurrences on `/`, 4 on each game page (verified via `curl … | grep -o 'opacity:0[;"]'`). Live confirmation with the animation frame loop stalled:
  ```
  { stillHiddenCount: 12, samples: [
      "DIV:Instant play · No download · No login re",
      "H1:Mini Games Hub",
      "P:Quick stress-buster games to relax, focu",
      "DIV:3 Games Live\n18 Players\nMore Coming Soon",
      "H2:Choose a Game",
      "DIV:🎈\nPlay Now\nBalloon Match…" ] }
  ```
- **Root cause:** Framer Motion `initial={{ opacity: 0 }}` on top-level content blocks (`app/page.tsx:98-148`, each game's phase wrappers). Framer serialises `initial` into the SSR markup, so content is invisible until JS hydrates *and* the animation frame loop runs.
- **Impact:** Blank page on JS failure, ad-blocker chunk breakage, or a stale/broken cached chunk. Also a real perceived-performance cost: nothing paints until hydration, and (per C3-adjacent) a background tab that never gets a frame stays blank until focused.
- **Compounding risk:** `public/sw.js:3` — `const CACHE_VERSION = 'mgh-v1';` has never been bumped despite many deploys, and the fetch handler caches responses without checking `response.ok`, so 404/500 responses get cached too.
- **Fix (three parts):**
  1. Render above-the-fold content visible by default; animate with CSS `@keyframes` (which paints even pre-hydration) or gate `initial` on a mounted flag so SSR emits `opacity: 1`.
  2. Bump `CACHE_VERSION` and wire it to the build ID so every deploy invalidates; add `if (!response.ok) return response;` before every `cache.put`.
  3. Add `/games/perfect-pour` and `/games/memory-path` to `CORE_ASSETS` (`public/sw.js:4`, currently only `/` and `/games/balloon-match`).

### C3 — `prefers-reduced-motion` is ignored by every animation in the app
- **Area:** Site-wide · **Severity:** Critical (accessibility)
- **Evidence:** `app/globals.css:683-689` only neutralises CSS `animation-duration`/`transition-duration`. Repo-wide grep for `useReducedMotion` / `MotionConfig` returns **zero matches**, yet Framer Motion drives essentially all motion — hero (`app/page.tsx:98-148`), every `whileHover`/`whileTap`, the infinite balloon pulse (`games/balloon-match/BalloonCanvas.tsx:88-92`), the infinite start-hint pulse (`games/memory-path/PathGrid.tsx:192-209`), the glass fill spring (`games/perfect-pour/GlassCanvas.tsx:168-178`). `canvas-confetti` (`components/ui/ConfettiEffect.tsx`) is canvas-based and equally unaffected.
- **Root cause:** Framer Motion animates via inline styles / WAAPI, outside the reach of a CSS `animation-duration` override.
- **Impact:** Users who have opted out of motion at OS level still get full-screen confetti, infinite pulses and springs. For a "relaxing, stress-buster" product this is directly counter to the positioning.
- **Fix:** Wrap the app in `<MotionConfig reducedMotion="user">` in `app/layout.tsx` (one line, covers all Framer motion), and gate `ConfettiEffect` behind `useReducedMotion()`.

### C4 — None of the three games can be played with a keyboard
- **Area:** All games · **Severity:** Critical (accessibility)
- **Evidence:**
  - Balloon Match: `games/balloon-match/BalloonGame.tsx:232-234` — `<div {...holdHandlers} className="inflate-zone">`, no `tabIndex`, `role`, `aria-label`, or key handlers.
  - Perfect Pour: `games/perfect-pour/PerfectPourGame.tsx:216-230` spreads pointer handlers onto a real `<button>` — but a `<button>` fires `click` on Enter/Space, never `pointerdown`/`pointerup`, so the lever does nothing.
  - Memory Path: `games/memory-path/PathGrid.tsx:95-126` — tracing is pure `onPointerDown/Move/Up` + `elementFromPoint`; zero `role`, `aria-*`, `tabIndex` or `onKeyDown` in the file.
  - Shared: `hooks/usePressAndHold.ts:49-56` returns only `onPointerDown/Up/Cancel`.
- **Root cause:** All three mechanics were built pointer/touch-first with no keyboard equivalent.
- **Impact:** Keyboard-only and switch-access users can navigate the menus (real `<button>`s) and reach the play screen, then cannot play at all.
- **Fix:**
  - Add `onKeyDown`/`onKeyUp` (Space/Enter, guard `e.repeat`) to `usePressAndHold` — fixes Balloon Match and Perfect Pour at once.
  - Make the inflate zone a real `<button>` with `aria-label`.
  - Memory Path needs a genuine design decision (arrow-key cursor + Space to lay a cell is the cheapest credible option). If that's too much scope for launch, the honest alternative is to state the limitation rather than ship it silently — see §8.

### C5 — Memory Path Hard is unplayable by touch (12.4px tiles)
- **Area:** Memory Path · **Severity:** Critical (usability) · **Resolved by your requested change R3**
- **Evidence [computed, chain verified in source]:** at 375px — `page-container` `padding-inline: 16px` (`app/globals.css:667`) → 343px; card `px-4` (`games/memory-path/MemoryPathGame.tsx:167`) → **311px grid**. `PathGrid`'s `maxWidth` (420/480/540) never binds at phone widths. Hit-testing runs on `[data-cell]` (the whole `.path-cell`), so tap target = `311 / size`:

  | Difficulty | Grid | @320px | **@375px** | @768px | @1280px |
  |---|---|---|---|---|---|
  | Easy | 9×9 | 28.4px | **34.6px** | 46.7px | 46.7px |
  | Medium | 16×16 | 16.0px | **19.4px** | 30.0px | 30.0px |
  | Hard | 25×25 | 10.2px | **12.4px** | 21.6px | 21.6px |

- **Root cause:** Grid sizes were chosen for visual density, never checked against a physical fingertip.
- **Impact:** WCAG 2.5.8 sets a **24×24px** floor; Apple HIG recommends 44×44pt. A fingertip contact patch (~40–58px) covers **3.5–4.7 Hard tiles at once**. Medium is already under the WCAG floor. Even at 1280px, Hard only reaches 21.6px.
- **Fix:** The 9/12/16 resize (§6.3). Post-change at 375px: Easy 34.6px, Medium 25.9px, Hard 19.4px. Honest caveat: **Hard still lands under the 24px WCAG floor** — see §6.3 for how far this can realistically be pushed and what the trade-off is.

---

## 4. High findings (P1)

| ID | Title | Area | Evidence | Root cause | Fix |
|---|---|---|---|---|---|
| **H1** | Balloon Match has no sound at all | Balloon Match | Repo grep: zero `useSound`/`playSound`/`SoundToggle` in `games/balloon-match/**` (verified). Both siblings are fully wired (`games/perfect-pour/usePourGame.ts`, `games/memory-path/useMemoryPathGame.ts`) and render `<SoundToggle/>`. | Never wired to `lib/sounds.ts`. | Add `useSound()`; `click` on interactions, `tick` on countdown, `celebrate`/`success`/`fail` keyed off rating in `lockIn`, plus a new inflate-hiss loop. Render `<SoundToggle/>` next to the score card. |
| **H2** | Result-screen balloon comparison distorts the very thing it exists to show | Balloon Match | `games/balloon-match/BalloonCanvas.tsx:112-133` — `flex … gap-16 sm:gap-24`, no wrap/clamp; `Balloon` sets a hard `style={{ width: diameter }}` (`:72-73`), `UNIT_TO_PX = 2.2`, Hard `maxUnits: 88` → 193.6px each. **[computed]** Two × 193.6 + 64px gap = **451px** into ~295px of usable card width. | Fixed px widths on shrinkable flex items with no clamp. | Flex shrinks both balloons unevenly-but-proportionally and the card's `overflow:hidden` clips the rest — so the size *difference*, the entire point of the screen, is misrepresented on mobile. Clamp diameter to `(containerWidth − gap) / 2`, shrink the gap on mobile. |
| **H3** | Rating text contradicts the score shown beside it | Balloon Match, Perfect Pour | Two uncalibrated systems: `utils/accuracy.ts:17-23` (`getRating`, tolerance-based) vs `utils/scoring.ts:10-12` (`calculateScore`, accuracy-based). On Hard (`tolerancePercent: 5`), 89.9% accuracy renders **"Try Again — keep practicing"** next to **8/10**. Perfect Pour has the mirror bug: Easy `tolerance: 10` rates a 10-point miss "🏆 Perfect / Not a drop wasted!" next to **8/10** (`games/perfect-pour/constants.ts:69-74` + `PourResultScreen.tsx:80-87`). | Rating and score derive from independently-tuned formulas. | Derive rating bands from the score curve (or vice versa) so label and number can never disagree. **Do this together with the decimal-scoring change (R2) — same code, one migration.** |
| **H4** | Perfect Pour "Try Again" copy assumes over-pouring, contradicts the stat next to it | Perfect Pour | `games/perfect-pour/PourResultScreen.tsx:42` — `message: 'Ease off the pour a little.'` is static, but `getPourRating` (`constants.ts:69-74`) keys off `abs(diff)`. Under-pouring shows "Try Again" + "Ease off the pour a little" + "6% too little" simultaneously. | Direction-agnostic rating, direction-specific copy. | Branch the message on `sign(actual − target)`. |
| **H5** | Water loop has zero coupling to fill level — it's ambient noise, not a glass filling | Perfect Pour / audio | `lib/sounds.ts:241-328` (`startWater(c)` takes only the context; nothing is updated after start). Called argument-free at `games/perfect-pour/usePourGame.ts:252`. The 60fps pour tick (`:256-266`) already recomputes fill every 16ms and never tells the audio engine. | No parameter path from game state into the audio graph. | **This is your requested change R1** — full synthesis spec in §6.1. |
| **H6** | Muting mid-pour permanently silences that pour even after unmuting | Perfect Pour / audio | `lib/sounds.ts:55-65` — `setMuted` calls `stopAllLoops()`, which deletes `'water'` from the loops map (`:394-397`). `startLoop('water')` only runs once, at pour start. | Unmute has no path to restart an in-flight loop. | On unmute, restart any loop that should be active (expose current-loop intent, or have `usePourGame` re-issue `loop('water')` when unmuted while `state.isPouring`). |
| **H7** | No `<h1>` on any game page; the game's name is never shown on screen | All games / SEO + a11y | Live DOM check on `/games/balloon-match` returned headings: `["H2: How do you want to play?", "H2: Balloon Match — Leaderboard", "H3: Leaderboard"]`. The hub does have an `<h1>` — the game pages don't. Verified: nothing in `BalloonGame`/`PerfectPourGame`/`MemoryPathGame`/`ModeSelector`/`ChallengeIntro` renders the game title. | Titles live only in `<title>` metadata. | Add a visible (or at minimum `sr-only`) `<h1>` per game page. A player arriving from a shared challenge link currently has no on-screen indication of which game they're in. |
| **H8** | Game pages ship no `og:image`, and Twitter tags contradict OG tags | SEO / sharing | `curl` of all three game pages: `og:title` is game-specific, **no `og:image`**, while `twitter:title`/`twitter:description`/`twitter:image` fall back to the layout defaults ("Mini Games Hub"). `/og.png` exists (200, 103KB) but game pages never reference it. `/privacy` inherits `og:url` of `/`. | Per-page `openGraph` blocks omit `images`; `twitter` block never overridden. | Add `images` + a `twitter` block to each game page's metadata; fix `/privacy` canonical. This is the difference between a shared challenge link showing a rich card or a bare URL. |
| **H9** | Service worker never invalidates and caches error responses | PWA | `public/sw.js:3` `CACHE_VERSION = 'mgh-v1'` (unchanged across ~25 commits); `:38-42`, `:57-63`, `:72-78` all `cache.put` without checking `response.ok`; `:4` `CORE_ASSETS` missing two of three games. | No release-time cache busting. | Tie `CACHE_VERSION` to the build ID; guard every `cache.put` with `response.ok`; add the missing routes. See also C2. |
| **H10** | `npm run lint` fails — 9 errors | Tooling | `app/privacy/page.tsx:40,44(×2),52,56,60,76,84(×2)` — `react/no-unescaped-entities` on raw `'`. | Straight apostrophes in JSX. | Replace with `’` (already used correctly in the challenge pages). A failing lint is a broken release gate. |
| **H11** | Second finger can end an in-progress hold / corrupt a trace | All games | `hooks/usePressAndHold.ts:17,39-47` — `isHoldingRef` is a single boolean; `handleEnd` never compares `e.pointerId` to the captured pointer. `games/memory-path/PathGrid.tsx:95-126` — same, `drawingRef` is one boolean and any pointer's `pointerdown` calls `onTraceCell`. | No per-pointer identity tracking. | Store the active `pointerId` on start; ignore events from any other id until it releases. |
| **H13** | **Primary action button clips its own label** — "Next Challenge" renders as "Next Challeng" with the icon half-cut *(your screenshot 4)* | All games | `games/balloon-match/ResultScreen.tsx:150-160` — both buttons are `flex-1` inside `className="flex gap-3 w-full max-w-sm"`, each with `whitespace-nowrap`. **[computed + screenshot-confirmed]** At 375px the card interior is ~295px, so each button is `(295 − 12) / 2 ≈ 141px`; "Next Challenge" + 16px icon + `gap-2` + `.neon-btn` horizontal padding needs ≈170px. Labels come from `BalloonGame.tsx:288-290` — `'Next Round'` / `'Next Challenge'` / `'Final Results'`. | `whitespace-nowrap` forbids wrapping, `flex-1` refuses to grow past 50%, and flex items default to `min-width: auto` — so the text simply overflows and is clipped by the button's bounds. | Shorten the labels (`'Next'` / `'Results'`), and/or stack the two buttons vertically below ~380px, and/or drop the icon on the primary action at small widths. Add `min-w-0` and allow wrapping as a safety net. This is on the single most-pressed button in the game. |
| **H14** | **Unfilled AdSense slot renders as a full-width white block on the dark theme** *(your screenshots 2 and 4)* | Ads / all pages | `components/ads/AdBanner.tsx:63-78` — the live branch renders `.ad-container` with `height: 90px; overflow: hidden` and an `<ins>` at `width/height: 100%`, with **no background color**. `app/globals.css:587` — `.ad-container { max-width: 100%; }` and nothing else. When AdSense has no fill, the iframe paints white. | The ad container inherits no theme and reserves a hard 90px box, so a blank/unfilled ad is a bright white slab mid-page. Compounded by `data-ad-format="auto"` + `data-full-width-responsive="true"` fighting the fixed `height: 90px` + `overflow: hidden` — auto format wants to size itself and gets clipped. | Give `.ad-container` the dark surface treatment (`background: rgba(255,255,255,0.02)`, subtle border, `border-radius`) so an unfilled slot reads as an empty panel, not a white hole. Either commit to a fixed size (drop `format="auto"`) or commit to responsive (drop the fixed height and `overflow:hidden`) — not both. Consider collapsing the container when unfilled. |
| **H12** | Backgrounding the tab is exploitable and glitchy | Balloon Match, Perfect Pour | Growth/pour loops are wall-clock based with **no `dt` clamp** (`games/balloon-match/useBalloonGame.ts:269-280`, `games/perfect-pour/usePourGame.ts:255-266`), while the *countdowns* decrement by a fixed 1 per tick (`useBalloonGame.ts:126-136`, `:239-252`). Repo-wide grep: no `visibilitychange` handler anywhere. | Two timing models in the same round; throttled tabs desync them. | Clamp per-tick `dt` (e.g. `min(dt, 4×TICK)`), drive countdowns off a stored deadline timestamp, and pause/lock-in on `visibilitychange`. Affects the shared challenge leaderboard, so this is fairness, not just polish. |

---

## 5. Medium & Low findings (P2 / P3)

### 5.1 Accessibility & contrast

| ID | Sev | Finding | Evidence |
|---|---|---|---|
| M1 | Med | **Low-opacity text fails WCAG AA broadly.** Against `--color-bg-base: #0F0F23`: `white/20` → **1.83:1**, `white/25` → 2.20:1, `white/30` → **2.66:1**, `white/35` → 3.19:1, `white/40` → **3.81:1**. AA needs 4.5:1 for normal text; `white/50` → 5.21:1 passes. | `.stat-label` `app/globals.css:508`; `components/game/ScoreCard.tsx:34,46,58`; `components/challenge/ChallengeComplete.tsx:140`; `components/layout/Footer.tsx:28`; `components/leaderboard/Leaderboard.tsx:96`; `games/balloon-match/BalloonGame.tsx:247,258-261`; `games/perfect-pour/PerfectPourGame.tsx:234`; `games/memory-path/MemoryPathGame.tsx:239`. Instructional copy ("Drag to retrace it…", "Hold to start", progress %) is among the worst offenders. |
| M2 | Med | No `aria-live` anywhere — round results, ratings, scores and countdowns are never announced. | Zero `aria-live`/`role="status"` in `games/**` or `components/game/**`. |
| M3 | Med | No skip-to-content link. | Grep: no `skip-link`/`Skip to` in `app/layout.tsx` or `Navigation.tsx`. |
| M4 | Med | No focus management on client-side route change. | `components/layout/Navigation.tsx` — plain `next/link`, nothing moves focus to `<main>`/`<h1>`. |
| M5 | Med | Nav home icon link has **no accessible name**. | Live DOM: `{tag:"A", href:"/", txt:"", aria:null}`. |
| M6 | Med | Touch targets under 44px on primary controls. | Nav links 44×28px and 89×34px (measured live); footer links 94×20 and 55×20; `.nav-link` `app/globals.css:151`; `SoundToggle` `p-2` ≈32px; `.lb-tab` `app/globals.css:537` ≈26px; Menu/Restart buttons have **no padding at all** (`games/balloon-match/BalloonGame.tsx:98-104,140-146`). |
| M7 | Med | Sub-13px text on real content. | Measured live: difficulty/tag pills at **10px**; `.stat-label` `0.65rem` (`app/globals.css:505`); ad placeholder `0.65–0.7rem`; footer copyright 12px. |
| L1 | Low | `scroll-behavior: smooth` is global and unconditional, not gated on reduced motion. | `app/layout.tsx:79` `data-scroll-behavior="smooth"`; computed `scrollBehavior: "smooth"` confirmed live. |

### 5.2 Game logic & robustness

| ID | Sev | Finding | Evidence |
|---|---|---|---|
| M8 | Med | Memory Path shows "Drag to retrace it…" a full 700ms *before* the grid accepts input — the first drag is silently dropped. | `games/memory-path/MemoryPathGame.tsx:240` (copy shown during `fading`) vs `:210` `interactive={isTracing}`; `PathGrid.tsx:97` `if (!interactive) return;`. `PATH_FADE_MS = 700` (`constants.ts:67`). |
| M9 | Med | `touch-action: none` is always on for the path grid, including non-interactive phases and the read-only results replay — a finger resting over the grid can't scroll the page. | `app/globals.css:455-471` (class-level, not gated on `interactive`); results grid `PathResultScreen.tsx:148-155`. Compounds M10. |
| M10 | Med | **[computed]** Submit/Clear can sit at or below the fold on a 375×667 viewport mid-trace. Stack ≈591px against ≈571px visible (before mobile Safari chrome). | `games/memory-path/MemoryPathGame.tsx:164-243`. |
| M11 | Med | **[computed]** Perfect Pour Easy pushes the pour lever below the fold on 375×667. Easy glass box alone is `297 × 1.15 ≈ 342px`. | `games/perfect-pour/GlassCanvas.tsx:91-92`; `POUR_DIFFICULTY.easy.glassScale = 1.15` (`constants.ts:29`). |
| M12 | Med | Observe-countdown `setState` updater performs side effects (`clearInterval`, ref mutation) inside the updater — updaters must be pure. | `games/perfect-pour/usePourGame.ts:137-150`. |
| M13 | Med | `localStorage` best-score reads are `NaN`-fragile and writes are unguarded. One corrupt value permanently freezes high-score detection and renders `Best: NaN/50`. | `utils/scoring.ts:21-34,48-61`; called inside `setState` updaters at `useBalloonGame.ts:199,304`. |
| M14 | Med | File-backed score/stat store has a read-modify-write race with no lock. | `lib/server/scoreStore.ts:26-46`, `lib/server/statsStore.ts:50-61`. Only active when Upstash env vars are absent — **which is the case for any deploy target where they weren't set.** |
| M15 | Med | No rate limiting on `POST /api/scores/*` or `/api/events`. | `app/api/scores/[gameId]/[board]/route.ts`, `app/api/events/route.ts`. Leaderboards and the hub's public play counter can both be spammed. |
| M16 | Med | Public nickname field has no content filtering. | `app/api/scores/[gameId]/[board]/route.ts:97` — `name.trim().slice(0, 20)` only. Rendered publicly on shared boards. With AdSense live this is a content-policy exposure, not just a taste issue. |
| M17 | Med | Grid re-renders rebuild every cell on each reveal/trace tick, not just on sparkle updates as documented. | `games/memory-path/PathGrid.tsx:134-214` — memo deps include `revealed` and `traced`. 625 elements/tick on today's Hard. Becomes negligible after the 9/12/16 resize. |
| L2 | Low | Sparkle-removal timeouts never cleared on unmount. | `games/memory-path/PathGrid.tsx:78-93`. |
| L3 | Low | Dangling 500ms `setTimeout` in `nextRound` not tracked/cleared. | `games/memory-path/useMemoryPathGame.ts:355-357`. |
| L4 | Low | Clear button looks enabled but no-ops for ~380ms after path completion. | `games/memory-path/MemoryPathGame.tsx:221` vs `useMemoryPathGame.ts:307-309`. |
| L5 | Low | `startInflating` guards on the interval ref but not on phase, unlike `lockIn` — a stray `pointerdown` during the exit animation briefly orphans an interval. | `games/balloon-match/useBalloonGame.ts:256-281` vs `:192`. |
| L6 | Low | Clipboard writes unguarded — a denied/unavailable clipboard silently gives no feedback. | `games/balloon-match/SessionComplete.tsx:49`, `components/challenge/ChallengeIntro.tsx:34`, `ChallengeComplete.tsx:86`. The score-submit path in the same file *does* try/catch correctly. |
| L7 | Low | Dead field `GameResult.sizeDiffPercent` — computed, never rendered; the UI recomputes the same number a second way. | `types/game.ts:20`, `useBalloonGame.ts:213` vs `ResultScreen.tsx:118-121`. |

### 5.3 Audio engine

| ID | Sev | Finding | Evidence |
|---|---|---|---|
| M18 | Med | `ctx.resume()` can be attempted from non-gesture contexts (interval callbacks), which WebKit silently rejects — audio can stay dead for the session with the toggle still showing "unmuted". | `lib/sounds.ts:73-86`, called from `usePourGame.ts:135,149`. Fix: a one-time document-level `pointerdown` listener that resumes whenever `ctx.state !== 'running'`. |
| L8 | Low | No limiter/compressor on the master bus. | `lib/sounds.ts:78-81` connects straight to `destination`. Overlapping one-shots (splash + celebrate within 260ms) have no headroom. |
| L9 | Low | `g.connect(master!)` non-null assertions. | `lib/sounds.ts:131,158`. Safe today; a latent footgun. |
| — | Info | iOS hardware silent switch mutes Web Audio with no in-app signal. Not fixable in JS; worth a one-line hint near the toggle. | `lib/sounds.ts` (platform limitation). |

### 5.4 Design system, copy & consistency

| ID | Sev | Finding | Evidence |
|---|---|---|---|
| M27 | Med | **Result stat cards don't align across the row** — a two-line value pushes its label out of line with its neighbours *(your screenshots 4 and 5)*. | `app/globals.css:490-518` — `.stat-card` is `flex-direction: column; justify-content: center; min-height: 72px`, and `.stat-value` has `word-break: break-word`. "18% too big" wraps to two lines, so that card's label+value block is taller and, being **centred**, its label sits higher than the single-line cards beside it. Fix: `justify-content: flex-start` (or align the labels in their own fixed-height row) so labels share a baseline regardless of value height. Largely moot if the row is removed per §6.4 U7. |
| M28 | Med | **Ads render alongside live gameplay**, contradicting the component's own contract. | `components/ads/AdBanner.tsx:25` documents *"Never renders during gameplay — only place this component outside game views"*, but `app/games/*/page.tsx` renders `<AdBanner>` unconditionally below `<BalloonGame/>`, so it is on screen during difficulty select and the results screen *(your screenshots 2 and 4)*. Beyond the visual noise, an ad directly beneath the primary action button is an accidental-click risk that AdSense's own placement policies discourage. Fix: hide the banner while `phase` is an active play/results phase, or move it below the leaderboard. |
| M29 | Med | **"🎉 New High Score!" fires on a "Try Again" 3/10 result** *(your screenshot 3)* — tonally wrong to celebrate the worst rating band. | `games/balloon-match/ResultScreen.tsx:92-101` renders the badge purely on `isNewHighScore`, which `useBalloonGame.ts:199` sets from `saveHighScore(roundScore)` — any score beats a fresh/low stored best. Fix: gate the badge on rating ≥ Good (or on a meaningful margin), so a low score never gets a celebration. |
| M19 | Med | **Orbitron bold renders numerals as near-solid blocks at 18px.** The score readout `0/10` reads as `▨/10` on mobile — verified visually. This gets materially worse with two decimal places (R2). | `components/game/ScoreCard.tsx` — `font-display font-bold text-lg`, computed `fontFamily: "Orbitron"`. Recommend JetBrains Mono with `font-variant-numeric: tabular-nums` for all numeric readouts. |
| M20 | Med | Daily challenge title wraps mid-date: **"Daily · 2026-07-** / **31"**. Raw ISO date is also poor user-facing copy. | Verified visually at 375px on `/games/balloon-match/challenge/daily-20260731`. |
| M21 | Med | Three separate nav links all point to `/` — logo, unlabeled home icon, and "← Back". "Back" is misleading (it navigates to the hub, not history). | Live DOM: three `<a href="/">` entries. |
| M22 | Med | Container gutters diverge at `lg`: `.page-container` uses 40px, Nav/Footer use 32px, both at `max-width: 1280px`. | `app/globals.css:667-678` vs `Navigation.tsx:23`, `Footer.tsx:13`. |
| M23 | Med | Ad placeholder renders live in production if the publisher ID env var is missing, with no warning. | `components/ads/AdConfig.ts:13`; `.env.local` currently has **no** `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID`. |
| M24 | Med | Two "728×90 leaderboard" ad slots stack ~200px apart at the bottom of a 375px hub, creating a large dead zone and the wrong format for mobile. | Verified visually; `components/ads/AdConfig.ts` slots `below-hub-banner` + `footer-banner`. |
| M25 | Med | `robots.txt` disallows only balloon-match challenges; the other two games' challenge routes rely on page-level `noindex` instead — and combining both mechanisms means crawlers that obey the disallow never see the noindex. | `app/robots.ts:11` vs `app/games/{perfect-pour,memory-path}/challenge/[code]/page.tsx:15`. |
| M26 | Med | Hub is entirely a Client Component for two small reasons (Framer + `useSiteStats`). | `app/page.tsx:1`. |
| L10 | Low | Duplicated logic: `scoreEmoji` implemented twice and already diverging (`lib/share.ts:4-10` derives from `MAX_ROUND_SCORE`; `lib/challenge.ts:120-126` hardcodes thresholds). `RANK_COLORS` duplicated verbatim in two leaderboards. `DIFFICULTY_ACCENT` duplicates `DIFFICULTY_CONFIG` colors. | `lib/share.ts`, `lib/challenge.ts:18-22,120-126`; `Leaderboard.tsx:16` / `ChallengeLeaderboard.tsx:9`. **Must be deduped as part of R2** or the two share-text builders will format decimals differently. |
| L11 | Low | Balloon Match reimplements `SessionSummary` (145 near-duplicate lines) with its own share-text path. | `games/balloon-match/SessionComplete.tsx` vs `components/game/SessionSummary.tsx`. |
| L12 | Low | Dead exports and CSS: `NEON` and `ADSENSE_PUBLISHER_ID`/`AD_UNITS` (`lib/constants.ts:14-23,99-106`) have zero imports; `.stat-pill-row`, `.score-divider` unused; `.path-tile` sets `border` then redundantly re-sets `border-style`/`border-width`. Meanwhile ~58 raw hex colors are hand-typed across components. | `app/globals.css:273-277,481-483,658-662`. |
| L13 | Low | Redundant adjacent headings: `<h2>Balloon Match — Leaderboard</h2>` directly above the component's own `<h3>Leaderboard</h3>`. | `app/games/*/page.tsx:32-34` + `Leaderboard.tsx:93`. |
| L14 | Low | Copy nits: hub card vs page metadata describe each game differently (`lib/gameRegistry.ts:7-8` vs `app/games/balloon-match/page.tsx:8-9`); "personalised"/"non-personalised" British spelling in otherwise-American copy (`app/privacy/page.tsx:51,60`); "Copy invite link" on the *global* Daily Challenge is odd wording; "Hold the Tap to Pour" reads as a touch gesture, not a faucet (`PerfectPourGame.tsx:200`); hub promises "More Coming Soon" but renders no coming-soon cards; `/privacy` missing from `sitemap.xml`. | Various. |
| L15 | Low | PWA declares `black-translucent` status bar but sets no `viewportFit: 'cover'` and uses **zero** `env(safe-area-inset-*)` anywhere — the nav will sit under the notch/status bar in installed standalone mode on iPhone. | `app/layout.tsx:56-59,70-74`; grep for `safe-area` returns nothing repo-wide. |

---

## 6. Required changes — implementation plans

### 6.1 R1 · High-quality glass-filling audio

**Problem.** The current `water` loop (`lib/sounds.ts:241-328`) is three static layers — a brown-noise body through a 920Hz lowpass with a 6Hz LFO, a 2600Hz highpass "spray" at gain 0.045, and a `setTimeout`-scheduled gurgle of 2–4 downward-sweeping sines per 280–500ms batch. It's competent, but it is **identical at 5% full and 95% full**. The ear therefore hears "a tap running", never "a glass filling".

**The missing cue.** Pouring into an open vessel is a quarter-wave stopped pipe: the liquid surface is the closed end, the rim is the open end. `f ≈ c / (4·L)`, `c ≈ 343 m/s`. As the air column `L` shrinks from ~9cm to ~1.5cm, resonance rises **~300Hz → ~1800Hz**. That rising pitch *is* the sound people recognise as a glass filling. It is entirely absent today, as are the onset transient (the loop just fades in) and the settle tail (it just fades out).

**Implementation.**

1. **Parameter path (prerequisite).** Export `setWaterFill(percent: number)` from `lib/sounds.ts`. Call it from the existing 16ms pour tick at `games/perfect-pour/usePourGame.ts:256-266` — no new timers needed.
2. **New Layer — resonance sweep (the core fix).** Noise source → `BiquadFilter` `bandpass`, `Q ≈ 7–9`, gain **0.05–0.09** (mixed *under* the body so it colours rather than dominates).
   `f(fill) = 260 * (1800/260) ** (fill/100)` — log curve, matching both the physics and pitch perception.
   Drive with `filter.frequency.setTargetAtTime(f, ctx.currentTime, 0.05)` — 50ms smoothing: responsive, no zipper noise.
3. **Layer 1 tweak.** Ramp the body lowpass base from 950Hz → 700Hz as fill rises; a fuller glass sounds duller.
4. **Layer 3 tweak.** Scale gurgle base frequency by `0.7 + 0.6 × fill/100` so bubbles rise in pitch too, instead of contradicting the main cue with a fixed random range.
5. **New — splash onset.** At `startWater` t0: bandpass noise burst sweeping **1400 → 500Hz over 90ms**, `Q ≈ 1.2`, gain 0.28. Gives first contact an edge instead of a soft ramp.
6. **New — settle tail.** On `stop()`: three decaying droplet plinks at `t+0.04 / +0.16 / +0.34s`, gains `0.05 / 0.03 / 0.015`, frequency = `f(fillAtStop)` ± small detune, 0.12–0.18s each.
7. **Master bus.** Insert a `DynamicsCompressorNode` (threshold ≈ −6dB, ratio ≈ 4:1, fast attack) between `master` and `destination` — fixes L8 and gives headroom for the punchier new transients.
8. **Bundle the audio bugs:** H6 (unmute mid-pour) and M18 (gesture-context resume) — same file, same test pass.

**Live vs pre-rendered.** Hybrid. The resonance sweep **must** stay live — its curve depends on player-controlled pour duration, unknowable in advance. The body/gurgle layers are cheap (a few biquads + a few oscillators/sec); no reason to pre-render. The **fixed-duration one-shots** (splash onset, settle plinks, existing `splash`/`whoosh`) are good `OfflineAudioContext` candidates — render once into an in-memory `AudioBuffer`, cached exactly like the existing `noiseBuffer` (`lib/sounds.ts:32,89-103`). That buys richer processing per sound without per-call DSP cost, and ships **no binary assets**, so the zero-asset/offline property is fully preserved. (Verified: `public/` contains no audio files.)

**Also apply the same treatment to Balloon Match (H1)** — the inflate hold is the one mechanic in the app with no audio at all, and a rising-pitch air-hiss is the exact analogue of this technique.

### 6.2 R2 · Two-decimal scoring

**Approach.** Introduce two helpers in `utils/scoring.ts` — `round2(n)` and `formatScore(n)` (2dp, trimming a bare `.00`) — and route **every** accumulation and display site through them. Do not patch call sites individually; the current duplicate `scoreEmoji` (L10) is exactly how these things drift.

**Core**
- `utils/scoring.ts:10-12` — `calculateScore` currently `Math.round((accuracy - 50) / 5)` → `round2(...)`. (`calculateAccuracy` already returns 1dp, so 2dp falls out naturally: 87.3% → 7.46.)
- `utils/scoring.ts:4,16` — `MAX_ROUND_SCORE`/`MAX_SESSION_SCORE` stay whole; re-verify consumers.

**Server validation — this actively blocks decimals today**
- `app/api/scores/[gameId]/[board]/route.ts:81` — `Number.isInteger(s)` per-round check **must change** to a decimal-safe check (e.g. `typeof s === 'number' && s >= 0 && s <= max && Math.round(s*100) === s*100`).
- `:86` — `roundScores.reduce((a,b) => a+b, 0)` must be `round2()`-wrapped (float accumulation).
- `:91` — `!Number.isInteger(score)` total check, same fix.
- `lib/server/scoreStore.ts:83,92` — comparison and sort are float-safe as-is; add a tie-ordering test.

**Client accumulation (float drift)**
- `games/balloon-match/useBalloonGame.ts:206`, `games/perfect-pour/usePourGame.ts:216`, `games/memory-path/useMemoryPathGame.ts:239` — all do `total + score` per round. Round after each add, or (better) derive totals from `roundScores` at display time and never trust the running value.

**Display sites — all 15, none currently formats**
`components/game/ScoreCard.tsx:33,45` · `components/game/SessionSummary.tsx:43,86,117` · `components/challenge/ChallengeComplete.tsx:49,105,123` · `components/challenge/ChallengeLeaderboard.tsx:121,126` · `components/leaderboard/Leaderboard.tsx:66,72` · `games/balloon-match/SessionComplete.tsx:32,68,99` · `games/balloon-match/ResultScreen.tsx:126` · `games/perfect-pour/PourResultScreen.tsx:112` · `games/memory-path/PathResultScreen.tsx:176`.
Without `formatScore`, users will literally see `7.199999999999999`.

**Share text**
- `lib/share.ts:35` and `:5-10` (`scoreEmoji` thresholds need re-tuning for a continuous scale).
- `lib/challenge.ts:141,157`, and **`:120-126` — delete the duplicate `scoreEmoji` in the same change** (L10).

**Tests**
- `tests/scoring.test.ts:5-34` — all assertions expect integers; add 2dp fixtures incl. a rounding-boundary case.
- `tests/challenge.test.ts:119-142` — exact share strings with integer rounds; add decimal fixtures and assert no float noise.
- `tests/gameChallenges.test.ts`, `tests/memoryPath.test.ts` — grep for integer-score assumptions before implementing.

**Bundle with H3** (rating/score contradiction). Both are "recalibrate the scoring surface"; doing them separately means touching the same 15 display sites twice.

**Typography dependency:** M19 — Orbitron bold numerals already read as blocks at 18px. `0.00/10` in Orbitron will be worse. Switch numeric readouts to JetBrains Mono + `tabular-nums` **as part of this change**, not after.

### 6.3 R3 · Memory Path grid sizes → 9 / 12 / 16

1. **`games/memory-path/constants.ts:27-64`** — `medium.size` 16→12 (`:43`), `hard.size` 25→16 (`:55`); Easy already 9. Rebalance `pathLength`/`revealMs`/`memorizeMs`:

   | Difficulty | size | pathLength | revealMs | memorizeMs | Reasoning |
   |---|---|---|---|---|---|
   | Easy | 9 | 6 *(unchanged)* | 520 | 2400 | Already comfortable. |
   | Medium | 12 | **8** | **440** | **2700** | Tiles jump 19.4→25.9px, so precision stops being the limiter; a slightly longer path is affordable. |
   | Hard | 16 | **11** | **320** | **3200** | Tiles 12.4→19.4px. Total watch time ≈7.1s vs today's ≈6.9s, so round length is unchanged — difficulty shifts from *"can't hit the tile"* to *"have to actually remember it"*, which is the stated design intent (`constants.ts:3-6`). |

2. **`description` strings** (`:30,:42,:54`) — `'16×16 grid · Small tiles'` becomes Hard's territory, not Medium's. Needs new copy for both; **don't reuse "Tiny tiles"** for 16×16.

3. **`games/memory-path/PathGrid.tsx:38-46` — `gridMetrics()`. This is the trap.** Current tiers are `size <= 9` / `size <= 16` / `else`. With 9/12/16, **both new Medium (12) and new Hard (16) fall into the same `size <= 16` bucket** and would render with identical inset/radius/stroke/maxWidth — losing the chunky→thin visual escalation that signals difficulty. Re-cut to `<= 9` / `<= 12` / `else`.

4. **Sparkles.** Today `sparkles: false` lives in the `> 16` branch, i.e. only the 25×25 grid. New Hard is 16×16 (625 → 256 cells), so sparkles could be re-enabled for parity with Medium. **Product call — flagging, not deciding.**

5. **Tests.** Verified: `tests/memoryPath.test.ts:57-61` and `tests/gameChallenges.test.ts:41-66` derive everything from `PATH_DIFFICULTY` — **no hardcoded 9/16/25, so no test edits are required.** Worth *adding* an assertion pinning the new 9/12/16 trio so a future accidental edit is caught.

6. **⚠️ Shared challenge links will change meaning.** `games/memory-path/challenge.ts:19-25` reads `PATH_DIFFICULTY` **at call time**, and all three rounds draw sequentially off one seeded RNG stream (`lib/challenge.ts:60-63`). Changing sizes/lengths changes both the grid the draws land on *and* how many `rand()` calls the backtracking DFS consumes — which shifts the stream for every later round. So **every existing Memory Path challenge code, including today's daily, generates different paths after this ships**, while the leaderboard bucket (`gameId` + `board`) stays the same — pre- and post-change scores would be pooled as if comparable. See §8 for the decision I need from you.

7. **`HANDOFF.md:116-126`** — difficulty bullets and the "drops sparkles on the 25×25 board" line need updating.

**Honest limitation:** at 375px, new Hard tiles are **19.4px** — better than 12.4px (2.5× the tap area) but still under the WCAG 2.5.8 24px floor. Reclaiming the card's `px-4` gutters only reaches ~21.4px. Hitting 24px on Hard would require either a 14×14 grid or a full-bleed edge-to-edge grid on mobile. My recommendation: ship 9/12/16 as requested, and make the grid full-bleed on phones as a follow-up if you want Hard to clear the floor.

### 6.4 R4 · Screen-density & controls redesign (your design review)

Six directed changes from your annotated screenshots. The through-line is the same in all of them: **the UI explains itself more than it needs to, and spends vertical space doing it.** These are games a player learns in one round; the copy can go.

#### U1 — Mode cards are too large; drop the explanatory copy
*Screenshot 1.* `components/game/ModeSelector.tsx:20-42` — each card carries a `sub` line:
```
'Free play · 5 rounds · beat your own best'
'Same rounds worldwide today · shared board'
'Private code · compare scores head-to-head'
```
At 375px these wrap to two lines ("…head-to-**/**head"), which makes the three cards **unequal heights** and pushes the third card off screen.
**Change:** drop `sub` entirely; keep icon + label. Tighten `.mode-card` padding and the `gap-4` grid. Target: all three modes visible without scrolling at 375×667.
**Note:** the Daily Challenge `sub` is also the copy that makes the false "worldwide" promise in C1 — deleting it removes the claim, but **C1 must still be fixed**, since the behaviour is wrong regardless of whether it's advertised.

#### U2 — Difficulty cards are too large; drop descriptions and stat pills
*Screenshot 2.* `components/game/DifficultySelector.tsx:82-100` renders, per card: an accent bar, the label, a `description` ("No timer · Forgiving"), **and** a 2-column grid of stat pills (SPEED / TIME). Three cards stacked at 375px overflow the viewport, and the pills are 10px type (M7) at 3.19:1 contrast (M1).
**Change:** reduce to accent bar + label, optionally one short qualifier. Delete the `stats` array and the `description` render. `DifficultyOption.stats`/`description` then become dead — remove from the interface and from all three games' option builders (`BalloonGame.tsx:33-48`, plus the Perfect Pour and Memory Path equivalents), rather than leaving unused fields.
**Bonus:** this deletes the worst offenders for M7 (10px text) and part of M1 (contrast) for free.

#### U3 — Rework the Menu / score section and the score pattern
*Screenshot 3.* Two problems in one row (`games/balloon-match/BalloonGame.tsx:86-108` + `components/game/ScoreCard.tsx`):
- **The exit control** is a bare text button with **no padding at all** (M6, ~20px tall), and its label changes between `'Menu'` and `'Restart'` depending on mode — two different words for "leave this round".
- **The score pattern** packs three icon+label+value groups (`SCORE 3/10`, `TOTAL 3/50`, `ROUND 1/5`) into ~250px of remaining width. All three use the same 18px Orbitron bold treatment with a `/N` denominator at `white/30` (2.66:1, M1), so nothing is visually dominant and the zeros read as solid blocks (M19).
**Change:** give the exit control a real 44px target and one consistent label. Demote `TOTAL` and `ROUND` to a single quieter line (e.g. `Round 1/5 · 3/50`) and let the current round score be the one prominent number — or move the running total off the play screen entirely, since the session summary already reports it. Switch all numerics to JetBrains Mono with `tabular-nums`, which stops digits jittering as they change and is a prerequisite for U4 anyway.

#### U4 — Scores in decimals, out of 10, two places
Already specified in full as **R2 (§6.2)**. Your screenshots make the typography dependency concrete: `6/10` in Orbitron bold already reads as `6/1▨`; `6.25/10` will be worse. **M19 is part of this change, not a follow-up.**

#### U5 — Fix the clipped Challenge button
Logged as **H13** with full derivation. Summary: `flex-1` + `whitespace-nowrap` + a 141px slot for a ~170px label.

#### U6 — Fix stat-card text alignment
Logged as **M27**. Caused by `justify-content: center` on `.stat-card` combined with a wrapping value.

#### U7 — Remove the accuracy / difference section
*Screenshots 4 and 5.* `games/balloon-match/ResultScreen.tsx:104-131` renders a 3-up grid: ACCURACY, DIFFERENCE, ROUND SCORE. Mirrored in `games/perfect-pour/PourResultScreen.tsx` and `games/memory-path/PathResultScreen.tsx`.
**Change:** remove the ACCURACY and DIFFERENCE cards. The two balloons/glasses shown side by side already communicate "how far off you were" more legibly than "35% too small" does.
**My assumption, flag if wrong:** I'd also drop the ROUND SCORE card and promote the score into the rating headline (big number directly under "Try Again"), since the top bar already shows `SCORE 3/10` — three copies of the same number on one screen. If you'd rather keep the card row with just the score, say so and I'll keep it.
**Knock-on cleanups:** `getSizeDiffLabel` (`utils/accuracy.ts:28-34`) and `getPourDiffLabel` (`games/perfect-pour/constants.ts:86-91`) lose their only render sites — delete them, which also retires the dead `sizeDiffPercent` field (L7). And **H4** (the "Try Again"/"too little" contradiction) disappears with the section, so H4 collapses into this change.

#### U8 — Add fine-adjust controllers for size / water level
*Your note: "controllers to adjust sizes, or water level content".* Today the only input is press-and-hold — you get one continuous attempt with no way to nudge. Two things follow from adding explicit controls:

- **Design:** after the hold releases (or instead of holding), show a `−` / `+` pair that steps the value, plus a value readout. Step size should scale with difficulty (Easy ±1, Hard ±0.25 units) so it aids precision without trivialising the game. Confirm with the existing primary action rather than auto-locking, so a nudge is always reversible.
- **This is also the C4 keyboard fix.** Real `<button>` elements with `aria-label`s make Balloon Match and Perfect Pour keyboard- and switch-playable for free, which is otherwise a bespoke piece of work. Building U8 and C4 together is meaningfully cheaper than building either alone.
- **Fairness caveat worth deciding on:** on shared leaderboards, a player who can nudge to an exact value has an advantage over one who committed to a single hold. Options: (a) allow it everywhere and accept that the game is now about precision rather than nerve; (b) allow in Solo, disable in Daily/Friend challenges; (c) allow everywhere but cap the number of adjustments. I'd recommend **(a)** — it matches the "calm, satisfying precision" positioning, and a split-rule game is harder to explain than it's worth. Your call — see §9.
- **Applies to:** Balloon Match (size) and Perfect Pour (water level). Memory Path has no continuous value, so it still needs its own keyboard answer (§9, decision 2).

### 6.5 Cross-cutting note on the required changes

R1 is self-contained. The other three interact:

- **R2 and R3 both invalidate shared challenge state** — R2 changes what a score means, R3 changes what paths a code generates. Shipping them in one deploy makes that a single clean break rather than two. Recommended.
- **R4 must partly precede R2.** U7 deletes the result-screen stat row and U3 rebuilds the top bar; R2 rewrites every score display site. Doing R2 first means formatting components that are about to be deleted or restructured.
- **R4/U8 and C4 are the same piece of work.** Fine-adjust controllers built as real `<button>`s with `aria-label`s deliver keyboard play for Balloon Match and Perfect Pour for free. Building them separately is meaningfully more expensive.
- **R4 absorbs three logged findings outright** — H4 (pour copy contradiction) and M27 (stat-card alignment) disappear with the stat row; L7 (dead `sizeDiffPercent`) retires with `getSizeDiffLabel`.

---

## 7. Execution order

Waves are ordered so nothing is done twice. Within a wave, items are independent and can run in parallel across subagents.

**Wave 0 — unblock the release gate** *(fast, do first)*
- H10 lint failures · H8 metadata/OG · M25 robots · L14 sitemap/copy nits
- Establish the baseline: `tsc` + `lint` + `test` all green before anything else changes.

**Wave 1 — Critical correctness & safety**
- C1 UTC daily code (+ test)
- C2 SSR visibility + SW cache version/`response.ok`/`CORE_ASSETS` (also covers H9)
- C3 `<MotionConfig reducedMotion="user">` + confetti gate
- H12 `dt` clamp, deadline-based countdowns, `visibilitychange`
- H11 `pointerId` tracking in `usePressAndHold` + `PathGrid`

**Wave 2 — The four required changes** *(largest wave; R2, R3 and R4 land in the same deploy)*
- **R4 screen-density & controls** — U1 mode cards · U2 difficulty cards · U3 top bar/score pattern · U7 remove stat row *(absorbs **H4** and **M27**, retires **L7**, and knocks out the worst of **M7**)* · U8 fine-adjust controllers **built together with C4 keyboard support**
- **R2 decimal scoring** — bundled with **H3** (rating/score calibration), **M19** (numeric typography) and **L10** (`scoreEmoji` dedupe)
- **R3 grid 9/12/16** — bundled with **M17** (re-render cost resolves itself) and the `gridMetrics` tier re-cut
- **R1 glass-fill audio** — bundled with **H5, H6, M18, L8**
- **H1 Balloon Match audio** — reuses the R1 synthesis work

> **Sequencing note:** R4/U7 deletes the result-screen stat row, and R2 rewrites every score display site. Do **U7 before R2** so R2 doesn't format cards that are about to be deleted. Likewise U3 before R2, since the top bar is being rebuilt anyway. R4 is therefore the first item in this wave, not a parallel one.

**Wave 3 — High-visibility UX defects**
- H13 clipped Challenge button · H14 white ad slab · M28 ads during gameplay
- H2 balloon comparison clamp · H7 `<h1>` + on-screen game name · M29 high-score badge gating
- M8 fade/interactive timing · M9 conditional `touch-action` · M20 date wrap · M21 nav redundancy

**Wave 4 — Accessibility & responsive polish**
- M1 contrast sweep · M2 `aria-live` · M3 skip link · M4 route focus · M5 nav aria-label
- M6 touch targets · M7 type scale · M10/M11 fold heights · L15 safe-area + `viewportFit` · L1 scroll-behavior

**Wave 5 — Robustness, backend & cleanup**
- M12 pure updaters · M13 `NaN`/quota guards · M14 file-store lock · M15 rate limiting · M16 nickname filtering
- M22 gutters · M23 ad env warning · M24 mobile ad format · M26 server component split
- L2–L7, L11–L13 cleanup

**Wave 6 — Full regression pass** (§8 checklist), then update `HANDOFF.md`.

---

## 8. Testing checklist

Run in full after Wave 2 and again after Wave 5.

**Automated (gate — must all pass)**
- [ ] `npx tsc --noEmit` clean
- [ ] `npm run lint` clean *(currently failing — H10)*
- [ ] `npm test` green, with **new** tests for: UTC daily code across timezones; `calculateScore` 2dp incl. rounding boundaries; `round2`/`formatScore`; decimal share text with no float noise; API rejects malformed decimals but accepts valid 2dp; `PATH_DIFFICULTY` pinned to 9/12/16
- [ ] `npm run build` succeeds; note bundle deltas

**Per game × {Easy, Medium, Hard} × {Solo, Daily, Friend}**
- [ ] Full 5-round solo session start → finish, score/total/round correct at every step
- [ ] 3-round challenge start → finish → leaderboard submit → entry appears
- [ ] Scores render with 2dp everywhere and never show float noise
- [ ] Rating label never contradicts the score beside it
- [ ] Restart / Menu / Back mid-round leaves no orphaned timers or audio
- [ ] Replay after session complete resets cleanly

**Screen density & controls (R4)**
- [ ] All three mode cards fully visible without scrolling at 375×667, equal heights
- [ ] All three difficulty cards fully visible without scrolling at 375×667
- [ ] **Every action button renders its full label at 320px** — check `Next Round`, `Next Challenge`, `Final Results`, `Menu`, `Submit`, `Clear` (H13)
- [ ] Result screen shows no accuracy/difference cards; score appears exactly once
- [ ] Top bar: exit control ≥44px, one consistent label, numerics in tabular mono
- [ ] Fine-adjust `−`/`+` controls work by touch, mouse **and keyboard**; step size scales with difficulty; adjustment is reversible before confirming
- [ ] Ad container reads as a dark empty panel when unfilled — no white block (H14); no ad adjacent to the primary action during play (M28)
- [ ] "New High Score" never appears on a "Try Again" result (M29)

**Responsive** (320 · 375 · 414 · 768 · 1024 · 1280)
- [ ] No horizontal scroll on any page or phase
- [ ] No text clipped or wrapped mid-word in any button, card or heading
- [ ] Primary action reachable without scrolling at 375×667 (worst case: Perfect Pour Easy, Memory Path Hard)
- [ ] Balloon comparison shows both balloons undistorted at max sizes
- [ ] Memory Path grid square and traceable at every difficulty; measure actual tile px
- [ ] Nothing collides with the fixed nav; iOS safe-area respected in installed PWA

**Interaction & edge cases**
- [ ] Release pointer outside the element → hold ends correctly
- [ ] Second finger mid-hold does not end the round or corrupt a trace
- [ ] Background the tab mid-round → no fill/size jump on return, no free time
- [ ] Fast double-taps on Next/Replay don't double-advance
- [ ] Offline: game loads from SW cache; score submit fails gracefully with visible feedback
- [ ] `localStorage` disabled / corrupted value → no `NaN` in UI, no crash

**Audio**
- [ ] Pour sound pitch rises audibly and continuously as the glass fills
- [ ] Splash onset and settle tail are audible and feel satisfying
- [ ] Mute mid-pour then unmute → sound resumes in the same pour
- [ ] No clicks/pops; no clipping when celebrate + splash overlap
- [ ] iOS Safari: audio survives backgrounding and resumes on next touch
- [ ] Balloon Match has audio parity with the other two games

**Accessibility**
- [ ] All three games completable by keyboard alone *(or the limitation explicitly accepted — see below)*
- [ ] OS "reduce motion" on → no confetti, no infinite pulses, no springs
- [ ] Every interactive element has an accessible name; tab order sane; focus visible
- [ ] Contrast: no informational text below 4.5:1
- [ ] Screen reader announces round results
- [ ] 200% browser zoom doesn't break layout

**Pre-deploy**
- [ ] `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID` set on Vercel *(currently absent locally — M23)*
- [ ] `UPSTASH_REDIS_REST_*` set *(else the racy file store is live — M14)*
- [ ] `CACHE_VERSION` bumped
- [ ] Shared challenge link → rich preview card with image

---

## 9. Decisions I need from you

Ordered by how much they change the work. The first three block Wave 2; the rest I can proceed on with the stated default if you'd rather not decide now.

1. **Fine-adjust controllers and leaderboard fairness (U8).** Letting players nudge to an exact value changes the game from nerve to precision. **(a)** allow everywhere — *my recommendation*, matches the "calm, satisfying precision" positioning and is one rule to explain; **(b)** Solo only, disabled in Daily/Friend; **(c)** allow everywhere but cap adjustments per round.
2. **Memory Path challenge codes will break (R3, item 6).** Existing shared links and today's daily will generate different paths, and old/new scores would pool in the same leaderboard bucket. **(a)** accept a one-time reset — *my recommendation pre-launch*; **(b)** version the seed salt (`makeChallengeRand(code, 'memory-path:v2')`) so old and new can't be confused, at the cost of old links no longer reproducing their original paths.
3. **Memory Path keyboard support (C4).** U8 solves this for Balloon Match and Perfect Pour as a side effect, but drag-to-trace has no continuous value to step, so it needs its own answer. Ship a full keyboard mode (arrow cursor + Space to lay a cell), ship a reduced one, or launch with the gap documented?
4. **Does the round score stay on the result screen (U7)?** I've assumed the whole ACCURACY / DIFFERENCE / ROUND SCORE row goes and the score moves into the rating headline, since the top bar already shows it. Say so if you want the score card kept.
5. **Hard grid still misses the 24px touch floor (§6.3).** Ship 9/12/16 as requested at 19.4px — *default* — or also make the grid full-bleed on phones to reach ~21–24px?
6. **Sparkles on the new 16×16 Hard** — re-enable (perf now permits) or keep off as a difficulty signal? *Default: re-enable, for parity with Medium.*
7. **Nickname moderation (M16)** — with AdSense live, a basic blocklist, or accept the risk at launch volume? *Default: minimal blocklist.*

## 10. Audit method caveat

Live browser testing ran with the preview pane backgrounded, so the animation frame loop was suspended. That made multi-step interactive flows (results screens, session completion) unreachable in-browser, because `AnimatePresence mode="wait"` won't hand off between phases without frames. Layout, DOM measurement, metadata, SSR HTML and console/network checks were all unaffected and are reported as verified. Findings marked **[computed]** are derived from measured CSS/SVG values in source with the derivation shown — they are high-confidence but were not visually confirmed, and should be spot-checked on a real device during Wave 6.

Usefully, that constraint surfaced C2: with no frames, the page stays permanently blank — which is exactly what a user sees if the JS fails.
