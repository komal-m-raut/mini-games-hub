# Execution Plan — Fix Issues

Run these as Sonnet subagents. Each task is independent unless noted.

## Phase 1: AdSense Blockers (run in parallel)

### Agent 1: Fix Empty Ad Containers
- Edit `components/ads/AdBanner.tsx` — add a `useEffect` with a `MutationObserver` on the `<ins>` element that watches for the `data-ad-status` attribute. When it's `"unfilled"`, set the parent container's height to 0 and overflow to hidden. When it's `"filled"`, restore normal dimensions.
- Also wrap the production `<ins>` in a container div that starts collapsed and only expands when the ad fills.
- Test: the footer and between-games ad areas should show no empty whitespace when ads aren't serving.

### Agent 2: Add About Page
- Create `app/about/page.tsx` with metadata.
- Content: site name, what it offers (free browser mini-games), who it's for, that it's ad-supported, and contact info.
- Match the existing privacy page styling (max-w-2xl, same heading fonts, same back link pattern).
- Add a link to `/about` in the Footer component (`components/layout/Footer.tsx`) next to Privacy Policy.
- Add `/about` to the sitemap in `app/sitemap.ts`.

### Agent 3: Add Terms of Service Page
- Create `app/terms/page.tsx` with metadata.
- Content: basic terms covering usage of the free service, user-generated content (nicknames on leaderboard), ads, limitation of liability, and a link to the privacy policy.
- Same styling as the privacy page.
- Add a link to `/terms` in the Footer next to Privacy Policy.
- Add `/terms` to the sitemap.

### Agent 4: Fix Branding — Rename to "Tiny Arcadium"
- Update `lib/constants.ts`: change `SITE_NAME` from "Mini Games Hub" to "Tiny Arcadium".
- Update `app/layout.tsx`: change the metadata title default, description, OG siteName, and keywords to use "Tiny Arcadium".
- Update `components/layout/Navigation.tsx`: change the logo text from "Mini" + "Games Hub" to "Tiny" + "Arcadium".
- Update `components/layout/Footer.tsx`: change the tagline text.
- Update `app/page.tsx`: change the hero H1 text and description.
- Update the privacy page references to "Mini Games Hub" → "Tiny Arcadium".
- Search for any remaining "Mini Games Hub" strings across the codebase and update them.

## Phase 2: High Priority UX (run in parallel)

### Agent 5: Custom 404 Page
- Create `app/not-found.tsx`.
- Design: centered layout with a playful message (e.g., "Game Over — Page Not Found"), the site's neon styling, and a "Back to Games" NeonButton linking to `/`.
- Use the existing glass-card styling and font-display classes.

### Agent 6: Leaderboard Empty State Improvement
- Edit `components/leaderboard/Leaderboard.tsx` — when "Today's Challenge" tab has no scores, auto-select the "All Time" tab instead. If both are empty, show a more inviting empty state with a play button CTA.

### Agent 7: Sound Toggle Consistency
- Check which games show the `SoundToggle` component and where. Ensure all 3 games render it in the same position (below the mode selector, above the leaderboard). If Balloon Match is missing it, add it.

## Phase 3: Medium Priority Polish (run in parallel)

### Agent 8: Add "How to Play" to Game Pages
- For each game page (`app/games/*/page.tsx`), add a collapsible "How to Play" section between the game component and the leaderboard.
- Use a `<details>` element with the glass-card styling. Keep instructions to 2-3 sentences per game.
- Balloon Match: "Watch the balloon inflate, memorize its size, then press and hold to recreate it. The closer your balloon matches, the higher your score."
- Perfect Pour: "Watch the glass fill to a target level, then pour it back from memory. Match the fill level as closely as possible."
- Memory Path: "Watch a path light up on the grid, then trace it back from memory. Get every cell right for a perfect score."

### Agent 9: Mode Selector Descriptions
- Edit `components/game/ModeSelector.tsx` — add a `description` field to each card.
- Solo: "Practice at your own pace"
- Daily Challenge: "Same puzzle for everyone — compete today"
- Challenge a Friend: "Send a link, compare scores"

### Agent 10: Enhance Privacy Policy
- Edit `app/privacy/page.tsx` — add a "Cookies & Local Storage" section explaining the player ID in localStorage and Google ad cookies.
- Add a "Data Retention" section (scores kept indefinitely, localStorage cleared by the user).

### Agent 11: Loading and Error Pages
- Create `app/loading.tsx` with a simple centered spinner or pulsing logo using the site's brand colors.
- Create `app/error.tsx` (client component) with a styled error message and "Try Again" button that calls `reset()`.

## Phase 4: Low Priority (run if time permits)

### Agent 12: Accessibility — Game Card Labels
- Edit `app/page.tsx` — add `aria-label={`Play ${game.title}`}` to each game card link.

### Agent 13: Verify OG Image and Favicon
- Check if `public/og.png` and `public/favicon.ico` exist. If not, create simple branded versions. The OG image should be 1200×630 with the site name and tagline.

## Notes
- All agents should follow the existing code style: Tailwind classes, font-display/font-mono conventions, glass-card patterns.
- Read the `AGENTS.md` file first — this project uses a custom Next.js version with possible breaking changes. Check `node_modules/next/dist/docs/` before writing any Next.js-specific code.
- Do not add the Co-Authored-By trailer to commits.
- Test changes by running the dev server after edits.
