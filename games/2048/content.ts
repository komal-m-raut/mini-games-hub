import { GameContent } from '@/types/content';

/**
 * Real content for the 2048 game page — written against
 * `games/2048/engine.ts` (`collapseRow`, `isGameOver`, `hasWon`) and
 * `games/2048/constants.ts` (`calculateSprintScore`), so every number below
 * is true of the actual game.
 */
export const CONTENT: GameContent = {
  intro: [
    '2048 is the classic sliding-merge puzzle: a 4×4 grid, two tiles to start, and four directions to push them in. Swipe, tap the chevrons, or use the arrow keys/WASD, and every tile on the board slides as far as it can in that direction; any two equal tiles that meet along the way merge into one tile worth double. A new 2 or 4 (90%/10%) appears in a random empty cell after every move that actually changes the board — a press that would leave everything exactly where it is costs nothing and spawns nothing. The goal is simple to say and hard to sustain: keep merging upward, build a tile worth 2048, and keep going as long as the board still has a legal move left in it.',
    "The whole game is really just exponential growth against a shrinking amount of space. Sixteen cells is not a lot of room once a handful of tiles have climbed into the hundreds, and every merge that consolidates two tiles into one buys back a cell for the next spawn — while every move that doesn't merge anything just uses up board space for free. Solo play is endless: there is no target score to stop at, only the point where none of the four directions change the board anymore. Reaching a 2048 tile pops a one-time banner celebrating the milestone, but the run itself keeps going afterward — 2048 is a waypoint on the score, not a finish line.",
    "Daily and Friend Challenges trade the open-ended run for three fixed 90-second sprints, each starting from a fresh empty board. A sprint's score is the raw points earned from merges in those 90 seconds (a 2+2 merge scores 4, a 4+4 merge scores 8, and so on) divided by 250 and capped at a round score of 10 — so a sprint that nets around 2,500 merge points is a perfect round, and the three rounds' scores add up to a total out of 30 on the shared leaderboard.",
  ],
  tips: [
    'Pick one corner and commit to it for the whole run — build your biggest tile there and never move it away from that corner once it is anchored. Every merge chain should build toward that corner, not away from it.',
    "Never press the direction that would move your anchor tile out of its corner. If up-left is your corner, that usually means banning \"down\" and \"right\" whenever they'd actually shift the anchor — the moment the biggest tile drifts to the middle of the board, it starts blocking merges instead of anchoring them.",
    'Build a monotonic row or "snake": arrange tiles so each row (or column) descends in value from the corner outward, so every tile has a clear, larger neighbor to eventually merge into rather than being boxed in by mismatched values on both sides.',
    "Clear small merge chains before they pile up — two or three small tiles sitting unmerged near your big stack will eventually clog the exact cells you need for your next big merge. Tidy the clutter while there's still room to move it safely.",
    "Undo is for the misclick, not the strategy: solo play gives you exactly one undo per game, for the swipe that goes the wrong way, not a way to replay every move until the spawn is favorable. Once it's spent, it's spent for the rest of that run.",
    "Challenge rounds all reset to a fresh board and share one seeded spawn sequence for everyone playing that code — so what separates scores is purely play, not luck. Since it's the exact same tiles in the exact same order, comparing sprint scores against a friend (or yourself, on the Daily) is as fair as this genre gets.",
  ],
  faq: [
    {
      q: 'What are the exact merge rules?',
      a: 'Tiles slide as far as they can toward the pressed direction. Two equal tiles that meet merge into one tile of double the value — but each tile can only take part in one merge per move, and a tile produced by a merge can never merge again in that same move. So a row of [2, 2, 4] pushed toward the 2s merges to [4, 4] (the two 2s combine into a 4, which then sits next to the original 4 without merging into it again) — it does not become [8]. A row of [4, 4, 8] similarly becomes [8, 8], never [16], for the same reason.',
    },
    {
      q: 'How does scoring work in a Challenge sprint?',
      a: "Each Challenge round is a 90-second sprint from a fresh board. Your round score out of 10 is the raw merge points you scored, divided by 250 and clamped to [0, 10] — so roughly 2,500 merge points in the 90 seconds is a perfect 10. The three rounds (always three, back to back) add up to a total out of 30, which is what lands on the shared leaderboard.",
    },
    {
      q: 'What does the one-time undo actually do?',
      a: "Solo endless play gives you exactly one undo for the whole run: it restores the board, score and move count to exactly how they were before your most recent move. It's disabled before your first move (there's nothing yet to undo) and disabled again for good the instant you use it — there's no regenerating a second one mid-run. Challenge sprints don't have an undo at all, since every player needs to face the exact same sequence of decisions for the leaderboard to mean anything.",
    },
    {
      q: 'Is the Daily Challenge actually fair — everyone gets the same tiles?',
      a: "Yes. Each of the three rounds draws its spawns (both which cell gets the new tile and whether it's a 2 or a 4) from its own seeded random sequence, generated from that day's shared code. Every player who opens the Daily Challenge sees byte-identical spawns in byte-identical order in each round — the only thing that can differ between two players' boards is the moves they actually chose to make.",
    },
    {
      q: 'What happens when I reach the 2048 tile?',
      a: "A one-time banner celebrates it with a \"Keep Going\" button — dismissing it just continues the same run right where you left off. Reaching 2048 doesn't end anything: solo play is endless, so tiles past 2048 (4096, 8192, and beyond) keep adding to your score for as long as the board still has a legal move.",
    },
    {
      q: 'Is 2048 free, and do I need an account?',
      a: 'Completely free, with no download or signup. An anonymous ID stored on your device keeps your scores and leaderboard entries yours across visits without collecting anything personal.',
    },
  ],
  related: ['minesweeper', 'snake', 'grid-flash', 'math-sprint'],
};
