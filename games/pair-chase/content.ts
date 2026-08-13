import { GameContent } from '@/types/content';

/**
 * Real content for the Pair Chase game page — written against
 * `games/pair-chase/constants.ts` (`PAIR_CHASE_DIFFICULTY`, `scoreRound`), so
 * every number below is true of the actual game.
 */
export const CONTENT: GameContent = {
  intro: [
    "Pair Chase is a classic face-down card match, built around working memory: the mental sketchpad that holds a handful of things in mind at once. Each round deals a shuffled grid of emoji cards, two of each face; flip two at a time, and a match stays revealed while a mismatch flips back after a beat, leaving you to remember what you saw and where for the next attempt.",
    "Scoring rewards two things at once — how few flips you needed and how quickly you cleared the board. Up to 8 of a round's 10 points come from flip efficiency, scaled against the theoretical minimum of exactly two flips per pair (12 flips for Easy's 6 pairs, 16 for Medium's 8, 20 for Hard's 10). The remaining 2 points reward finishing before the difficulty's time par — Easy's is 35 seconds, Medium's 55, Hard's 80 — with no penalty at all for running past it, since the clock only ever adds to your score, never subtracts.",
    'Board size scales with difficulty too: Easy is a 4×3 grid, Medium a 4×4, and Hard a 5×4 — bigger boards mean more pairs to track, so the time par grows to match rather than punishing you for the extra memory load.',
  ],
  tips: [
    "Open cards in a fixed scan order — left to right, top to bottom — rather than tapping wherever catches your eye. A consistent pattern makes it far easier to recall what you saw two turns ago.",
    "Say the position out loud (or in your head) as you flip: \"fox, top-left\" sticks better than the image alone, especially once the board grows past a handful of cards.",
    "Early in a round, prioritize learning the board over racing the clock — the flip-efficiency component is worth 8 of a round's 10 points, four times the weight of the time bonus, so a few unhurried early flips that you actually remember pay off more than rushing into blind guesses.",
    "When you flip a card that doesn't match anything you've seen yet, that's still useful information — you now know what's under that position even though the turn didn't score a match.",
    "Once you've found a few pairs, use the gaps they leave to help anchor the position of everything still face-down around them.",
    "The Daily Challenge fixes the same three seeded boards (Easy, Medium, Hard) for every player that day, so it's the cleanest way to compare your recall against the leaderboard rather than against your own random practice boards.",
  ],
  faq: [
    {
      q: 'How is my score calculated?',
      a: "Each round scores out of 10: up to 8 points for flip efficiency (how close your total flips were to the theoretical minimum of 2 flips per pair) plus up to 2 points for finishing before the difficulty's time par. Finishing right at par earns no time bonus; finishing later loses none either — the par only ever adds to your score. Solo sessions run three boards at your chosen difficulty for up to 30 points; Daily and Friend Challenges run three seeded boards (Easy, Medium, Hard) for up to 30 as well.",
    },
    {
      q: 'Does the clock run out — do I lose if I take too long?',
      a: "No. Pair Chase has no hard time limit — the clock counts up and only ever shapes your score through the time par, never ends the round. Take as long as you need to find every pair; a slower clear still scores the full 8 points for flip efficiency if your flips were sharp.",
    },
    {
      q: "What's different between Easy, Medium and Hard?",
      a: 'Easy uses a 4×3 grid (6 pairs, 12 cards) with a 35-second time par. Medium steps up to a 4×4 grid (8 pairs, 16 cards) with a 55-second par. Hard uses a 5×4 grid (10 pairs, 20 cards) with an 80-second par — bigger boards get a longer par to match the extra memory load, not a tighter one.',
    },
    {
      q: 'How does the Daily Challenge work, and when does it reset?',
      a: 'The Daily Challenge is three seeded boards (Easy, Medium, Hard) shared by everyone, generated from a code that changes at midnight UTC, so every player matches identical layouts until the next day\'s code rolls in.',
    },
    {
      q: 'Where are my best scores stored?',
      a: "Your personal best session total is stored on your device (there's no account), so it stays attached to this browser across visits. Daily and Friend Challenge scores also post to that challenge's shared leaderboard, tied to an anonymous device ID.",
    },
    {
      q: 'Is Pair Chase free, and do I need an account?',
      a: 'Free, with no download or signup required. Play instantly in the browser — an anonymous device ID keeps your bests and leaderboard entries attached to you without collecting anything personal.',
    },
  ],
  related: ['grid-flash', 'memory-path', 'number-recall', 'echo-steps'],
};
