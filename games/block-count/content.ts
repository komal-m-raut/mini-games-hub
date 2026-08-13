import { GameContent } from '@/types/content';

/**
 * Real content for the Block Count game page — written against
 * `games/block-count/constants.ts` (`BLOCK_DIFFICULTY`, `scoreGuess`), so
 * every number below is true of the actual game.
 */
export const CONTENT: GameContent = {
  intro: [
    "Block Count is built on a real limit of human vision: we can glance at a small handful of things — usually around four — and know the count instantly, no counting required. That instinct is called subitizing. Push past it and the brain has to switch to actually counting, one item at a time, which is exactly what a loose crowd of drifting blocks forces you to do. Each round sweeps a mix of red target blocks and grey, orange, pink or crimson decoys across the stage over a few seconds, entering from the left and exiting right — your job is to track only the red ones and land on the right total before they're gone.",
    "Scoring rewards a genuinely close count, not just a perfect one: land on the exact number and the round scores a full 10. Miss by a little and accuracy is measured as the relative size of the miss against the true count — one block off on a sweep of 12 reds costs much less than one block off on a sweep of 6 — which then converts to a score out of 10, capped just under a perfect score so only an exact count ever reaches the full 10.",
    'Difficulty raises the red count, adds more and closer-hued decoys, speeds up the sweep, and — on Hard — lets blocks cluster and overlap, while the true reds always keep a faint glow so the round stays hard, never unfair.',
  ],
  tips: [
    "Don't try to track every block individually — count in small clusters of two or three at a time as they cross, the way you'd instantly recognise a group of three dots without counting them one by one.",
    'Pick a "frontier" — a vertical strip somewhere in the middle of the stage — and count red blocks only as they cross it, left to right, instead of trying to watch the whole width at once.',
    'Ignore decoy colour entirely and judge by brightness instead: the true red keeps a faint glow and stays visually distinct from every decoy hue, even the crimson-adjacent ones on Hard.',
    "Once you've committed to a count, don't try to recount from memory after the sweep ends — the number pad has no time limit, so take a breath, trust your running tally, and enter it.",
    'On Hard, blocks are allowed to cluster and overlap — expect some reds to be briefly hidden behind a decoy, and count with that in mind rather than assuming every block is fully visible the whole time it crosses.',
    'The Daily Challenge runs the same three seeded sweeps (Easy, Medium, Hard) for everyone, so it is the fairest way to compare your count against the leaderboard rather than against your own variable practice rounds.',
  ],
  faq: [
    {
      q: 'How is my score calculated?',
      a: "An exact guess always scores the full 10. Otherwise, accuracy is the relative size of your miss against the true count — |your guess − actual| ÷ actual — so the same one-block miss costs less on a sweep with more reds than on one with fewer. That accuracy converts to a score out of 10, capped just under a perfect score so only an exact count ever reaches a full 10 (for example, landing one off on a 12-red sweep scores about 8.25). Solo sessions are five sweeps for up to 50 points; Daily and Friend Challenges are three seeded sweeps for up to 30.",
    },
    {
      q: "What's different between Easy, Medium and Hard?",
      a: 'Each difficulty raises the true red count, adds more decoys relative to that count, speeds up the sweep, and shrinks the blocks. Easy uses cool grey decoys with a generous vertical spread; Medium mixes in warm near-red decoys (orange and pink); Hard adds crimson-adjacent decoys on top of that and lets blocks cluster and overlap — but the true red always keeps a faint glow, so counting gets harder without ever becoming ambiguous.',
    },
    {
      q: 'What happens if I switch tabs or my phone locks mid-sweep?',
      a: "Stepping away mid-sweep would either hand you an unfair pause or an impossible blink-and-you-missed-it counting window, so instead the same sweep restarts from the beginning the moment you come back, with an on-screen note that it restarted. The number-pad guess screen afterwards has no time limit, so there's no rush once the sweep itself is done.",
    },
    {
      q: 'Is landing one off worth any points?',
      a: "Yes — Block Count scores by how close your guess was, not just whether it was exact. An off-by-one guess is only lightly penalised (more lightly on sweeps with more reds), so a careful near-miss still earns most of the round's points; only an exact count reaches the full 10.",
    },
    {
      q: 'How does the Daily Challenge work, and when does it reset?',
      a: 'The Daily Challenge is three seeded sweeps (Easy, Medium, Hard) shared by every player, generated from a code that changes at midnight UTC, so everyone counts identical sweeps until the next day\'s code takes over.',
    },
    {
      q: 'Is Block Count free, and do I need an account?',
      a: 'Completely free, with no download or signup. Your device holds an anonymous ID so your scores and leaderboard entries carry across visits without collecting anything personal.',
    },
  ],
  related: ['balloon-match', 'time-sense', 'grid-flash', 'tap-frenzy'],
};
