import { GameContent } from '@/types/content';

/**
 * Real content for the Tap Frenzy game page — written against
 * `games/tap-frenzy/constants.ts` (`TAP_FRENZY_DIFFICULTY`, `scoreRound`,
 * `COMBO_LATENCY_MS`), so every number below is true of the actual game.
 */
export const CONTENT: GameContent = {
  intro: [
    "Tap Frenzy is a pure reaction-speed and selective-attention drill: one glowing target appears at a random spot in the arena, shrinks against the clock, and you tap it before it runs out. The instant you hit it, the next one appears — there's no pause to compose yourself, so the whole 30-second round is a continuous stream of react-and-tap decisions rather than one isolated reflex test.",
    "Selective attention comes in because the arena itself is a legitimate target too: tapping empty space doesn't cost you a miss, but it does break your combo, so the game is quietly testing whether you can hold back the reflex to just tap wildly and instead wait the extra beat for the real target to register.",
    'Your round score out of 10 has three parts: up to 8 points for hit rate (how many targets you actually caught out of everyone that appeared), up to 1 point for speed (how fast your hits landed on average), and up to 1 point for your best combo streak. Difficulty shrinks the target and shortens its lifetime at the same time, so Hard punishes hesitation on both fronts at once.',
  ],
  tips: [
    "Watch the arena's centre of mass, not the last place a target appeared — targets spawn at a fresh random spot every time, so staring at where the previous one was just costs you reaction time on the next one.",
    'On mobile, tap with two thumbs rather than one finger — targets can spawn anywhere in the arena, and two thumbs halve the distance either one ever has to travel to reach it.',
    "Don't chase a target you've already lost — if it's clearly about to expire, let it go and get ready for the next spawn instead of a desperate lunge that often lands as an empty-arena tap and costs you the combo you still had.",
    'Favour rhythm over rush: a hit inside 700ms keeps your combo climbing, but a wild, too-early tap that misses the target entirely breaks it just the same as a miss would — steady, confident taps beat frantic ones.',
    "Easy's big, slow targets are the best place to build your first big combo — the size and time budget forgive a slightly late reaction, so it's where bestCombo (worth a full point of your round score) is easiest to push toward its cap.",
    'The Daily Challenge runs the same three seeded target sequences (Easy, Medium, Hard) for everyone, so it is the fairest way to compare your reflexes against the leaderboard rather than against your own variable practice rounds.',
  ],
  faq: [
    {
      q: 'How is my score calculated?',
      a: 'Each round scores out of 10: up to 8 points from your hit rate (hits ÷ every target that fully appeared, hit or not), up to 1 point from your average hit speed (a full point at an instant 0ms average, tapering to zero by an 850ms average), and up to 1 point from the best combo streak you reached that round (a full point once it hits 12). Landing zero hits scores the round a flat 0. Solo sessions are three 30-second rounds for up to 30 points; Daily and Friend Challenges are three seeded rounds for up to 30 as well.',
    },
    {
      q: 'Why does an empty-arena tap break my combo but not count as a miss?',
      a: "A miss is specifically a target you let expire — it costs you a point on the hit-rate side of your score. Tapping empty space never touches hit rate, since no target was there to catch or lose, but it does reset your combo to zero: the game wants to see intentional, precise taps, and a stray or too-early tap that hits nothing is exactly the kind of input a combo streak should punish.",
    },
    {
      q: 'How does the combo work?',
      a: 'Every hit within 700ms of a target appearing extends your combo by one. A slower hit still counts toward your hit rate but neither extends nor breaks the streak. Only a miss (a target that expired) or an empty-arena tap resets the combo to zero. Your best combo of the round — not just your final one — is what feeds into the score.',
    },
    {
      q: "What's different between Easy, Medium and Hard?",
      a: 'Easy spawns a 44px target that lasts 2.2 seconds. Medium shrinks it to 36px and 1.7 seconds. Hard shrinks it further to 30px for just 1.3 seconds. Every difficulty uses the exact same scoring formula and the same 700ms combo window — only the target size and its time budget change.',
    },
    {
      q: 'How does the Daily Challenge work, and when does it reset?',
      a: "The Daily Challenge is three seeded rounds (Easy, Medium, Hard) shared by every player, generated from a code that changes at midnight UTC, so everyone's targets spawn in the identical order and positions until the next day's code takes over.",
    },
    {
      q: 'Where are my scores kept, and is Tap Frenzy free?',
      a: "Completely free, with no download or signup. Your personal best session is kept on your own device, and challenge leaderboard entries use an anonymous ID stored locally so your scores carry across visits without collecting anything personal.",
    },
  ],
  related: ['timing-tap', 'stroop-snap', 'block-count', 'math-sprint'],
};
