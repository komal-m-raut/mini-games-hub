import { GameContent } from '@/types/content';

/**
 * Real content for the RPS Arena game page — written against
 * `games/rps-arena/bot.ts` (`botMove`) and `games/rps-arena/constants.ts`
 * (`WINS_TO_TAKE_MATCH`, `MAX_GAMES_PER_MATCH`, `MAX_THROWS_PER_MATCH`,
 * `scoreMatch`), so every number below is true of the actual game.
 */
export const CONTENT: GameContent = {
  intro: [
    "RPS Arena is rock-paper-scissors against a bot that studies your habits instead of just guessing. Game theory says the only unbeatable strategy is throwing rock, paper and scissors with equal, uncorrelated randomness — but real people can't generate true randomness by hand, and that gap is exactly what the bot exploits. A match is first to 5 wins (capped at 9 decisive throws — the most 5-4 can ever need); ties don't count as a game and simply replay, though every throw, ties included, counts against a 15-throw hard cap so a stubborn tie streak can't stall a match forever.",
    "The three difficulties are three different bots, and none of them hide how they work. Easy throws uniformly at random — there's nothing to read. Medium keeps a running count of every throw you've made and plays whatever beats your single most common one, 75% of the time, with 25% pure noise mixed in so it's readable but not robotic. Hard goes further: it tracks what you tend to throw right after your own last throw (an order-1 Markov model) and blends that with the same frequency count Medium uses, going for the counter 85% of the time. The bot only ever sees throws you've already made — never the one you're about to make.",
    "A won match scores 10 minus one point per game the bot still took off you; a lost match banks 1.2 points per game you won anyway, so even a loss isn't a zero; a drawn match (only possible if the 15-throw cap is hit with the score level) scores a flat 5.",
  ],
  tips: [
    "Break your own patterns on purpose. Medium and Hard both read your history, so the surest way to beat them is to genuinely mix your throws instead of settling into a favourite.",
    "Don't chase a loss with rock. It's the single most common tilt throw after losing a round, which makes it exactly the kind of habit a frequency-counting bot is built to catch.",
    "Watch your own habits, not the bot's — its logic is fixed and disclosed above; the only variable left in the match is whether you're leaking a pattern it can read.",
    "Deliberately throw whatever you'd normally avoid. If you can name your 'never' throw, that's the one the bot will eventually stop expecting.",
    "Against Hard, vary what follows your *previous* throw, not just your throws overall — its read is keyed off transitions (what comes after your last move), so an otherwise-balanced mix can still be predictable move-to-move.",
    "The Daily Challenge runs the same three seeded bot dice streams — Easy, then Medium, then Hard — for everyone, so it's the fairest way to compare your ability to play unpredictably against the leaderboard.",
  ],
  faq: [
    {
      q: 'Can the bot see my throw before I commit?',
      a: "No — `botMove` only ever receives your past throws, never the one in progress. Every difficulty picks its move from history alone, so there is no way for it to react to what you're about to throw; it can only get better at predicting it over time.",
    },
    {
      q: 'How is my match score calculated?',
      a: 'A match is first to 5 wins (capped at 9 decisive throws). Win it and you score 10 minus one point per game the bot won off you (5-0 scores 10, 5-4 scores 6). Lose it and you score 1.2 points per game you still won (a 4-5 loss scores 4.8). A drawn match — only possible if the 15-throw tie-replay cap is hit level — scores a flat 5. Solo sessions and Daily/Friend Challenges are both three matches, for up to 30 points total.',
    },
    {
      q: "What's different between Easy, Medium and Hard?",
      a: "Easy throws uniformly at random. Medium counts your throws overall and plays the counter to your favourite one 75% of the time (25% random noise). Hard blends that same frequency count with a read on what you tend to throw right after your own last throw, and plays the counter to that prediction 85% of the time (15% noise).",
    },
    {
      q: 'What happens on a tie?',
      a: "Ties don't count as a game for either side — the throw simply replays. They do still count toward a 15-throw hard cap per match, so an unusually long tie streak can't drag a match out forever; if that cap is ever hit with the score level, the match is recorded as drawn.",
    },
    {
      q: 'How does the Daily Challenge work, and when does it reset?',
      a: 'The Daily Challenge is three matches against Easy, then Medium, then Hard, with the bot\'s dice seeded from a code that changes at midnight UTC — so everyone who plays that day faces the identical bot randomness. Your own throws still decide the outcome; the seed only fixes what the bot rolls when it isn\'t certain.',
    },
    {
      q: 'Is RPS Arena free, and do I need an account?',
      a: 'Completely free, with no download or signup. Your device holds an anonymous ID so your scores, bests, and leaderboard entries carry across visits without collecting anything personal.',
    },
  ],
  related: ['hand-cricket', 'xo-shift', 'fading-xo', 'math-sprint'],
};
