import { GameContent } from '@/types/content';

/**
 * Real content for the Type Storm game page — written against
 * `games/type-storm/constants.ts` (`TYPE_DIFFICULTY`, `scoreRound`), so
 * every number below is true of the actual game.
 */
export const CONTENT: GameContent = {
  intro: [
    "Type Storm is a 30-second typing speed test: one word fills the screen at a time, with the next two queued up dimly underneath so you can read ahead before you get there. Type it out on your keyboard and press Space or Enter to submit — get it exactly right and it's banked, get it wrong and the field shakes, clears, and hands you the very same word again rather than letting you move on with a mistake on the board.",
    "Your speed is measured the way real typing tests measure it: five typed characters count as one \"word\", so words per minute is (characters banked from correct words ÷ 5) over the 30-second round. But raw speed alone isn't the score — accuracy is banked characters divided by every character your keystrokes actually added, and it multiplies straight into the result: score = (WPM × accuracy) ÷ 6, clamped to 0–10. Sixty effective words per minute at perfect accuracy is exactly a 10; half your accuracy halves your score at the same WPM.",
    "Difficulty changes the word length you're racing through: Easy draws from words 3–5 letters, Medium from 4–7, and Hard from 5–9 — so the words themselves get longer and the keystrokes-per-word climb as you go up the ladder.",
  ],
  tips: [
    "Read one word ahead while your fingers finish the current one — the next two words are already sitting in the queue below, dimmed but fully visible, precisely so you never have to type blind.",
    "There's no rewarding \"type through it\" here: a wrong submission doesn't advance you, it just clears the field and gives you the same word again, so fixing a typo before you hit Space is always faster than submitting and retrying.",
    'Favor a steady rhythm over bursts of speed — accuracy multiplies directly into your score, so a fast round full of wrong submissions scores worse than a measured one that rarely misses.',
    'Keep your fingers anchored on home row between words; reaching for a key from a resting position is faster and more accurate than hunting from wherever your hands happen to have drifted.',
    "On Hard, the longer words mean more keystrokes riding on a single submission — a single slip costs you the whole word's worth of progress, so slow down fractionally as the words get longer rather than keeping a flat pace.",
    'The Daily Challenge runs the same three seeded rounds — Easy, then Medium, then Hard — for everyone, so it is the fairest way to compare your typing speed against the leaderboard.',
  ],
  faq: [
    {
      q: 'How is my score calculated?',
      a: 'Every correctly-submitted word banks its letters (plus one for the space/enter that submitted it) toward "correct characters". WPM is correct characters ÷ 5, scaled to the 30-second round. Accuracy is correct characters ÷ every character your keystrokes actually typed, capped at 100%. The round score is (WPM × accuracy) ÷ 6, clamped to 0–10 — so 60 effective WPM at perfect accuracy is a 10, and half your accuracy halves your score at the same WPM.',
    },
    {
      q: 'Does backspacing cost me anything?',
      a: "No. Backspacing to fix a typo before you submit costs nothing — it's simply not counted as a keystroke that added a character. Only a wrong SUBMISSION (pressing Space or Enter on a word that doesn't match) and a skip affect your tally, both by leaving that word's characters unbanked.",
    },
    {
      q: "What's different between Easy, Medium and Hard?",
      a: 'Only the word length: Easy draws from words 3–5 letters long, Medium from 4–7, and Hard from 5–9. The words themselves are ordinary vocabulary at every difficulty — the ladder is entirely about how many keystrokes each word costs.',
    },
    {
      q: 'Why does typing feel slower on my phone?',
      a: "Type Storm is built around a physical keyboard — that's genuinely where it plays best, and a touch keyboard's autocorrect, key travel and smaller hit targets will cost you real WPM by comparison. It's still fully playable on a touch device; the difficulty screen just flags this so the slower pace doesn't come as a surprise.",
    },
    {
      q: 'How does the Daily Challenge work, and when does it reset?',
      a: "The Daily Challenge is three seeded rounds — Easy, then Medium, then Hard — shared by every player, generated from a code that changes at midnight UTC, so everyone types the identical word sequence until the next day's code takes over.",
    },
    {
      q: 'Is Type Storm free, and are my best scores saved?',
      a: 'Completely free, with no download or signup. Your best session total is kept on-device so it persists across visits, and an anonymous ID lets your Challenge scores land on the shared leaderboard without collecting anything personal.',
    },
  ],
  related: ['math-sprint', 'stroop-snap', 'tap-frenzy', 'number-recall'],
};
