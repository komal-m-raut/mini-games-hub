import { GameContent } from '@/types/content';

/**
 * Real content for the Math Sprint game page — written against
 * `games/math-sprint/constants.ts` (`MATH_DIFFICULTY`, `calculateMathNet`,
 * `calculateMathScore`), so every number below is true of the actual game.
 */
export const CONTENT: GameContent = {
  intro: [
    "Math Sprint is a 30-second mental arithmetic sprint: one question fills the screen at a time, and you answer it on an on-screen number pad — or your keyboard — racing to solve as many as you can before the clock runs out. Get one wrong and the screen shakes and flashes red, but the question itself doesn't go anywhere: you have to either fix your answer or tap Skip and move on, since a question you're stuck on is worse than one you've let go of.",
    "Scoring rewards accuracy over blind speed. Your net for a round is your correct answers minus half a point for every wrong or skipped one (net = correct − 0.5 × wrong, never below zero), and that net is measured against a par for the difficulty — 20 for Easy, 16 for Medium, 12 for Hard — to produce a round score out of 10 (net ÷ par × 10, clamped to 0–10). A perfect round needs enough net correct answers to clear par, not a flawless streak with zero mistakes.",
    "Difficulty changes both the arithmetic and the pace needed to hit that par: Easy is addition and subtraction with small numbers, Medium folds in times tables alongside larger sums, and Hard mixes bigger addition, subtraction and multiplication with exact division — so par drops as the questions get slower to work out.",
  ],
  tips: [
    "Work left to right on addition and subtraction instead of the column method from paper — reading 47 + 38 as 40 + 30 then 7 + 8 is faster in your head than carrying digits.",
    'Learn the complements to 10 cold (3+7, 4+6, 2+8) — they let you bridge through a multiple of ten instead of counting on, which is the building block for almost every fast mental sum.',
    'Anchor times tables at 5 and 10: for 7×8, knowing 7×10=70 and subtracting 7×2=14 gets you to 56 faster than recalling the fact from scratch.',
    "Hard's division is always exact, so if your first guess is close but not quite right, nudge it up or down by one rather than recalculating — the answer is always a whole number between 3 and 12.",
    "Skip strategically: a wrong answer and a skip cost exactly the same half point, so if a question isn't coming to you, skip it immediately rather than burning seconds staring at it.",
    'The Daily Challenge runs the same three seeded rounds — Easy, then Medium, then Hard — for everyone, so it is the fairest way to compare your mental math speed against the leaderboard.',
  ],
  faq: [
    {
      q: 'How is my score calculated?',
      a: 'Each round scores your net correct answers: correct minus half a point per wrong or skipped answer (net = correct − 0.5 × wrong, never below zero), measured against a par for the difficulty — 20 for Easy, 16 for Medium, 12 for Hard. That gives a round score out of 10 (net ÷ par × 10, clamped to 0–10). Solo sessions and Daily/Friend Challenges are both three 30-second rounds, for up to 30 points total.',
    },
    {
      q: "What's different between Easy, Medium and Hard?",
      a: 'Easy is addition and subtraction with operands from 2 to 20. Medium adds times tables (operands 2–10) on top of larger addition and subtraction (10–50). Hard mixes bigger addition and subtraction (20–99), bigger times tables (3–12), and exact division — and because each question takes longer to work out, par drops as the difficulty rises.',
    },
    {
      q: 'What happens when I get a question wrong?',
      a: "The screen shakes and flashes red, your typed answer clears, and the question stays exactly where it is — you have to answer it correctly or tap Skip to move on. Both a wrong answer and a skip cost half a point off your round's net score.",
    },
    {
      q: 'How does the Daily Challenge work, and when does it reset?',
      a: "The Daily Challenge is three seeded rounds — Easy, then Medium, then Hard — shared by every player, generated from a code that changes at midnight UTC, so everyone solves the identical question sequence until the next day's code takes over.",
    },
    {
      q: 'Can I play Math Sprint offline?',
      a: "Math Sprint is cached by Mettle's installable PWA, so it stays playable offline once you've opened it before — you'll need a connection again to submit a Challenge score to the leaderboard.",
    },
    {
      q: 'Is Math Sprint free, and do I need an account?',
      a: 'Completely free, with no download or signup. An anonymous ID stored on your device keeps your scores and leaderboard entries yours across visits without collecting anything personal.',
    },
  ],
  related: ['stroop-snap', 'type-storm', 'number-recall', 'timing-tap'],
};
