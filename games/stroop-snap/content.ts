import { GameContent } from '@/types/content';

/**
 * Real content for the Stroop Snap game page — written against
 * `games/stroop-snap/constants.ts` (`COLOR_POOL`, `CONGRUENT_RATE`,
 * `PAR_NET`, `ROUND_SECONDS`), so every number below is true of the actual
 * game. Kept complementary to `/guides/stroop-effect`, which covers the
 * psychology in depth — this copy stays focused on how the game itself
 * works and how it's scored, and links out to the guide rather than
 * repeating it.
 */
export const CONTENT: GameContent = {
  intro: [
    "Stroop Snap is a 30-second speed round built on the Stroop effect: a colour word appears on screen, printed in an ink colour that often doesn't match what it spells, and you tap the ink — never the word. A correct tap is worth +1, a wrong one is −1, and the next word appears instantly either way, so the round is really a running tug-of-war between reading (automatic) and colour-naming (deliberate) for as many trials as you can get through in 30 seconds.",
    "Difficulty moves two things at once. The colour pool grows from three (Red, Blue, Green) to four (adding Yellow) to six (adding Purple and Orange), so there are more buttons to scan and more ways for a word to disagree with its ink. At the same time, the share of trials where the ink actually matches the word — the easy, no-conflict ones — drops from 45% on Easy to 30% on Medium to just 20% on Hard, so higher difficulties don't just add colours, they also give you less of a break between genuine conflicts.",
    'Each round scores from its net correct answers: net is your correct count minus your wrong count (never below zero), and that net is measured against a par for the difficulty you played — 18 on Easy, 16 on Medium, 14 on Hard — which becomes a round score out of 10. Solo sessions and both Challenge modes are three rounds each, so a perfect run tops out at 30.',
  ],
  tips: [
    "Try to name the ink colour to yourself before you even register what the word spells — reading the word is the fast, automatic process fighting you here, so getting your own colour-naming answer in early gives it a head start instead of a losing race.",
    'Let your focus blur very slightly instead of sharply reading each letter — the ink is a colour patch behind the word, and softening how hard you read the text can quiet the automatic reading response that keeps winning the race.',
    "The answer buttons never change position or order within a session, on purpose — build a fixed sense of where each colour sits (or learn its 1–6 hotkey) instead of hunting for the label every single trial.",
    "On an incongruent trial, expect to slow down a little, and let yourself — a slower correct tap only costs time, but a fast wrong guess costs a full point, and net (not raw trial count) is what actually gets scored.",
    'Use the number keys 1 through 6 instead of reaching for the mouse or trackpad — they map straight to the pool in its on-screen order and shave real time off every trial.',
    "The Daily Challenge runs the same seeded Easy → Medium → Hard sequence for everyone, so it's the most direct way to compare your net accuracy against the leaderboard rather than against your own variable practice runs.",
  ],
  faq: [
    {
      q: 'How is my score calculated?',
      a: 'Each round tracks correct and wrong taps and takes net = correct − wrong (never below zero). That net is measured against a par for the difficulty — 18 on Easy, 16 on Medium, 14 on Hard — and scaled to a round score out of 10: hit par exactly and you score a full 10, and the score clamps there even if your net goes higher. Solo sessions and Challenges are both three rounds, so the maximum session total is 30.',
    },
    {
      q: 'Why do wrong answers subtract points instead of just not counting?',
      a: "Trials advance instantly and the round is 30 seconds of as many as you can get through, so if wrong taps were free, mashing buttons as fast as possible would beat actually reading the ink. Subtracting a point for a wrong tap makes accuracy matter as much as speed, which is the whole point of a Stroop task — otherwise you'd just be measuring how fast someone can tap, not whether the ink beat the word.",
    },
    {
      q: "Why don't the answer button positions ever move?",
      a: "Shuffling the buttons every trial would turn this into a visual-search game layered on top of the Stroop conflict, and it would make the 1–6 hotkeys meaningless from one trial to the next. Keeping positions fixed for the whole session lets you build real motor memory for where each colour lives, which is fairer to compare across attempts and closer to how the classic Stroop task is actually run.",
    },
    {
      q: "What's different between Easy, Medium and Hard?",
      a: 'Easy uses a 3-colour pool (Red, Blue, Green) with 45% of trials congruent (ink matches word) and a par net of 18. Medium adds Yellow for a 4-colour pool, drops congruent trials to 30%, and lowers par to 16. Hard adds Purple and Orange for the full 6-colour pool, drops congruent trials to just 20%, and lowers par to 14 — more buttons to scan, and far fewer easy trials to recover on.',
    },
    {
      q: 'How does the Daily Challenge work, and when does it reset?',
      a: "The Daily Challenge is three seeded 30-second rounds — Easy, then Medium, then Hard — shared by every player, generated from a code that changes at midnight UTC. Everyone sees the exact same word/ink sequence until the next day's code takes over.",
    },
    {
      q: 'Is Stroop Snap free, and do I need an account?',
      a: 'Completely free, with no download or signup. Your device holds an anonymous ID so your scores and leaderboard entries carry across visits without collecting anything personal, and the game keeps working offline once cached by the installable PWA — you just need a connection again to submit a leaderboard score.',
    },
  ],
  related: ['math-sprint', 'tap-frenzy', 'color-match', 'time-sense'],
};
