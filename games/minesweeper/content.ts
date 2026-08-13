import { GameContent } from '@/types/content';

/**
 * Real content for the Minesweeper game page — written against
 * `games/minesweeper/constants.ts` (`MINESWEEPER_DIFFICULTY`, `PAR_SECONDS`,
 * `scoreBoard`) and `games/minesweeper/challenge.ts`, so every number below
 * is true of the actual game.
 */
export const CONTENT: GameContent = {
  intro: [
    "Minesweeper is the classic logic puzzle: a grid hides a fixed number of mines, and every safe cell you reveal shows a number counting how many mines sit in its 8 neighbouring cells. There is no guessing required to win — every clear board can be solved from its numbers alone, by cross-referencing overlapping clues until you can prove a cell is safe or a mine before you touch it. Flag the cells you're certain are mines, reveal the ones you're certain are safe, and clear every non-mine cell to win the round.",
    "Solo play always gives you a safe opening: your very first tap on a fresh board can never be a mine, and neither can any of its 8 neighbours — the mines aren't placed until that first click, specifically so they avoid it. A round scores on a 0–10 scale: a win banks a floor of 6 points plus up to 4 more for beating the difficulty's par time, so a slow, careful clear still scores respectably and a fast one tops out at 10. A loss still earns partial credit — 5 points times the fraction of safe cells you'd correctly mapped out before hitting a mine — so a near-clear that ends badly beats an early blind click.",
    "Difficulty changes both board size and mine density: Easy is a forgiving 9×9 grid with 10 mines, Medium steps up to 12×12 with 26, and Hard runs a tall 12×16 field with 45 mines — sized to stay scrollable on a portrait phone screen rather than spreading wide.",
  ],
  tips: [
    "On a fresh board, work outward from the edge of the open zero-region — the numbers bordering that blank area are your first real clues, long before you've touched anything else.",
    "Learn to spot the 1-2-1 pattern (three numbers in a row with mines tucked symmetrically behind the two 1s) and the 1-2-2-1 pattern — both have a fixed, provable mine layout every time they appear, so you can flag them on sight instead of re-deriving them.",
    'Only flag a cell when you can actually prove it\'s a mine — a wrong flag doesn\'t just block that cell, it also breaks chording on every revealed number touching it, since chording only fires when a number\'s flagged-neighbour count matches its own.',
    'Chord a revealed number (tap it once its adjacent flag count matches the number itself) to reveal all its remaining neighbours in one move — much faster than clicking each one individually, but exactly as risky as your flags are accurate.',
    "Leave corners and fully-enclosed pockets for last: they border the fewest revealed numbers, so they usually can't be solved with certainty until most of the rest of the board is open and feeding you more clues.",
    'The Daily Challenge runs the same three seeded boards (Easy, Medium, Hard) for everyone, with an identical mine field and opening region for every player that day — the fairest way to compare your solving speed on the leaderboard.',
  ],
  faq: [
    {
      q: 'How is my score calculated?',
      a: "A win scores a floor of 6 points plus up to 4 more for beating the difficulty's par time — 60s on Easy, 150s on Medium, 240s on Hard — worth the full 4-point bonus (10 total) at or under par, shrinking toward the 6-point floor the longer it takes. A loss still earns partial credit: 5 times the fraction of safe (non-mine) cells you had correctly revealed before hitting a mine, so a near-clear that ends in a mine beats an early blind click. Solo sessions and Daily/Friend Challenges are both three boards (Easy, Medium, Hard), for up to 30 points.",
    },
    {
      q: 'What is chording, and can it lose the game?',
      a: "Chording is tapping an already-revealed number once you've flagged exactly as many of its neighbours as the number says — it reveals every remaining unflagged neighbour in one move instead of clicking each individually. Yes, it can lose the game: chording only checks that your flag *count* matches the number, not that every flag is on an actual mine, so a wrong flag can let chording open a real mine among the cells it treats as \"confirmed safe.\"",
    },
    {
      q: 'How do I flag a mine on a touchscreen?',
      a: "Long-press a hidden cell for under half a second to flag it, exactly like a desktop right-click. There's also a flag-mode toggle (🚩/⛏️) above the board for pure-touch play — switch it on and a plain tap flags instead of revealing, no long-press needed; switch it back off to dig again.",
    },
    {
      q: 'Can a Daily or Friend Challenge board kill me on the very first tap?',
      a: "No. Challenge boards use a fixed mine field — identical for every player on that code — rather than shifting mines away from your first click the way solo does. Instead, every challenge board opens with a safe zero-region already pre-revealed before you touch anything, seeded from the same code, so every player starts from an identical, already-partly-open board with nothing to click blind.",
    },
    {
      q: 'How does the Daily Challenge work, and when does it reset?',
      a: 'The Daily Challenge is three seeded boards (Easy, Medium, Hard) shared by everyone, generated from a code that changes at midnight UTC — the mine field and pre-revealed opening region are identical for every player that day, so it is a fair, direct comparison until the next day\'s code rolls in.',
    },
    {
      q: 'Is Minesweeper free, and do I need an account?',
      a: 'Free to play, with no download or signup. Your device gets an anonymous ID so your best runs and leaderboard entries stay yours across visits, without collecting anything personal — your best session is stored on-device.',
    },
  ],
  related: ['2048', 'snake', 'grid-flash', 'xo-shift'],
};
