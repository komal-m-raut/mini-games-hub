import { GameContent } from '@/types/content';

/**
 * Real content for the Number Recall game page — written against
 * `games/number-recall/constants.ts` (`RECALL_DIFFICULTY`, `getDisplayMs`,
 * `scoreRound`), so every number below is true of the actual game.
 */
export const CONTENT: GameContent = {
  intro: [
    "Number Recall tests digit span — the classic measure of short-term working memory psychologists use, where a typical adult can reliably hold about seven digits (plus or minus two) in mind at once. A number flashes large on screen, then disappears completely; you type it straight back on an on-screen pad (or your keyboard), and if you get it exactly right, the ladder climbs one digit longer and shows you another. Get one wrong, and that climb is over for the round.",
    "Your round score is built from how far up that ladder you got before a miss, not from any single number: reaching your difficulty's par length scores a full 10, and missing the very first number scores 0, with everything in between scaled evenly across the digits climbed. A wrong digit alone never ends anything on its own — entered digits stay fully visible as you type, so you can check and correct them freely, and only pressing Submit locks in a wrong answer.",
    "Difficulty sets both where the ladder starts and how long each number stays on screen: Easy and Medium start at 3 and 4 digits with the number visible for 900ms plus 220ms per digit, while Hard starts at 5 digits and trims that to 700ms plus 160ms per digit — a shorter glance to match its higher floor.",
  ],
  tips: [
    "Chunk the digits into small groups of two or three, the way you'd read a phone number, rather than trying to hold every single digit as its own separate item — three chunks are far easier to keep straight than seven loose digits.",
    "Say the number to yourself as it appears, even silently — rehearsing it verbally keeps it alive in working memory longer than a single visual glance does, especially once the ladder climbs past five or six digits.",
    "Look for a shape in the number as you read it — a run that climbs, a pair that repeats, a jump that stands out — a pattern is easier to hold onto than a string of unrelated digits.",
    "Nothing locks in until you press Submit, and every digit you've typed stays fully visible, not masked — if a digit feels wrong the moment you tap it, backspace and fix it before submitting rather than guessing and hoping.",
    "On Hard the number is on screen for less time overall, but you still get more time as the ladder climbs — 160ms extra per digit — so don't rush the early, short numbers expecting the later ones to be just as quick.",
    'The Daily Challenge runs the same three seeded ladders (Easy, then Medium, then Hard) for every player that day, so it is the fairest way to compare your digit span against the leaderboard rather than against your own variable practice runs.',
  ],
  faq: [
    {
      q: 'How is my score calculated?',
      a: "Each round is scored from the longest number you correctly recalled before a miss. Easy and Medium start their ladder at 3 and 4 digits and reach a perfect 10 at 7 and 9 digits; Hard starts at 5 and tops out at 11. Missing the very first number scores 0, reaching that difficulty's par length scores a full 10, and everything in between is scaled evenly across the digits climbed. A solo session is three rounds at your chosen difficulty; a Daily or Friend Challenge is three seeded rounds — Easy, then Medium, then Hard — so every score is comparable across players.",
    },
    {
      q: "What's different between Easy, Medium and Hard?",
      a: "Easy starts at 3 digits and Medium at 4, both showing the number for 900ms plus 220ms per digit. Hard starts higher at 5 digits and shows each number for only 700ms plus 160ms per digit — a shorter look to go with its higher floor, though every difficulty still gets more time on screen as the ladder climbs.",
    },
    {
      q: 'Do the numbers ever start with a zero?',
      a: "Never — the first digit of every number is always 1 through 9, exactly like a real phone number or PIN never opens with a leading zero. Every digit after the first can be anything from 0 to 9.",
    },
    {
      q: 'What happens if I type a wrong digit?',
      a: "Nothing, until you submit. Every digit you enter stays fully visible as you type, so a typo is easy to spot — backspace it out and keep going. The round only ends when you press Submit with digits that don't match the number you were shown.",
    },
    {
      q: 'How does the Daily Challenge work, and when does it reset?',
      a: "The Daily Challenge is three seeded ladders (Easy, Medium, Hard) shared by every player, generated from a code that changes at midnight UTC, so everyone climbs identical numbers until the next day's code arrives.",
    },
    {
      q: 'Is Number Recall free, and do I need an account?',
      a: "Free to play, with no download or signup. Your best session is kept on your own device via an anonymous ID, so it carries across visits without collecting anything personal.",
    },
  ],
  related: ['grid-flash', 'memory-path', 'math-sprint', 'pair-chase'],
};
