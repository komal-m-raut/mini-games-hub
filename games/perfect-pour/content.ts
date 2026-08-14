import { GameContent } from '@/types/content';

/**
 * Real content for the Perfect Pour game page — written against
 * `games/perfect-pour/constants.ts` (`POUR_DIFFICULTY`) and
 * `utils/scoring.ts`, so every number below is true of the actual game.
 */
export const CONTENT: GameContent = {
  intro: [
    "Perfect Pour is a calmer cousin of Balloon Match: instead of squeezing a balloon, you're topping up a glass, but the underlying test is the same blend of visual memory and controlled touch. Each round fills your glass automatically to a random level, holds it there for a few seconds so you can study exactly where the liquid sits, then drains it back to empty. From there you press and hold to pour your own water back in, releasing the instant you believe you've matched that level.",
    "Your accuracy is simply how close your final fill lands to the target, in percentage points of the glass — miss by six points and you're 94% accurate. That accuracy feeds the same scoring curve as every game here: full marks for a perfect pour, zero at 50% accuracy or worse, and roughly a point out of ten lost for every five percentage points you're off, rounded to two decimal places.",
    "Difficulty changes the glass itself as much as the challenge. Easy pours into a big, forgiving glass at a gentle speed, while Hard shrinks the glass and speeds the pour up, so the same small misjudgement costs you a much bigger swing in fill level.",
  ],
  tips: [
    'Watch the fill line settle, not just the glass filling up — the level is held on screen for a few seconds specifically so you can lock in exactly where it stopped, not just its general height.',
    'On Hard the glass is smaller and pours faster, so the same half-second of hesitation moves the level much further than it would on Easy — start your pour a fraction earlier than feels natural.',
    "Because accuracy is measured in percentage points of the glass, a miss near the very top or bottom looks smaller than a miss in the middle but costs exactly the same — don't relax just because the target looks close to full or empty.",
    "Pour speed is constant for a given difficulty, so once you've poured a couple of rounds you can start counting your hold in roughly the same rhythm each time rather than judging purely by eye.",
    'The Daily Challenge locks every player into the same three seeded fills (Easy, Medium, Hard) for the day, so it is the fairest way to measure your pour against the leaderboard rather than comparing runs against different random targets.',
    "Solo sessions and their best totals are saved to this device, so replaying a difficulty you've already got a feel for is the quickest route to a new personal best.",
  ],
  faq: [
    {
      q: 'How is my score calculated?',
      a: "Each round scores your accuracy as 100 minus the percentage-point gap between your poured level and the target (so a 6-point miss is 94% accurate), which then converts to a round score out of 10 on the same curve every game here uses: full accuracy scores 10, 50% accuracy or worse scores 0, and you lose about a point for every 5% you miss by, to two decimal places. A solo session is five rounds for up to 50 points; a Daily or Friend Challenge is three seeded rounds for up to 30.",
    },
    {
      q: "What's different between Easy, Medium and Hard?",
      a: 'Easy pours into a larger glass at a gentle rate with plenty of room to react once you start pouring. Medium uses a standard-size glass and a faster pour. Hard shrinks the glass further and pours the fastest, so the same length of hesitation overshoots by a lot more — precision matters far more than raw speed here.',
    },
    {
      q: 'How does the Daily Challenge work, and when does it reset?',
      a: 'The Daily Challenge is three seeded rounds shared by every player, built from a code that changes at midnight UTC, so it is the same targets for everyone until the next day\'s code takes over.',
    },
    {
      q: 'Can I play Perfect Pour offline?',
      a: "Perfect Pour is cached by Mettle's installable PWA, so once you've loaded it once you can keep playing solo rounds offline; you'll need a connection again to submit a leaderboard score.",
    },
    {
      q: 'What are the controls?',
      a: 'Press and hold to pour, and release when you think you\'ve matched the target level — works with mouse, touch or a held key, with no different setup needed between desktop and mobile.',
    },
    {
      q: 'Is Perfect Pour free, and do I need an account?',
      a: 'Yes, entirely free with no signup. An anonymous ID on your device keeps your scores yours between visits; nothing personal is collected.',
    },
  ],
  related: ['balloon-match', 'timing-tap', 'bullseye', 'time-sense'],
};
