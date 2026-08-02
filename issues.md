# QA Issues — tinyarcadium.com

## Critical (blocks AdSense / breaks functionality)

### 1. Empty Ad Containers Visible in Production
AdSense is configured (`ca-pub-6754198036840389`) and the script loads, but all ad slots return `data-ad-status="unfilled"`. This renders visible empty containers (e.g., 728×90px footer ad) with blank space. Users see dead whitespace; AdSense reviewers will flag "no content in ad units."
- **Files:** `components/ads/AdBanner.tsx`, `components/ads/AdConfig.ts`, `components/layout/Footer.tsx`
- **Fix:** Hide ad containers when unfilled. Use an `IntersectionObserver` or `MutationObserver` to detect `data-ad-status="unfilled"` and collapse the container to `height: 0`.

### 2. Missing About / Terms of Service Page
Google AdSense requires an About page and clear site identity. The site currently only has a Privacy Policy. No Terms of Service or About page exists. AdSense reviewers will reject for "insufficient identifying information."
- **Fix:** Add an `/about` page explaining who runs the site, what it offers, and a contact method. Optionally add `/terms` for completeness.

### 3. Low Original Content — Only 3 Games
AdSense reviewers look for substantial, original content. The site has only 3 games with very short descriptions on the homepage. Game pages themselves are mostly interactive (not indexable text). This may trigger "low value content" or "not enough content" rejection.
- **Fix:** Add more descriptive text on game pages — "How to play" sections, game mechanics explanations, tips. Consider adding a blog or game guides section.

### 4. Branding Mismatch: Domain vs. Site Name
The domain is `tinyarcadium.com` but the site is branded "Mini Games Hub" everywhere — title, nav, footer, OG tags. This inconsistency will confuse AdSense reviewers and hurts SEO.
- **Fix:** Rebrand to "Tiny Arcadium" throughout, or redirect/alias to match. Pick one identity and make domain and branding consistent.

## High (significant UX / functional issues)

### 5. Default Next.js 404 Page
Navigating to a non-existent URL (e.g., `/nonexistent`) shows the raw Next.js "404 | This page could not be found" page with no styling, no back link, and no branding. Looks broken and unprofessional.
- **Files:** Missing `app/not-found.tsx`
- **Fix:** Create a custom 404 page matching the site's design with a "Back to Games" link.

### 6. Leaderboard "Today's Challenge" Tab Shows Empty State by Default
Every game's leaderboard defaults to "Today's Challenge" tab showing "No scores yet — play a challenge to get on the board!" The "All Time" tab also appears empty. First-time visitors see an empty leaderboard with no social proof.
- **Fix:** Default to "All Time" if today's challenge has no scores, or show a more encouraging empty state with a CTA.

### 7. Sound Toggle Inconsistency Across Games
Perfect Pour and Memory Path show a sound toggle icon below the mode selector. Balloon Match does not show one at the mode selection stage. Sound toggle placement is inconsistent.
- **Fix:** Either show the sound toggle in the same position on all game pages, or remove it from the mode selector view entirely and only show it during gameplay.

### 8. Excessive Empty Space Below Leaderboard on Game Pages
On game pages, scrolling past the leaderboard reveals a large empty area before the footer. This is caused by the unfilled ad container (`between-games-banner` format "leaderboard" = 728×90) taking up space even when empty.
- **Related to:** Issue #1 (unfilled ad containers)

## Medium (UX polish / readability)

### 9. No "How to Play" Instructions on Game Pages
Games drop users directly into a mode selector without explaining the game mechanics. New users have no idea what "Balloon Match" involves until they start playing. Each game page should have a brief instruction section.
- **Fix:** Add a collapsible or always-visible "How to Play" section on each game page.

### 10. Contact Link Points to Privacy Page Anchor
The footer "Contact" link goes to `/privacy#contact`, which is just a single line saying "email us at hello@tinyarcadium.com." This is thin for AdSense requirements.
- **Fix:** Create a proper contact page, or at minimum add more contact details and a contact form.

### 11. Mode Selector Cards Lack Descriptions
The Solo, Daily Challenge, and Challenge a Friend cards have no descriptions explaining what each mode does. Users must guess.
- **Fix:** Add a one-line subtitle to each mode card (e.g., Solo: "Practice at your own pace", Daily Challenge: "Same puzzle, everyone competes today").

### 12. Homepage Description is Generic
The meta description and on-page copy ("Quick stress-buster games to relax, focus, and compete") is generic and not keyword-rich. Doesn't help with SEO or AdSense content evaluation.
- **Fix:** Write more specific, keyword-rich descriptions for the homepage and each game.

### 13. No Loading or Error Boundary Pages
No `loading.tsx` or `error.tsx` exist. If a page takes time to load or an error occurs during rendering, users see either nothing or the default Next.js error page.
- **Fix:** Add `loading.tsx` (spinner/skeleton) and `error.tsx` (styled error with retry button) in the app directory.

## Low (minor polish)

### 14. Game Card Links are Technically "Empty Links" for Accessibility
The homepage game cards wrap content in `<a>` tags but accessibility tools detect 3 "empty links" — the cards don't have explicit `aria-label` attributes because they rely on child content. While the child headings provide context, explicit labels would be cleaner.
- **Fix:** Add `aria-label` to game card links (e.g., `aria-label="Play Balloon Match"`).

### 15. Privacy Policy Missing "Data Retention" and "Cookie Policy" Sections
AdSense requires disclosure of cookies used (both first-party player ID cookie and Google's ad cookies). The current privacy policy mentions ads but doesn't explicitly call out cookie usage or data retention periods.
- **Fix:** Add a "Cookies" section listing the player ID stored in localStorage and Google ad cookies.

### 16. No Favicon Displayed in Browser
The site references `/icons/icon-192.png` and `/icons/icon-512.png` but there's no classic `favicon.ico`. Some browsers may not display any icon.
- **Fix:** Ensure a `favicon.ico` exists in the public directory, or add a `<link rel="icon">` tag in the head.

### 17. OG Image May Not Exist
All pages reference `/og.png` for OpenGraph images but it's unclear if this file exists or is a placeholder. If missing, social sharing previews will have no image.
- **Fix:** Verify `/og.png` exists and is a proper 1200×630 image. If not, create one.

## AdSense Readiness Summary

**Likely rejection reasons:**
1. **Low-value content** — only 3 interactive games with minimal text content
2. **Missing required pages** — no About page, no Terms of Service
3. **Branding/domain mismatch** — "Mini Games Hub" on `tinyarcadium.com`
4. **Empty ad units visible** — unfilled ad containers create dead whitespace
5. **Thin contact info** — just an email address buried in the privacy page
6. **Insufficient unique text** — game pages are mostly interactive with minimal indexable content

**Already good:**
- Privacy Policy exists and covers key topics
- Robots.txt and sitemap.xml properly configured
- SSL enabled
- Clean, professional design
- Good mobile responsiveness
- Proper heading structure (H1 → H2 → H3)
- Skip-to-content link for accessibility
- ARIA landmarks (nav, main, footer) in place
