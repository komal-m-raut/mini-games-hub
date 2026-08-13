import { GameContent } from '@/types/content';

/**
 * Real content for the Bullseye game page — written against
 * `games/bullseye/constants.ts` (`BULLSEYE_DIFFICULTY`, `dartAccuracy`,
 * `RING_THRESHOLDS`, `CELEBRATE_ACCURACY`) and `games/bullseye/oscillator.ts`,
 * so every number below is true of the actual game.
 */
export const CONTENT: GameContent = {
  intro: [
    "Bullseye turns one throw into two separate timing reads: a vertical aim line sweeps up and down first, and the instant you lock it, a horizontal line takes over and sweeps left to right. Tap or press Space to freeze each one — the vertical read fixes your dart's height, the horizontal read fixes its width, and together the two compose a single point on the board. No memory and no dragging, just two reactions in a row that decide where the dart lands.",
    "Even a perfectly-timed double lock doesn't land dead centre every time — the difficulty adds a small seeded wobble to the spot you locked, scattering it a little inside a disc around your read the same way a real dart drifts off the exact point your hand released it. Accuracy is then just distance from the board's true centre: 100 minus how far off you landed as a percentage of the board's radius, clamped to 0–100, so dead centre scores 100 and anything at or beyond the outer ring scores 0. A round is 5 darts; the round's score is the mean of those 5 accuracies mapped onto the site's usual 0–10 curve.",
    "Difficulty speeds up both aim lines and widens the wobble disc, and Hard adds a further twist: the sweep's pace itself drifts a little faster or slower on every half-swing, so you can't just count a rhythm and tap on beat — you have to re-read the speed every time.",
  ],
  tips: [
    "Watch a full swing — centre to one extreme and back — before you lock anything. Both aim lines start at a seeded phase, so the first half-second can be mid-swing in either direction, and locking blind wastes a read you could have timed properly.",
    'Lock at the apex, not mid-flight, if you want a specific spot: the line moves slowest right as it turns around at the top/bottom (or left/right) edge, so that instant is the most forgiving moment to time a precise value, while the middle of the swing is where it moves fastest and timing is least forgiving.',
    "On Hard, don't trust the pace you clocked on the previous half-swing — the drift changes it by up to 15% every time the line turns around, so re-judge the speed fresh on every leg instead of counting a beat.",
    "Aim for the board's centre-mass rather than chasing an exact pixel — the difficulty wobble scatters your locked point by a couple of percent of the board's radius regardless, so a confident read near the middle beats an over-careful one that's still only nominally more precise once the wobble lands.",
    'Ring labels (BULLSEYE, 50, 25, 10, 5) are cosmetic call-outs, not a separate scoring system — your real score always comes from the continuous accuracy formula, so don\'t chase a ring boundary; chase the centre.',
    'The Daily Challenge throws the same 15 darts (5 per round, Easy → Medium → Hard) at everyone, wobble included, so it is the fairest way to compare your reads against the leaderboard rather than against your own variable practice rounds.',
  ],
  faq: [
    {
      q: 'How is my score calculated?',
      a: "Each dart's accuracy is 100 minus the distance from the board's exact centre to where it landed, expressed as a percentage of the board's radius, clamped to 0–100 — dead centre scores 100, the outer ring's edge scores 0, and anything beyond the board scores 0 too. A round is 5 darts; the round score is the mean of those 5 accuracies mapped onto the same 0–10 curve every game here uses (perfect accuracy scores 10, 50% or worse scores 0). Both Solo and every Challenge run 3 rounds — 15 darts, 30 points max either way.",
    },
    {
      q: 'Why does my dart land a little off from where I locked my aim?',
      a: "That's the wobble, and it's deliberate — a real dart never lands exactly where the hand released it. After you lock the vertical and horizontal reads, the difficulty adds a small random offset inside a disc around that point: about 2% of the board's radius on Easy, 3.5% on Medium, 5% on Hard. It's honest scatter, not a penalty for bad timing — a dead-centre double lock can still drift into the next ring out.",
    },
    {
      q: "What's different between Easy, Medium and Hard?",
      a: "Easy sweeps both aim lines slowly (0.8 full swings a second) with the smallest wobble. Medium speeds the sweep to 1.15Hz and widens the wobble a little. Hard speeds it up further still to 1.5Hz, widens the wobble the most, and adds drift: each half-swing's speed varies by up to 15% from the last, so the pace itself keeps shifting instead of staying predictable.",
    },
    {
      q: 'Is the wobble fair in a Challenge?',
      a: 'Yes — every seeded value in a Challenge round (both aim lines\' starting points, Hard\'s drift, and all 5 darts\' wobble offsets) comes from the same code, so two players on an identical challenge link face byte-for-byte identical throws. The only thing that differs is your timing.',
    },
    {
      q: 'How does the Daily Challenge work, and when does it reset?',
      a: "The Daily Challenge is 3 seeded rounds (Easy, Medium, Hard — 15 darts total) shared by every player, generated from a code that changes at midnight UTC, so everyone throws against identical conditions until the next day's code takes over.",
    },
    {
      q: 'What are the controls, and is Bullseye free?',
      a: 'Tap or click the board, or press Space, to lock each aim line the instant it reads where you want. Completely free, no download or signup — your device holds an anonymous ID so your scores and leaderboard entries carry across visits without collecting anything personal.',
    },
  ],
  related: ['timing-tap', 'tap-frenzy', 'balloon-match', 'perfect-pour'],
};
