# QA Issues — tinyarcadium.com

Status after the `fix/qa-seo-content-polish` branch. Ads were explicitly out of
scope for this pass (AdSense approval still pending).

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Empty ad containers visible | Critical | **Deferred** — ads out of scope |
| 2 | Missing About / Terms page | Critical | Fixed |
| 3 | Low original content | Critical | Improved |
| 4 | Branding vs. domain mismatch | Critical | Fixed |
| 5 | Default Next.js 404 | High | Fixed |
| 6 | Leaderboard defaults to empty tab | High | Fixed |
| 7 | Sound toggle inconsistency | High | **Won't fix as specced** — see below |
| 8 | Empty space below leaderboard | High | **Deferred** — caused by #1 |
| 9 | No "How to Play" instructions | Medium | Fixed |
| 10 | Contact link is thin | Medium | Improved |
| 11 | Mode cards lack descriptions | Medium | Fixed |
| 12 | Generic homepage SEO copy | Medium | Fixed |
| 13 | No loading / error boundary | Medium | Fixed |
| 14 | Game card links unlabelled | Low | Fixed |
| 15 | Privacy missing cookies/retention | Low | Fixed |
| 16 | No favicon | Low | **Not an issue** — icons exist |
| 17 | OG image may not exist | Low | **Not an issue** — `og.png` exists |

---

## Fixed

**2. About & Terms pages** — added `/about` and `/terms`, styled as siblings of
the privacy page, linked from the footer and listed in the sitemap. Content is
factual only: no invented founder, company, location, or history. About pulls
game copy from `GAME_REGISTRY` so it can't drift; Terms describes the nickname
filter that `lib/moderation.ts` actually implements.

**3. Low original content** — each game page now carries a "How to Play"
section of real prose, plus longer per-game descriptions. These pages were
previously almost pure canvas with no indexable text.

**4. Branding** — rebranded "Mini Games Hub" → **Mettle** across nav,
hero, footer, manifest, service-worker cache key and all metadata, so brand
matches the domain.

**5. Custom 404** — on-brand, `noindex`, its own title, and a real `<Link>`
(not a JS button) so it works without hydration and supports middle-click.

**6. Leaderboard default tab** — if today's board is empty on first load, the
hook probes All Time once and switches to it when it has scores. Guarded so it
fires at most once per mount and never overrides a manual tab click.

**9. / 11. Game guidance** — shared `HowToPlay` component (native `<details>`,
zero JS) on all three game pages; mode cards now describe what each mode does.
Copy was written against each game's hook and constants, not paraphrased.

**12. SEO** — keyword-rich titles/descriptions/keywords, `WebSite` +
`Organization` JSON-LD site-wide, `VideoGame` JSON-LD per game. Meta
descriptions deliberately kept to 148–150 chars so search results don't
truncate them; the longer copy feeds structured data instead.

**13. Loading / error** — added `app/loading.tsx` and `app/error.tsx`.

**14. Accessibility** — game card links now carry `aria-label="Play <game>"`.
The coming-soon variant is intentionally left unlabelled so it reads its own
content.

**15. Privacy** — added "Cookies & local storage" and "Data retention",
written against the real keys (`mgh_player_id`, `mgh_player_name`,
`mgh_muted`, `mgh_balloon_best10`, `mgh_best_session_*`). No `document.cookie`
usage exists anywhere. Corrected a drafting error that claimed local data
"never touches our servers" — the player ID *is* sent with a score submission
and stored on the entry.

---

## Not fixed, and why

**1. / 8. Empty ad containers.** Out of scope this pass. For later: AdSense is
live in the deployed build (`ca-pub-6754198036840389`) but every slot returns
`data-ad-status="unfilled"`, leaving visible dead boxes. The fix is to observe
`data-ad-status` and collapse the container to zero height when unfilled.
Issue 8 is the same root cause.

**7. Sound toggle inconsistency.** The original diagnosis was wrong. Perfect
Pour and Memory Path use `useSound` extensively; **Balloon Match has no audio
implemented at all** — no `useSound`, no `playSound`, anywhere in its files.
The toggle isn't missing by oversight, there is nothing for it to control.
Adding one would be a decorative no-op. Real options: add genuine sound
effects to Balloon Match (feature work), or accept the difference.

**16. / 17.** Both were false alarms. `public/og.png` (1200×630) and the full
icon set under `public/icons/` already exist, and `app/layout.tsx` declares
them via the metadata `icons` field.

---

## Known pre-existing problem (not introduced here)

**`tests/scoreStore.test.ts` is flaky.** On a clean checkout of `main`,
`npm test` gives varying results across runs (1–2 failures out of 126).
Failure modes — an entry vanishing entirely, and a total of 21 where 20 was
expected — suggest a genuine read-modify-write race in
`lib/server/scoreStore.ts` rather than mere test flake. That would affect real
leaderboards under concurrent submissions. Tracked separately.

## AdSense readiness

Addressed: About + Terms pages, richer per-page content, brand/domain
consistency, cookie and retention disclosure, working 404.

Still open before applying:
1. Collapse unfilled ad units (#1) so reviewers don't see empty boxes.
2. Consider more content depth — three games is still thin. More games, or
   guides/blog content, would strengthen the application.
