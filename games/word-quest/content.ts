import { GameContent } from '@/types/content';

/**
 * Real content for the Word Quest game page — written against the actual
 * numbers in `games/word-quest/engine.ts` and `constants.ts`
 * (`SOLVE_SCORE`, `FAIL_SCORE_CAP`, `MAX_GUESSES`, `COMMON_SLICE_SIZE`), so
 * every figure below matches the game exactly.
 */
export const CONTENT: GameContent = {
  intro: [
    "Word Quest is a daily five-letter word game built on constraint propagation: every guess is scored letter by letter, and each colour you get back rules something out or locks something in, so the puzzle gets easier with every try even when you're still wrong. A green tile means that letter is correct and in the right spot; yellow means the letter is in the word but at a different position; a dark tile means the letter isn't in the word at all — or, if it appears elsewhere in your guess too, that there are no more copies of it left to place. That last rule matters: with repeated letters, colours are capped by how many copies of that letter the answer actually has, not by how many times you type it.",
    "You get six guesses. Solve it on your first try and you bank a full 10 points; each guess after that is worth a little less (9, 7.5, 6, 4.5, then 3 for a six-guess solve) — the curve rewards early, confident solves without making a hard-fought sixth-guess win feel worthless. Run out of guesses and you still bank partial credit from your best single row: 0.3 points per green tile and 0.15 per yellow, capped at 2.5, so a near-miss guess is worth something even in defeat.",
    "Play solo for a single word at your own pace, or take on the Daily Challenge — three words seeded from the day's date so every player worldwide solves the identical sequence — or send a Friend Challenge link and compare scores directly.",
  ],
  tips: [
    "Your opener matters more than any other guess, because it's the only one that can't be informed by feedback yet. Two schools of thought both work: an all-vowel-forward word like ADIEU maximises how many vowels you place in one shot, while a balanced word like SLATE mixes common vowels and consonants for broader coverage — either beats guessing a rare or repeated-letter word first.",
    "Guess to eliminate, not to win. Especially on guesses two and three, a word that tests several untried letters — even if you don't expect it to be the answer — narrows the field faster than a guess that only confirms what a green tile already told you.",
    "Watch for duplicate letters carefully. If a letter shows yellow or green once but you suspect the word has two copies of it, a follow-up guess with that letter in two different spots is the only way to find out — the game's tile colours are always capped by how many copies actually remain unaccounted for.",
    "A green tile locks that position — don't waste a future guess testing a different letter there just to double-check. Trust it and spend your remaining guesses narrowing the letters you're still unsure about.",
    'A tile that comes back dark doesn\'t always mean "never guess this letter again" if it already appeared elsewhere in the same guess as green or yellow — it can mean "no more copies," not "no copies."',
    "The Daily Challenge runs the same three words for everyone, seeded by the UTC date, so it's the fairest way to compare your solve against the leaderboard — round one always draws from the game's most common word list, so it's the gentlest of the three.",
  ],
  faq: [
    {
      q: 'How is my score calculated?',
      a: "Solving the word scores by how many guesses it took: 10 points for a first-guess solve, then 9, 7.5, 6, 4.5, and 3 for guesses two through six. If you run out of guesses, you still earn partial credit from your single best row: 0.3 points per green tile plus 0.15 per yellow, capped at 2.5 points — so a good failed attempt is always worth less than any actual solve. Solo is one word (out of 10); the Daily and Friend Challenges are three words (out of 30).",
    },
    {
      q: 'Is the Daily Challenge the same word for everyone?',
      a: "Yes — all three of the day's Challenge words are seeded from the UTC date, so every player worldwide gets the identical sequence until the date rolls over at midnight UTC. A Friend Challenge works the same way, seeded from its own shareable code instead of the date, so anyone who opens your link plays your exact three words.",
    },
    {
      q: 'Can a letter appear more than once in the answer?',
      a: "Yes, and the tile colours account for it precisely: correct-position matches are counted first, then the remaining, unmatched copies of each letter are what's left to mark yellow. So if a word has one of a letter and you guess it twice, at most one tile can show yellow or green for it — the other comes back dark, meaning \"no more copies left,\" not \"wrong letter.\"",
    },
    {
      q: "What dictionary does Word Quest use, and why does it sometimes accept words I don't recognise?",
      a: "Guesses are checked against a large list of real English words — several thousand entries, built from a classic public-domain dictionary — while answers are drawn from a much smaller, hand-curated list of everyday words. That means the guess list is intentionally generous: it will occasionally accept a genuinely obscure or old-fashioned word rather than reject a valid one, which we think is the right trade-off, but it does mean \"not in word list\" isn't a perfect vocabulary test in either direction.",
    },
    {
      q: 'What happens if I refresh the page mid-game?',
      a: "Your board resets — Word Quest doesn't save an in-progress game, so refreshing (or closing the tab) starts that round over with a fresh word. Completed rounds, your best solo score, and challenge leaderboard entries are unaffected.",
    },
    {
      q: 'Is Word Quest free to play?',
      a: 'Completely free, with no download or signup. Your device gets an anonymous ID so your best score and challenge leaderboard entries stay yours across visits, without collecting anything personal.',
    },
  ],
  related: ['type-storm', 'number-recall', 'math-sprint', 'stroop-snap'],
};
