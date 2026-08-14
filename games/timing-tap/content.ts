import { GameContent } from '@/types/content';

/**
 * Real content for the Timing Tap game page — written against
 * `games/timing-tap/constants.ts` (`TAP_DIFFICULTY`, `getTapAccuracy`,
 * `TAP_RATING_THRESHOLDS`), so every number below is true of the actual
 * game.
 */
export const CONTENT: GameContent = {
  intro: [
    'Timing Tap is a pure reflex and rhythm test: a glowing indicator sweeps back and forth along a bar, bouncing off each end, and you tap the instant it crosses the Perfect Zone at the centre. A 3-2-1 countdown runs before it starts moving, then it comes down entirely to your timing — no memory, no precision of touch, just reacting to the right moment.',
    "Accuracy is judged from how far off centre you land relative to that difficulty's zone width: land inside the zone and you're already in the 90–100% band, land outside it and accuracy tapers linearly the rest of the way to the bar's edge. That accuracy converts to a round score out of 10 on the site's standard curve, but the rating labels use their own finer five-tier scale — Perfect, Amazing, Great, Good and Try Again — so a near-miss inside a tight zone still reads as something better than a flat Great.",
    "Difficulty shrinks the zone and speeds up the sweep, and on Hard the pace itself drifts a little faster or slower on every bounce, so you can't lock into a rhythm and just count.",
  ],
  tips: [
    'Watch the indicator through at least one full bounce before you commit to a rhythm — the speed is constant within a round on Easy and Medium, but you need to see it move to calibrate your timing at all.',
    "On Hard, the sweep speed changes a little on every bounce, so don't trust the pace you clocked on the previous leg — re-judge the speed fresh each time it passes.",
    "Aim for the dead centre of the zone, not just inside it — accuracy peaks at the exact middle and tapers even within the Perfect Zone, so landing 'somewhere in the zone' still leaves points on the table.",
    'Tap decisively rather than easing into it — the indicator stops the instant you act, so a confident tap on your best guess beats a hesitant one that drifts past the moment you were watching for.',
    "Space bar taps score exactly as precisely as a click or touch, so if your pointer hand is unsteady, try keyboard input instead — the scoring doesn't care which input method you use.",
    'The Daily Challenge runs the same three seeded sweeps (Easy, Medium, Hard) for everyone, so it is the most direct way to measure your reflexes against the leaderboard rather than against your own variable practice rounds.',
  ],
  faq: [
    {
      q: 'How is my score calculated?',
      a: "Accuracy is measured from the exact centre of the bar outward: inside the Perfect Zone it runs from 100% at dead centre down to 90% at the zone's edge, then keeps tapering linearly the rest of the way to 0% at the bar's edge. That accuracy converts to a round score out of 10 on the same curve as every game here (perfect accuracy scores 10, 50% or worse scores 0), though the rating label uses its own finer bands — Perfect, Amazing, Great, Good, Try Again — tuned for how tight the zones get. Solo sessions are five rounds for up to 50 points; Daily and Friend Challenges are three seeded rounds for up to 30.",
    },
    {
      q: "What's different between Easy, Medium and Hard?",
      a: 'Easy gives you a wide Perfect Zone and a slow, steady sweep. Medium shrinks the zone and speeds the sweep up. Hard shrinks the zone further still and adds a small random speed change on every bounce, so the pace drifts instead of staying predictable — you have to judge each pass fresh.',
    },
    {
      q: 'How does the Daily Challenge work, and when does it reset?',
      a: 'The Daily Challenge is three seeded rounds (Easy, Medium, Hard) shared by every player, generated from a code that changes at midnight UTC, so everyone taps against identical sweeps until the next day\'s code takes over.',
    },
    {
      q: 'Can I play Timing Tap offline?',
      a: "Timing Tap is cached by Tiny Arcadium's installable PWA, so it keeps working offline once you've loaded it before — you'll need a connection again to submit a leaderboard score.",
    },
    {
      q: 'What are the controls?',
      a: 'Tap or click anywhere on the bar, or press Space, the instant the indicator crosses the centre — all three inputs are scored identically.',
    },
    {
      q: 'Is Timing Tap free, and do I need an account?',
      a: 'Completely free, with no download or signup. Your device holds an anonymous ID so your scores and leaderboard entries carry across visits without collecting anything personal.',
    },
  ],
  related: ['tap-frenzy', 'bullseye', 'balloon-match', 'perfect-pour'],
};
