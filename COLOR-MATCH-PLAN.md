# Color Match — dialed.gg alignment plan

Plan only. Nothing in this document has been implemented.

Two requests drive it:

1. Show scores to two decimal places, the same way the other games do.
2. Take dialed.gg's colour game as the reference and follow a similar pattern.

---

## 1. Reference: what dialed.gg actually does

Observed directly at <https://dialed.gg> (the `color` game), August 2026. Labels
below are verbatim from the live DOM.

### Screen flow

Their React tree names the screens, which maps the whole loop:

```
GameShell
├── IntroScreen ──────── "Solo or multiplayer?"
├── MultiChooseScreen ── "Host a live round" | "Challenge link"
│   ├── MultiSetupScreen ── difficulty + rounds + initials
│   ├── MultiLobbyScreen
│   └── MultiResultScreen
├── ChallengeIntroScreen / ChallengeSetupScreen / ChallengeResultScreen
├── DailyIntroScreen ─── "Play the daily"  →  DailyResultsScreen (+ ScoreClimb)
├── CountdownScreen ──── "Seconds to remember"
├── RoundResultScreen ── per-round result  (+ ColorFadeOverlay, RoundResult)
├── TotalScreen ─────── session total (+ ResultsPlayerCard, InitialsCtaRow)
└── LeaderboardScreen
```

Support pieces: `GameNav`, `ColorDailyRingButton` (rainbow-ringed calendar
button), `RainbowLoader`, `MuteToggle`, `DarkModeToggle`, `PreGameAdScreen`.

### Scoring

- Totals render as **`0.00` / `42.40`** against a **`/50`** suffix — always two
  decimals, never trimmed.
- 5 rounds × 10 points = 50. **Identical to this repo's scale.**
- Round counter reads **`1 / 5`**.

### Copy (verbatim)

| Context | Text |
|---|---|
| Intro | "Humans can't reliably recall colors. This is a simple game to see how good (or bad) you are at it." |
| Intro | "We'll show you five colors, then you'll try and recreate them." |
| Intro | "Solo or multiplayer?" |
| Observe phase | "Seconds to remember" |
| Daily | "Five colors. Same for everyone on Earth. You get one shot. No pressure." |
| Multiplayer | "Same five colors, closest match wins." |
| Live game | "Same colors. Shared timer. Go." |
| Challenge link | "Everyone plays whenever" |
| CTA | "Post score & challenge a friend" |
| CTA | "Create and copy game link" |
| Anti-cheat | "This score shouldn't exist. We're investigating." |

### Structure and feel

- **One card, centred.** A single large rounded panel on an otherwise empty
  page. No page-level chrome competing with it.
- **Huge lowercase display type** for the screen's name (`color`, `set`,
  `daily`, `multiplayer`, `live results`), set in the card's top corner.
- **Round icon buttons** along the card's bottom edge, not a stack of full-width
  bars.
- **Flat black/white surfaces.** No glow, no gradient fills, no neon.
- **Light and dark mode**, toggled in the nav.
- **Difficulty: Easy / Hard / Brutal**, with an explicit
  "What do the difficulty modes mean?" explainer button.
- **Round count is a player choice**: 1 / 3 / 5 / Custom.
- **Identity is 3-letter initials** (`InitialsInput`), entered at the point of
  posting a score — not a profile, not a login.
- No `<input type="range">` anywhere: their picker is a custom pointer-driven
  control, not native sliders.

---

## 2. Where Color Match stands today

| Area | dialed.gg | Color Match now | Gap |
|---|---|---|---|
| Score decimals | always `0.00` | `formatScore` (2dp, bare `.00` trimmed) | See §3.1 — likely already correct |
| Rounds per session | 1 / 3 / 5 / Custom | fixed 5 solo, 3 challenge | Medium |
| Difficulty names | Easy / Hard / Brutal | Easy / Medium / Hard | Cosmetic |
| Difficulty explainer | dedicated button | one-line qualifier on each card | Small |
| Observe label | "Seconds to remember" | "Observe" + ring timer | Cosmetic |
| Round counter | `1 / 5` | `Round 1/5 · 0/50` | Fine as-is |
| Identity | 3-letter initials | nickname via `lib/player.ts` | Deliberate divergence |
| Daily / friend challenge | yes | yes (`lib/challenge.ts`) | Already aligned |
| Live multiplayer | yes (shared timer) | no | Out of scope — needs a server |
| Layout | one card, huge lowercase title | one card, sentence-case title | Small |
| Light mode | yes | dark only, app-wide | Out of scope |
| Picker | custom pointer control | native RGB sliders | See §3.4 |

---

## 3. Work items

### 3.1 Scores to two decimals — **verify first, likely no code change**

Every score Color Match renders already goes through `formatScore` from
[`utils/scoring.ts`](utils/scoring.ts): the round score in
`components/game/ScoreCard.tsx`, the result score in
`games/color-match/components/ColorResultScreen.tsx`, and the session totals in
`components/game/SessionSummary.tsx` and `components/leaderboard/Leaderboard.tsx`.
`formatScore` formats to 2dp and strips only a bare `.00`, so `7.46` renders
`7.46` and `8` renders `8` — the same in all five games.

The `8.4` in the mock screenshot from the previous session came from a
hand-written static HTML preview, not from the app. **Confirm in the running
game before changing anything.**

Two possible readings, and they need a decision:

- **(a) Match the other games — recommended.** Nothing to change; add a
  regression test in `tests/colorMatch.test.ts` asserting Color Match round
  scores round-trip through `formatScore` at 2dp.
- **(b) Match dialed literally — always show `8.00`.** One line in
  `formatScore` (drop the `.replace(/\.00$/, '')`). This changes **every game
  and the leaderboards**, so it is a hub-wide decision, not a Color Match one.

**Files:** `utils/scoring.ts` (only under (b)), `tests/colorMatch.test.ts`.

### 3.2 Session shape: let the player pick the round count

Add a 1 / 3 / 5 selector to the solo menu, defaulting to 5.

- `games/color-match/useColorMatchGame.ts` — accept `roundCount`, replace the
  `NORMAL_ROUND_COUNT` constant in state setup.
- `games/color-match/ColorMatchGame.tsx` — round-count pills next to the
  difficulty cards.
- `components/game/SessionSummary.tsx` already derives its max from
  `roundScores.length`; **verify** rather than assume.
- **Leaderboard impact:** `app/api/scores/[gameId]/[board]/route.ts` validates
  round-based games as exactly 3 rounds. A 1- or 5-round solo session must
  **not** post to a challenge board, or the rules need a per-count variant.
  Simplest safe scope: round choice applies to solo only; challenges stay 3.

**Acceptance:** picking 3 gives three colours and a `/30` total; challenge mode
is untouched; no new leaderboard shape reaches the API.

### 3.3 Card layout and copy pass

Bring the screen closer to the reference's calm single-card look.

- `games/color-match/ColorMatchGame.tsx`
  - Screen name as a large lowercase display word in the card's top-left
    (`memorise`, `recreate`, `result`), replacing the centred sentence-case
    heading.
  - Round counter as a plain `1 / 5` in the opposite corner.
- Observe phase: label the timer **"Seconds to remember"** instead of "Observe".
- `app/games/color-match/page.tsx` — intro copy in the reference's plain,
  slightly self-deprecating register (write our own; do **not** copy their
  sentences verbatim into shipped UI).
- Keep `glass-card`, tokens, and `DifficultySelector` — this is a copy and
  hierarchy change, not a new design system.

**Acceptance:** no new colours or shadows introduced; `DESIGN-SYSTEM.md` rules
still hold.

### 3.4 Picker: keep native sliders — recommended

dialed uses a custom pointer control. Native `<input type="range">` gives
touch, pointer and full keyboard support for free, and the sliders were only
just cleaned up. Recommend **keeping sliders** and taking two smaller ideas
from the reference instead:

- A hue-first arrangement is easier to aim with than three RGB channels.
  Optional follow-up: an **HSL mode toggle** (`H`/`S`/`L` sliders backed by the
  existing `hslToRgb`), defaulting to RGB.
- `ColorFadeOverlay` — a full-card colour cross-fade between observe and
  recreate, which is one transition, not a glow.

**Decision needed:** leave the picker alone (recommended), add the HSL toggle,
or rebuild as a 2D field. Only the third is a large piece of work.

### 3.5 Difficulty naming and explainer

- Rename Medium → Hard and Hard → **Brutal**? This diverges from every other
  game in the hub, which all use Easy/Medium/Hard, and from
  `CHALLENGE_DIFFICULTIES` in `lib/challenge.ts` — **recommend not renaming.**
- Do add the explainer: a small "What do the difficulty modes mean?" disclosure
  above the difficulty cards spelling out observe time and tolerance per level,
  sourced from `COLOR_DIFFICULTY` so it can't drift.

**Files:** `games/color-match/ColorMatchGame.tsx`, `games/color-match/constants.ts`.

### 3.6 Explicitly out of scope

- **Live multiplayer with a shared timer** — needs realtime server state;
  the existing seeded challenge links already cover "play whenever".
- **Light mode** — an app-wide theming project, not a Color Match change.
- **Initials instead of nicknames** — would fork identity handling in
  `lib/player.ts` away from the other four games.
- **Pre-game ads** — ads are still deferred hub-wide (see `issues.md`).

---

## 4. Suggested order

1. §3.1 verify score formatting (30 min, possibly zero code)
2. §3.5 difficulty explainer (small, self-contained)
3. §3.3 layout and copy pass
4. §3.2 round-count selector (touches API validation — do it deliberately)
5. §3.4 optional HSL toggle, only if wanted

---

## 5. Test plan

- `tests/colorMatch.test.ts`: score formatting at 2dp; round-count variants
  produce the right totals; existing colour-maths and seeded-challenge tests
  keep passing.
- `tests/scoresApi.test.ts`: a non-3-round session must not be accepted on a
  challenge board.
- Manual: play a full solo session at each round count and one challenge link.

---

## 6. Open questions

1. Score display — option (a) or (b) in §3.1?
2. Round-count selector: solo only, or challenges too (needs API rules)?
3. Picker: keep RGB sliders, add HSL toggle, or rebuild as a 2D field?
4. Difficulty names: keep Easy/Medium/Hard, or adopt Easy/Hard/Brutal and
   diverge from the rest of the hub?
