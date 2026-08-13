import { GameContent } from '@/types/content';

/**
 * Real content for the Time Sense game page — written against
 * `games/time-sense/constants.ts` (`TIME_SENSE_DIFFICULTY`, `makeDuration`,
 * `DECOY_HZ`) and `utils/accuracy.ts` / `utils/scoring.ts`, so every number
 * below is true of the actual game.
 */
export const CONTENT: GameContent = {
  intro: [
    "Time Sense tests your internal clock — the sense that lets you guess how long a minute has passed without checking a watch. Each round starts by showing you a duration: a bar fills from empty to full over an exact stretch of time, with the number of seconds ticking up alongside it, marked by a soft tone at the start and a firmer one the instant it completes. The bar then resets, and it's your turn — press and hold a button, trying to release at the moment you believe matches what you just watched.",
    "Your accuracy is the gap between the duration you held and the one you were shown, measured as a percentage of the target — a 240ms miss on a 2.40-second target and the same 240ms miss on a 6-second target don't score the same, because the second is a much smaller fraction of its target. This is scalar timing: real interval estimation gets proportionally harder to nail as the interval grows, and Time Sense's scoring reflects that honestly instead of treating every millisecond as equally costly everywhere. That accuracy feeds the same scoring curve as every game here: 100% accuracy is a full 10, 50% accuracy or worse is a 0, rounded to two decimal places.",
    "Difficulty controls both the target range and how much feedback you get while holding. Easy draws from a short 1.50–3.00 second range and shows a soft glow that grows the longer you hold — reassurance without numbers. Medium stretches to 1.00–4.50 seconds and removes even that glow, leaving nothing but the pressed button and your own count. Hard stretches further still, to 2.00–6.00 seconds, and adds a background pulse breathing at a fixed, wrong tempo, built specifically to throw off whatever rhythm you were holding in your head.",
  ],
  tips: [
    'Count subvocally in a steady sub-second rhythm ("one-and, two-and…") rather than watching the bar — a spoken count survives the jump from SHOW to RECREATE far better than a purely visual memory of how full the bar looked.',
    "On Easy, resist the urge to stare at the bar as it fills — the whole point of the game is to feel the duration, and reading it off the bar just trains you to judge distance, not time.",
    'Anchor your count to something with a fixed tempo you already know by feel — your own resting pulse, or the beat of a song you can hum silently — rather than inventing a new internal metronome for every round.',
    "Hard's background pulse breathes at a fixed 0.8Hz — about once every 1.25 seconds — a tempo picked specifically because it doesn't line up with typical target durations; don't let your count sync to it.",
    'Because errors are scored as a percentage of the target, the same slip in milliseconds costs you far more on a short Easy round than on a long Hard one — precision matters most when the target is small.',
    'The Daily Challenge locks every player into the same three seeded durations (Easy, Medium, Hard) for the day, so it is the fairest way to compare your internal clock against the leaderboard.',
  ],
  faq: [
    {
      q: 'How is my score calculated?',
      a: "Each round scores your accuracy as 100 minus how far off your held duration was, expressed as a percentage of the target — so a 240ms miss on a 2.40s target costs more accuracy than the same 240ms miss on a 6-second one. That accuracy converts to a round score out of 10 on the same curve every game here uses: full accuracy scores 10, 50% accuracy or worse scores 0, and you lose about a point for every 5% you miss by, to two decimal places. A solo session is five rounds for up to 50 points; a Daily or Friend Challenge is three seeded rounds for up to 30.",
    },
    {
      q: "What's different between Easy, Medium and Hard?",
      a: 'The target duration range widens as difficulty rises — Easy draws from 1.50–3.00 seconds, Medium from 1.00–4.50 seconds, and Hard from 2.00–6.00 seconds. Feedback also drops away: Easy shows a soft glow that grows the longer you hold (no numbers), Medium removes that glow entirely and gives you nothing but the pressed button, and Hard keeps that same silence while adding a background pulse breathing at a fixed, wrong tempo to fight your internal count.',
    },
    {
      q: "Why don't Medium and Hard show any progress while I'm holding?",
      a: "Because the whole test is whether you can feel a duration, not whether you can read a progress bar. Any live readout during the hold — a fill, a number, a countdown — would let you time your release off the display instead of your own sense of time, which defeats the point of the game.",
    },
    {
      q: 'What is the decoy pulse on Hard, and does it turn off for reduced motion?',
      a: "On Hard, the stage background breathes at a fixed 0.8Hz — about one pulse every 1.25 seconds — deliberately out of step with the target durations, to fight any rhythm you're trying to hold in your head. If your system has reduced motion turned on, the pulse is disabled outright rather than just slowed down, so Hard's difficulty comes entirely from the missing feedback, not from an animation some players wouldn't even see.",
    },
    {
      q: 'How does the Daily Challenge work, and when does it reset?',
      a: "The Daily Challenge is three seeded rounds shared by every player, built from a code that changes at midnight UTC, so it is the same three durations for everyone until the next day's code takes over.",
    },
    {
      q: 'Is Time Sense free, and do I need an account?',
      a: 'Yes, entirely free with no signup. An anonymous ID on your device keeps your scores yours between visits, and your best solo session is stored locally on that device; nothing personal is collected.',
    },
  ],
  related: ['perfect-pour', 'balloon-match', 'timing-tap', 'echo-ear'],
};
