import { GameContent } from '@/types/content';

/**
 * Real content for the Balloon Match game page — written against
 * `lib/constants.ts` (`DIFFICULTY_CONFIG`) and `utils/scoring.ts` /
 * `utils/accuracy.ts`, so every number below is true of the actual game,
 * not paraphrased marketing copy.
 */
export const CONTENT: GameContent = {
  intro: [
    "Balloon Match is a short visual memory test wrapped in a precision game. Each round shows you a balloon inflated to a random size for a few seconds, then takes it away — your job is to hold down a button and inflate your own balloon to that exact size, purely from memory. There's no ruler, no side-by-side comparison, just your sense of how big that balloon looked a moment ago.",
    "Accuracy is the percentage gap between your balloon's final size and the target, scaled to how big the target itself was, so a small miss on a small balloon costs more than the same miss on a big one. That accuracy converts to a round score out of 10 — perfect accuracy scores a full 10, accuracy of 50% or worse scores 0, and you lose roughly a point for every 5% you're off, rounded to two decimal places, with ratings from Try Again up to Perfect.",
    "Play five rounds solo at your own difficulty, or take on the seeded three-round Daily Challenge and Friend Challenge, where everyone inflates the exact same targets and lands on the same leaderboard.",
  ],
  tips: [
    "Study the whole observation window, not just the first glance — the balloon holds its size on screen for a few full seconds, and re-checking it right before it disappears sharpens your memory more than a quick first look.",
    "On Medium and Hard you're inflating against a countdown, so decide your target as you start holding rather than trying to correct mid-squeeze — a confident release beats a hesitant one.",
    "Accuracy is measured relative to the target's own size, not in raw units, so a small miss on a small balloon costs you more than the same miss on a big one — treat small targets with extra care.",
    "Inflation speed is fixed for a given difficulty, so your hold time is roughly proportional to size — a rough mental count of how long you held for a similar-sized balloon earlier in the session can steady your next release.",
    "Run the Daily Challenge for a fair comparison: it's the same three seeded balloons (Easy, Medium, Hard) for every player that day, so your spot on that leaderboard reflects skill, not the luck of a random target.",
    "Your best single round and best session are saved on this device — replaying a difficulty you already know well is the fastest way to chip away at a personal best.",
  ],
  faq: [
    {
      q: 'How is my score calculated?',
      a: "Each round compares your balloon's final size to the target as a percentage difference, scaled to the target's own size, giving an accuracy from 0–100%. That accuracy converts to a round score out of 10: perfect accuracy scores a full 10, accuracy of 50% or worse scores 0, and you lose roughly a point for every 5% you miss by, rounded to two decimal places. A solo session totals five rounds (50 points max); a Daily or Friend Challenge totals three seeded rounds (30 points max).",
    },
    {
      q: "What's different between Easy, Medium and Hard?",
      a: 'Easy uses a wide 30–65 unit target range with no time limit on your hold, so you can take as long as you like to match it. Medium narrows the range to 20–78 units and gives you five seconds to lock in a size. Hard widens the range further to 15–88 units, inflates faster, and cuts your window to three seconds, so there is much less room to correct a bad start.',
    },
    {
      q: 'How does the Daily Challenge work, and when does it reset?',
      a: 'The Daily Challenge is the same three seeded rounds (Easy, then Medium, then Hard) for every player worldwide, generated from a code that changes at midnight UTC. Because the code is fixed for the day, everyone who plays sees identical balloons, so the leaderboard is a genuine like-for-like comparison until it rolls over.',
    },
    {
      q: 'Can I play Balloon Match offline?',
      a: "Yes — Mettle is an installable Progressive Web App, and Balloon Match is one of the games cached for offline play. Once you've loaded it once, it keeps working without a connection; leaderboard submissions just need you back online.",
    },
    {
      q: 'What are the controls?',
      a: 'Press and hold to inflate your balloon, and release when you think it matches the size you memorized. It works with mouse, touch, or a held keypress, so it plays the same way on desktop and mobile.',
    },
    {
      q: 'Is Balloon Match free, and do I need an account?',
      a: "Completely free, with no download and no signup. Your device gets a random anonymous ID so your leaderboard entry and best scores stay yours across visits, but there's no account, password, or personal information involved.",
    },
  ],
  related: ['perfect-pour', 'memory-path', 'grid-flash', 'bullseye'],
};
