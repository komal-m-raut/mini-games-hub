import { GameContent } from '@/types/content';

/**
 * Real content for the XO Shift game page — written against
 * `games/xo-shift/engine.ts` (adjacency, phases, the no-backtrack rule) and
 * `games/xo-shift/constants.ts` (`calculateRoundScore`), so every number
 * below is true of the actual game.
 */
export const CONTENT: GameContent = {
  intro: [
    "XO Shift is a variant of three men's morris — one of the oldest board games known, with boards scratched into temple roofs and city pavements thousands of years before tic-tac-toe existed in its modern form. It starts exactly like tic-tac-toe: you and a bot alternate placing marks on a 3×3 grid, and three in a row at any point during this Placement phase wins on the spot. The twist is what happens if nobody wins in six placements — the board doesn't fill up and stall, it enters a Movement phase where every mark is still in play.",
    "In Movement, you no longer place new marks — you slide one of your existing three marks, on your turn, into an empty cell that's orthogonally or diagonally adjacent to it. That single rule turns a game that's a guaranteed draw with perfect tic-tac-toe play into a genuine contest of positioning and tempo, since a completed line can now be broken and rebuilt on a later turn. The one restriction: a piece that just slid somewhere can't immediately slide straight back to the cell it left — that lock is per piece and lifts the moment that specific piece moves again, so you can always free it up by moving it elsewhere first.",
    'A round is a fixed best-of-3 against one bot difficulty: a win scores 10, a draw 5, a loss 0, averaged across all three games for a round score out of 10. A solo session plays three rounds at your chosen difficulty (9 games total); Daily and Friend Challenges run one round each against Easy, Medium and Hard in turn, with the bot dice and who moves first in every single game seeded from the challenge code, so everyone who opens the link faces an identically set-up bot.',
  ],
  tips: [
    'Center is king in placement — the middle cell touches all 8 other cells and sits on 4 of the 8 winning lines, more than any corner or edge, so claim it early if it is open.',
    'Aim for a double threat: two open lines at once with a shared empty cell to complete either one. The bot can only block one, so this forces a win the following turn.',
    "In Movement, don't shuffle — every slide should either complete a line, break up an opponent's two-in-a-row, or set up a double threat. Passing time with a pointless slide gives the bot a free tempo to build its own.",
    "The no-backtrack rule is a weapon, not just a restriction: force an opponent's piece into a cell where its only useful escape is the one it just came from, and it's stuck making a move that helps you instead.",
    'On Hard, the bot always takes an immediate win and always blocks yours, then plans two moves ahead — so trades that only pay off three moves later are safer bets than ones it can see coming next turn.',
    'The Daily Challenge runs the same seeded Easy → Medium → Hard rounds for everyone, so it is the fairest way to compare your XO Shift record against the leaderboard.',
  ],
  faq: [
    {
      q: 'Can pieces move diagonally, not just up/down/left/right?',
      a: "Yes. Every cell has full 8-neighbourhood adjacency — orthogonal and diagonal — so a corner can reach 3 neighbours, an edge cell 5, and the centre all 8 other cells.",
    },
    {
      q: "Why can't my piece move straight back where it came from?",
      a: "A piece that just slid from cell A to cell B is locked out of sliding back to A on its very next move — but only that one piece, and only until it moves again (to anywhere). Move a different piece, or move that piece somewhere else first, and the lock clears.",
    },
    {
      q: 'How is my round score calculated?',
      a: 'Each round is a fixed best-of-3 against one bot difficulty: a win is worth 10 points, a draw 5, a loss 0, averaged across all 3 games and rounded to 2 decimal places — for example 1 win and 2 draws scores 6.67. A solo session totals 3 rounds (30 points max); a Challenge totals Easy, Medium and Hard (also 30 points max).',
    },
    {
      q: 'Can a game end in a draw?',
      a: "Yes. If neither side completes a line within 40 total plies (placements plus slides), the game is a draw and scores 5 of that game's share of the round.",
    },
    {
      q: 'How does the Daily Challenge work, and when does it reset?',
      a: 'The Daily Challenge is one seeded round each against the Easy, Medium and Hard bots, generated from a code that changes at midnight UTC — everyone who plays that day faces the identical starting-player and bot-dice sequence until the next day\'s code takes over.',
    },
    {
      q: 'Is XO Shift free, and do I need an account?',
      a: 'Completely free, with no download or signup. An anonymous ID stored on your device keeps your scores and leaderboard entries yours across visits without collecting anything personal.',
    },
  ],
  related: ['fading-xo', 'rps-arena', 'hand-cricket', 'minesweeper'],
};
