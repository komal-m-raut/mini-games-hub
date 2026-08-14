import { GameContent } from '@/types/content';

/**
 * Real content for the Color Match game page — written against
 * `games/color-match/constants.ts` (`COLOR_DIFFICULTY`) and
 * `games/color-match/colorMath.ts` (`colorAccuracy`), so every number below
 * is true of the actual game.
 */
export const CONTENT: GameContent = {
  intro: [
    "Color Match is a test of colour perception as much as memory: how precisely can you hold a colour in your mind's eye, then rebuild it from nothing? Each round shows a single flat colour panel for a few seconds, then hides it completely — from there you mix your own colour back on three sliders (red, green, blue), starting from neutral grey, and submit whenever you're happy with the match.",
    "What sets the scoring apart from a simple side-by-side comparison is how it's judged: rather than measuring the raw distance between the RGB numbers, Color Match weighs the mismatch the way human eyes actually perceive colour — the eye is far more sensitive to green than to blue, so an identical numeric error in each channel doesn't cost you the same. That perceptual distance becomes an accuracy percentage, which converts to a round score out of 10 on the site's usual curve, with two extra tiers layered on top: 95% accuracy earns an Amazing, and 99.5% or higher earns a true Perfect.",
    'Difficulty changes how long you get to look and how subtle the colours themselves are, from bold five-second targets on Easy to muted two-second flashes on Hard.',
  ],
  tips: [
    "Read the colour's temperature and depth first — is it leaning warm or cool, light or dark — before you fine-tune the individual red, green and blue sliders.",
    "The scoring weighs green more heavily than blue, matching how your eyes actually perceive colour, so when you're unsure, prioritise getting the green channel right over chasing the last few points of blue or red.",
    'On Hard the colours are deliberately subtler and the window is only two seconds — use that short look to place the colour on a rough mental map (which third of each slider) rather than trying to read exact values.',
    "The sliders always start at neutral grey, so every round is a genuine blind mix — don't assume the last round's colour gives you any head start on this one.",
    'Solo mode lets you choose a 1, 3 or 5-round session, so if you\'re warming up, a single round is a quick way to test a difficulty before committing to a full run.',
    'The Daily Challenge locks in the same three seeded colours (Easy, Medium, Hard) for every player, so it is the fairest way to compare your eye for colour against the leaderboard that day.',
  ],
  faq: [
    {
      q: 'How is my score calculated?',
      a: 'Your mixed colour is compared to the target using a perceptually weighted colour distance — one that reflects how sensitive human eyes are to each channel, rather than a flat numeric difference — which produces an accuracy from 0–100%. That accuracy converts to a round score out of 10 on the same curve as every game here, with two extra tiers layered on top: 95% or higher accuracy is rated Amazing, and 99.5% or higher is a true Perfect. Solo sessions can be 1, 3 or 5 rounds; Daily and Friend Challenges are always three seeded rounds for up to 30 points.',
    },
    {
      q: "What's different between Easy, Medium and Hard?",
      a: 'Difficulty changes three things together: how long the colour stays on screen (five seconds on Easy, down to two on Hard), how close your mix has to be to score well, and how subtle the colours themselves are — Easy uses bold, easily-named hues, while Hard uses muted shades that are much harder to pin down.',
    },
    {
      q: 'How does the Daily Challenge work, and when does it reset?',
      a: 'The Daily Challenge is three seeded colours (Easy, Medium, Hard) shared by every player, generated from a code that changes at midnight UTC, so everyone mixes identical targets until the next day\'s code arrives.',
    },
    {
      q: 'Can I play Color Match offline?',
      a: "Color Match is cached by Mettle's installable PWA, so it stays playable offline once you've opened it — leaderboard submissions just need you back online.",
    },
    {
      q: 'What are the controls?',
      a: 'Drag the three RGB sliders (or use your keyboard once one is focused) to mix your colour, then submit when you\'re happy — the same controls work on mouse, touch and keyboard.',
    },
    {
      q: 'Is Color Match free, and do I need an account?',
      a: 'Free to play, with no download or signup. An anonymous ID stored on your device keeps your scores and leaderboard entries yours across visits.',
    },
  ],
  related: ['memory-path', 'balloon-match', 'shape-echo', 'echo-ear'],
};
