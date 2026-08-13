import { GameContent } from '@/types/content';

/**
 * Real content for the Echo Ear game page — written against
 * `games/echo-ear/constants.ts` (`ECHO_DIFFICULTY`, `centsBetween`,
 * `accuracyFromCents`), so every number below is true of the actual game.
 */
export const CONTENT: GameContent = {
  intro: [
    "Echo Ear trains relative pitch — the skill of holding a tone in your mind for a few seconds, then recreating it purely by ear. Each round plays a single tone, hides it, and hands you a vertical slider spanning two octaves (220 Hz to 880 Hz). Moving the slider plays back its current pitch as you drag, so you're never matching in silence — you're comparing what you hear against what you remember, the same way a singer finds a note without a piano.",
    "Musicians measure pitch distance in cents (100 cents to a semitone, 1200 to an octave), and that's exactly what Echo Ear scores on: the cents gap between your slider and the target. Most people can land within a semitone — 100 cents — with a little practice, which is a genuinely good result here, not just a participation score. That cents error converts to an accuracy percentage, and from there to the site's usual score out of 10.",
    "Difficulty controls two things at once: how many times you're allowed to re-hear the target, and how unforgiving the scoring curve is. Accuracy reaches zero at 800 cents off on Easy, 600 on Medium, and just 400 — a bit over three semitones — on Hard.",
  ],
  tips: [
    "Try humming or singing the target tone back to yourself right after it plays — holding a pitch in your own voice is often easier than holding it purely in your head, and you can compare the slider's blip against your own hum.",
    'Bracket first, then bisect: drag to somewhere you\'re sure is too high and somewhere you\'re sure is too low, then keep splitting the difference rather than hunting blindly from one end.',
    "The slider plays a short blip every time it moves — use that rhythmically, tapping the arrow keys and listening to each new pitch, rather than dragging continuously and trying to catch the right moment.",
    'Your first instinct after listening is usually closer than you think — a slider invites endless second-guessing, but the biggest misses tend to come from over-correcting away from an already-good guess.',
    "On Medium and Hard, spend your one replay (or your only listen, on Hard) wisely — resist the urge to hit Play immediately, and instead take a second to actually hold the tone in your head first.",
    'The Daily Challenge locks in the same three seeded pitches (Easy, Medium, Hard) for every player, so it is the fairest way to compare your ear against the leaderboard that day.',
  ],
  faq: [
    {
      q: 'How is my score calculated?',
      a: "Your guess is compared to the target in cents (the standard musical unit of pitch distance — 100 cents per semitone), giving a cents error. That converts to accuracy — 100% at a perfect match, dropping to 0% once the error passes a threshold set by difficulty: 800 cents on Easy, 600 on Medium, 400 on Hard. Accuracy then maps to a round score out of 10 on the same curve every game here uses. Solo sessions are 5 rounds; Daily and Friend Challenges are always three seeded rounds for up to 30 points.",
    },
    {
      q: "What's different between Easy, Medium and Hard?",
      a: 'Difficulty changes two things together: how many times you can replay the target tone (3 extra replays on Easy, 1 on Medium, 0 on Hard — just the one listen), and how tightly your guess has to land to score well, from a forgiving 800-cent window on Easy down to a strict 400-cent window on Hard.',
    },
    {
      q: 'The site is muted and I hear nothing — is that a bug?',
      a: "No — Echo Ear respects the site-wide sound toggle like every other game here, and since this game is entirely about matching a pitch by ear, a muted tab genuinely can't be played. Unmute using the speaker icon to hear the target tone and the slider's live blips.",
    },
    {
      q: 'Do I need headphones?',
      a: "No, but they help. Small laptop and phone speakers can colour or muffle a tone in ways headphones don't, so if you're finding a difficulty harder than it should be, headphones are worth trying before you blame your ear.",
    },
    {
      q: 'How does the Daily Challenge work, and when does it reset?',
      a: 'The Daily Challenge is three seeded pitches (Easy, Medium, Hard) shared by every player, generated from a code that changes at midnight UTC, so everyone matches identical tones until the next day\'s code arrives.',
    },
    {
      q: 'Is Echo Ear free, and do I need an account?',
      a: 'Free to play, with no download or signup. Personal bests are stored on your device, and an anonymous ID keeps your Challenge scores and leaderboard entries yours across visits.',
    },
  ],
  related: ['echo-steps', 'color-match', 'time-sense', 'perfect-pour'],
};
