import { GameContent } from '@/types/content';

/**
 * Real content for the Grid Flash game page — written against
 * `games/grid-flash/constants.ts` (`GRID_FLASH_DIFFICULTY`,
 * `calculateGridScore`), so every number below is true of the actual game.
 */
export const CONTENT: GameContent = {
  intro: [
    "Grid Flash trains visuospatial working memory — the same short-term ability psychologists measure with a \"memory span\" test, where you hold a growing set of positions in mind at once rather than a sequence of sounds or words. Each level lights a set of tiles on the grid all at the same time, holds them for a moment, then goes dark; from there you tap the same tiles back, in any order you like. Get the whole set right and the next level adds one more tile to hold.",
    "A round is a ladder, not a single try: you start at 3 lit tiles and climb one tile at a time for as long as you keep clearing levels, but you only get 3 lives per round. A wrong tap costs a life without wiping out the tiles you'd already found correctly on that level, so one slip doesn't sink the whole attempt — three slips do. Your round score comes from the peak level you actually completed (not just reached): each difficulty has a par peak, and scoring runs on a straight line from a peak of 2 (failing the very first level) up to that par, worth a full 10.",
    'Difficulty changes three things together: a bigger grid (4×4 up to 6×6) to search, less time to study the pattern on Hard, and a higher par peak to chase for a top score.',
  ],
  tips: [
    "Chunk the lit tiles into a shape instead of memorizing raw coordinates — an L, a diagonal, a cluster in one corner — a shape is one thing to remember, not four or five separate positions.",
    'Anchor to the grid\'s corners and edges first: tiles near a border are easier to place correctly than tiles buried in the middle, so locate those first and let them frame where the rest must sit.',
    'Scan the grid in the same fixed order every single flash — left to right, top to bottom, say — so your eyes build a habit instead of jumping around and missing a tile in a different corner each time.',
    "Don't fixate on one tile waiting for it to \"sink in\" — a quick, even sweep across the whole board beats staring at a single spot while the rest of the pattern goes unseen.",
    'A wrong tap costs a life but keeps your correct taps on the board, so if you\'re unsure about one tile, tap what you\'re confident about first — you can still recover the level with lives to spare.',
    'The Daily Challenge fixes the same three seeded ladders (Easy, Medium, Hard) for every player that day, with identical patterns level by level, so it is the fairest way to compare your span against the leaderboard.',
  ],
  faq: [
    {
      q: 'How is my score calculated?',
      a: "Each round is a ladder that starts at 3 lit tiles and climbs one tile per level cleared, with 3 lives shared across the whole round. Your round score comes from the highest level you fully completed (\"peak\") — not just reached — on a straight line from a peak of 2 (failing level 3 outright, score 0) up to that difficulty's par peak, worth a full 10; climbing past par still tops out at 10. Par is 7 tiles on Easy, 8 on Medium, and 9 on Hard. Solo sessions and Daily/Friend Challenges are both three rounds, for up to 30 points.",
    },
    {
      q: 'Does the order I tap the tiles in matter?',
      a: "No — a level only cares which tiles you tap, not the order you tap them in. Tap the whole lit set back in whatever order you're confident in.",
    },
    {
      q: 'How do lives work?',
      a: "You get 3 lives per round, not per level. A wrong tap costs one life and briefly flashes red, but it does not erase the correct tiles you'd already tapped on that level — you keep going from where you were. The round ends the moment your third life is spent, or if you clear a level one tile short of lighting the entire grid.",
    },
    {
      q: "What's different between Easy, Medium and Hard?",
      a: 'Easy plays on a 4×4 grid, Medium on 5×5, and Hard on 6×6 — bigger boards to search as difficulty rises. Easy and Medium both flash the pattern for 1200ms; Hard cuts that to 900ms on top of the bigger board. Par peak (the level that scores a full 10) also rises with difficulty: 7 tiles on Easy, 8 on Medium, 9 on Hard.',
    },
    {
      q: 'How does the Daily Challenge work, and when does it reset?',
      a: "The Daily Challenge is three seeded ladders (Easy, Medium, Hard) shared by everyone, generated from a code that changes at midnight UTC — every level's pattern is identical for every player that day, so it's a fair, direct comparison until the next day's code rolls in.",
    },
    {
      q: 'Is Grid Flash free, and do I need an account?',
      a: 'Free to play, with no download or signup. Your device gets an anonymous ID so your best runs and leaderboard entries stay yours across visits, without collecting anything personal — your best session is stored on-device.',
    },
  ],
  related: ['memory-path', 'number-recall', 'pair-chase', 'echo-steps'],
};
