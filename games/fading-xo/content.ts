import { GameContent } from '@/types/content';

/**
 * Real content for the Ghost Grid game page — written against
 * `games/fading-xo/engine.ts` (the FIFO queues, the forced-oldest movement
 * rule, the 60-action draw cap) and `games/fading-xo/constants.ts`
 * (`score10`), so every claim below is true of the actual game.
 */
export const CONTENT: GameContent = {
  intro: [
    "Ghost Grid takes ordinary tic-tac-toe and removes the one thing that makes it a solved game: permanence. You and the bot alternate placing three marks each exactly like the classic game — three in a row during this opening phase wins outright, same as always. But once both sides have placed all three, the board stops holding still. From then on, every turn you don't win with, you're forced to pick up your oldest mark and teleport it to any empty cell, where it becomes your newest. Your opponent does the same with theirs. The board never fills up and never gets stale — it just keeps recycling, three marks a side, forever, until someone lines up three in a row or the game hits its action cap.",
    "That single rule — oldest mark moves, no exceptions, no choosing which piece to sacrifice — is what gives the game its whole character. Every line you build is temporary: the moment you complete two in a row, the clock is already running on how long you get to keep it, because eventually that piece becomes the one you're forced to move away. Both players' current oldest mark renders faded on the board with a soft shimmer, so you always know — for both sides — exactly which piece is about to fade next. There's no hidden information here, just a puzzle of timing.",
    'Play is best-of-three against a bot: three quick games at one difficulty make up a round, and your round score out of 10 comes from that record — a win is worth 10 points, a draw 5, a loss 0, averaged over the three games. A solo warm-up is one round at the difficulty you pick. Daily and Friend Challenges add an easy, medium and hard round into one shared 30-point ladder, with every player facing the same seeded bot decisions.',
  ],
  tips: [
    "Count both ghost clocks, not just yours. The bot's oldest mark fades on your screen exactly like yours does — track which of its pieces is about to be forced to move, because that tells you which of its lines is about to lose a piece for free.",
    'Build your winning line so the move that completes it is your newest piece, not one already queued to fade. A line that closes with a fresh mark stays intact for a full extra turn; a line that closes with your current oldest mark can win immediately, but if it somehow doesn\'t, you\'re forced to dismantle it yourself next turn.',
    "A three-in-a-row must be completed the turn it opens. If you have two in a line and an empty third cell, take it now — waiting a turn means your oldest mark may move away first (yours, forced) or the bot may occupy that empty cell (theirs, by choice), and either way the chance is gone.",
    "You can use your own forced move as a block. If the bot threatens a line and your oldest mark's only legal destinations include the cell it needs, teleporting into that cell blocks the threat and completes your move at the same time — there's no cost to defending with a piece you had to relocate anyway.",
    'The center cell recycles best. Whoever holds it sits in four lines at once, and because marks keep moving through the whole board anyway, contesting the center is rarely a wasted move even late in a long game.',
    'On Hard, the bot always takes an immediate win or blocks yours the instant either exists, then plans two moves ahead — including how its own next forced departure will land. Expect it to avoid moves that look good now but strand it with an awkward piece to move next turn.',
  ],
  faq: [
    {
      q: 'Why is one of my marks see-through?',
      a: "That's your oldest mark — the one FIFO order says you're forced to move on your next turn. It fades to about 45% opacity with a gentle shimmer (a static dashed outline if you have reduced motion enabled) so it's always visible at a glance. The bot's oldest mark fades the same way, so you can track both ghost clocks at once.",
    },
    {
      q: "Can I move a different mark instead of the faded one?",
      a: 'No — once you have three marks down, the game is strictly a forced move: your oldest mark, wherever it sits, is the only piece you can act with, and it can teleport to any empty cell on the board.',
    },
    {
      q: 'Can a mark win by moving into a line?',
      a: "Yes. A three-in-a-row is checked after every single action — placement or movement — so completing a line by teleporting your forced mark into the right empty cell wins the game exactly like placing a winning mark does.",
    },
    {
      q: 'How is my round score calculated?',
      a: 'Each round is a best-of-three match against one bot difficulty: a win scores 10, a draw scores 5, a loss scores 0, averaged over all three games and rounded to 2 decimal places. A solo warm-up is one round for up to 10 points. Daily and Friend Challenges run an easy, medium and hard round for a 30-point maximum.',
    },
    {
      q: "What happens if neither side ever completes a line?",
      a: "The board can't fill up the way normal tic-tac-toe does — the movement phase keeps exactly 3 marks per side in play, always leaving empty cells. So instead, the game is capped at 60 total actions across both players; if nobody has won by then, that game ends in a draw.",
    },
    {
      q: 'How does the Daily Challenge work, and when does it reset?',
      a: "The Daily Challenge is three rounds — one against an easy bot, one medium, one hard — generated from a code that changes at midnight UTC and shared by every player, so everyone's bots make the exact same sequence of moves until the next day's code takes over.",
    },
    {
      q: 'Is Ghost Grid free, and do I need an account?',
      a: 'Completely free, with no download or signup. An anonymous ID stored on your device keeps your scores and leaderboard entries yours across visits without collecting anything personal.',
    },
  ],
  related: ['xo-shift', 'rps-arena', 'hand-cricket', 'grid-flash'],
};
