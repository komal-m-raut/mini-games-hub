import { GameContent } from '@/types/content';

/**
 * Real content for the Hand Cricket game page — written against
 * `games/hand-cricket/constants.ts` (`getTarget`, `scoreMatch`) and
 * `games/hand-cricket/bot.ts` (`botBowl`, `botBat`), so every number and
 * claim below is true of the actual game.
 */
export const CONTENT: GameContent = {
  intro: [
    "Hand cricket is the game you played on a school bench with nothing but your own fist: no ball, no bat, just two players throwing a number from one to five — or here, one to six — at exactly the same moment. Get it right and you might set a total your friend can never chase; get it wrong at the wrong instant and you're out for a duck. It's one of the most-played playground games across India, entirely improvised, and this version keeps that spirit while giving the bot a memory it can't cheat with.",
    "One wicket, two innings, no overs. You bat first: each ball, you throw 1–6 and the bot bowls the same instant — match its number and you're out, anything else adds to your total. Then you bowl, chasing the bot down with a target of your runs plus one (level scores are a tie, not a win, exactly like the real thing). The bot never sees your throw before committing to its own; it only ever reasons from the balls that came before.",
    "Your match score out of 10 rewards how you win, not just that you did: bowling the bot out cheaply scores higher than scraping a win close to the target, a tie sits at a flat 5, and even a loss is scored by how big a total you'd set relative to what the bot had to chase. Solo play runs three matches at one difficulty; Daily and Friend Challenges run the same three matches — easy, then medium, then hard — with the bot's dice seeded identically for everyone.",
  ],
  tips: [
    "Against Medium, the bot never repeats its own last throw in either role — so if it just bowled a 4, it will never bowl 4 twice running. Track its last number and you've already ruled out a sixth of its options.",
    'Against Hard, the bot bowls what you bat most — vary your batting spread rather than leaning on one favourite number, or it will start finding you out on that exact number.',
    "6 is the greedy tell: everyone reaches for it under pressure, which makes it the single easiest number for a pattern-reading bot to anticipate. Mix in 1s and 2s even when you're chasing quickly.",
    "When you're bowling against Hard, watch which two numbers it stops throwing — those are the ones it's read as your most frequent bowls, and it's actively steering away from them, so throwing something else entirely can catch it out.",
    "Every bot brain keeps 20% of its picks completely random on Hard, so no pattern — yours or its own avoidance — is ever airtight. Don't over-read a single ball; look for the pattern across several.",
    'The Daily Challenge seeds the bot\'s dice identically for everyone across all three matches, so it is the fairest way to compare your reading of the bot against the leaderboard.',
  ],
  faq: [
    {
      q: 'Is this actually fair — can the bot see my pick before it throws?',
      a: "No. The bot's bowl and bat functions only ever look at prior, already-resolved balls — never the pick you're making right now. Both hands are decided the same instant and only revealed together, exactly like the real playground game.",
    },
    {
      q: 'What counts as a tie?',
      a: "Innings 2's target is always your first-innings total plus one. If the bot gets out with its score exactly equal to yours — one run short of the target — that's a tie, not a win for either side, matching the classic hand cricket rule that level scores don't produce a winner.",
    },
    {
      q: 'Why only one wicket?',
      a: "That's the format: each innings ends the instant a throw matches, full stop — no overs, no second life. It's what makes every single throw in hand cricket carry real weight compared to a game with a set number of balls.",
    },
    {
      q: 'How is my match score calculated?',
      a: 'A win scores 7 plus up to 3 more based on how many runs short of the target the bot fell when it got out — a comfortable bowl-out approaches 10. A tie is a flat 5. A loss scores up to 4.9, scaled by how big a target your first innings set. Solo sessions and Daily/Friend Challenges are both three matches, for up to 30 points total.',
    },
    {
      q: 'How does the Daily Challenge work, and when does it reset?',
      a: "The Daily Challenge is three matches — easy, then medium, then hard — with the bot's dice seeded from a code that changes at midnight UTC, so every player faces identical bot behaviour in both innings of every match until the next day's code takes over.",
    },
    {
      q: 'Is Hand Cricket free, and do I need an account?',
      a: 'Completely free, with no download or signup. An anonymous ID stored on your device keeps your scores and leaderboard entries yours across visits without collecting anything personal.',
    },
  ],
  related: ['rps-arena', 'xo-shift', 'math-sprint', 'fading-xo'],
};
