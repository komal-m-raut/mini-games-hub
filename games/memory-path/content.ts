import { GameContent } from '@/types/content';

/**
 * Real content for the Memory Path game page — written against
 * `games/memory-path/constants.ts` (`PATH_DIFFICULTY`) and
 * `games/memory-path/pathGen.ts` (`comparePaths`), so every number below is
 * true of the actual game.
 */
export const CONTENT: GameContent = {
  intro: [
    "Memory Path trains spatial working memory — the same mental muscle you use to retrace your steps through a building you've only walked once. Each round lights up a sequence of cells across a grid, one at a time; memorize the order before it fades, then trace it back the same way, either by dragging across the grid or stepping through it with the arrow keys and Space.",
    "Scoring compares your trace to the real path cell by cell, in position: a cell traced correctly in the right spot counts toward your accuracy, cells you add past the path's own length count against you, and any cells you never reach count as missed. That accuracy — the share of the path you reproduced correctly — feeds the same 0–10 scoring curve as every other game here. A true Perfect needs the whole path back with nothing extra or missing; score that high with even one stray cell and it downgrades to a Great instead, so the rating never overstates a near-perfect run.",
    'Grid size, path length, and how long the finished path stays lit before fading all scale with difficulty — bigger grids mean a longer path to hold in memory, but also a longer look at it first.',
  ],
  tips: [
    "Don't just watch the lit trail — narrate the directions to yourself (up, up, right, down) as it reveals; encoding the path as a sequence of moves sticks better than trying to memorize raw grid coordinates.",
    'On Easy the starting cell pulses while you trace, so use that difficulty to build the habit of orienting yourself before committing to a direction — Medium and Hard remove that hint entirely.',
    "A fast drag across several cells in a straight line fills in every cell between your last point and your new one, so you don't need to trace each cell individually — sweep confidently along straight stretches of the path.",
    "Bigger grids on Hard also come with a longer memorize window before the path fades, so resist the urge to rush — you get more time relative to the path's length, not less.",
    'Keyboard tracing (arrow keys plus Space) can be steadier than a pointer drag on a long, twisty path, since each step is deliberate rather than one fast sweep that is easy to overshoot.',
    'The Daily Challenge fixes the same three seeded paths (Easy, Medium, Hard) for every player that day, so it is the cleanest way to compare your recall against the leaderboard rather than against your own random practice rounds.',
  ],
  faq: [
    {
      q: 'How is my score calculated?',
      a: 'Your trace is compared to the real path cell by cell, in order: correctly placed cells count toward accuracy, cells you add past the path\'s length count as mistakes, and any cells you never reach count as missing. Accuracy is the percentage of the path you reproduced correctly, which converts to a round score out of 10 on the standard curve (perfect accuracy scores 10, 50% or worse scores 0). A Perfect rating needs a full, exact retrace — even one extra or wrong cell caps the rating at Great, however high the number scores. Solo sessions run five rounds for up to 50 points; Daily and Friend Challenges run three seeded rounds for up to 30.',
    },
    {
      q: "What's different between Easy, Medium and Hard?",
      a: 'Easy uses a 9×9 grid with a 6-cell path and pulses the starting cell while you trace. Medium steps up to a 12×12 grid with an 8-cell path and no hint. Hard uses a 16×16 grid with an 11-cell path and no hint either — bigger grids also get a longer memorize window before the path fades, since there is simply more to hold in memory.',
    },
    {
      q: 'How does the Daily Challenge work, and when does it reset?',
      a: 'The Daily Challenge is three seeded paths (Easy, Medium, Hard) shared by everyone, generated from a code that changes at midnight UTC, so every player traces identical grids until the next day\'s code rolls in.',
    },
    {
      q: 'Can I play Memory Path offline?',
      a: "Memory Path is one of the games cached by Mettle's installable PWA, so it keeps working offline once you've loaded it — you'll just need a connection again to post a score to the leaderboard.",
    },
    {
      q: 'What are the controls?',
      a: 'Drag across the grid with a mouse or touch to trace, or use the arrow keys to move a cursor and Space to lay each cell — both inputs score through the exact same logic, so use whichever feels steadier.',
    },
    {
      q: 'Is Memory Path free, and do I need an account?',
      a: 'Free, with no download or signup. Your device gets an anonymous ID so your best runs and leaderboard entries stay attached to you across visits, without collecting anything personal.',
    },
  ],
  related: ['color-match', 'balloon-match', 'grid-flash', 'echo-steps'],
};
