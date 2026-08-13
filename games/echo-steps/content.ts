import { GameContent } from '@/types/content';

/**
 * Real content for the Echo Steps game page — written against
 * `games/echo-steps/constants.ts` (`ECHO_STEPS_DIFFICULTY`, `scoreRound`),
 * so every number below is true of the actual game.
 */
export const CONTENT: GameContent = {
  intro: [
    "Echo Steps is a Simon-style sequence memory game: it trains the same short-term ability psychologists test with a \"digit span\" or \"tone span\" task, where you hold a growing ordered sequence in mind rather than a fixed set of items. Four pads sit in a 2×2 board, each with its own colour and its own musical tone. Every round plays back a sequence of pad flashes from the start, then hands control to you — tap the pads back in exactly the same order. Get the whole sequence right and it plays again, one note longer.",
    "Because each pad has a distinct, consonant tone as well as a colour, the sequence is genuinely dual-coded: your ears carry the same information your eyes do, so leaning on sound isn't a crutch, it's a second channel for the same memory. A round ends the instant you tap a pad out of order — one mistake, and it's over. Your round score comes from the longest sequence you fully repeated back (not just reached): each difficulty has a par length, and scoring runs on a straight line from your starting length minus one (failing the very first playback) up to that par, worth a full 10.",
    "Difficulty changes the ladder itself: Easy starts at a 2-note sequence with a relaxed 600ms-per-step playback and a par of 8; Medium starts at 3 notes at the same pace with a par of 10; Hard also starts at 3 notes but speeds playback up to 420ms per step, with a par of 12 to chase for a top score.",
  ],
  tips: [
    "Chunk the sequence into groups of three as it plays — three notes is one \"word\" to remember, not three separate facts, and it's much easier to hold four or five words in mind than a dozen loose digits.",
    "Rehearse rhythmically while the sequence is still playing, not after it stops — silently naming the colours (or humming the notes) in time with the flashes builds a motor/audio trace alongside the visual one, so you have two ways to recall each step.",
    "Name the colours subvocally as they light — \"green, green, blue, red\" said in your head — rather than just watching; putting a sequence into words is one of the most reliable ways to keep it in working memory.",
    "Use the tones even with your eyes on the pads: because the four notes are a consonant, non-clashing set, a repeated pad (a note played twice in a row) is often easier to catch by ear than by eye, since the two flashes read almost as one continuous glow.",
    "If you're not sure about a note, don't guess and rush — a wrong tap ends the round immediately with no partial credit for the notes you get right after it, so a confident pause beats a fast mistake.",
    "The Daily Challenge fixes the same three seeded sequences (Easy, Medium, Hard) for every player that day, so every level's exact notes match everyone else's — the fairest way to compare your span against the leaderboard.",
  ],
  faq: [
    {
      q: 'How is my score calculated?',
      a: "Each round is a ladder that starts at a fixed sequence length (2 notes on Easy, 3 on Medium and Hard) and grows by one note every time you repeat the whole sequence back correctly — one wrong tap ends the round. Your round score comes from the longest sequence you fully repeated (\"len\"), on a straight line from your starting length minus one (failing the very first playback, score 0) up to that difficulty's par length, worth a full 10; climbing past par still tops out at 10. Par is 8 notes on Easy, 10 on Medium, and 12 on Hard. Solo sessions and Daily/Friend Challenges are both three rounds, for up to 30 points.",
    },
    {
      q: 'Do I need sound to play?',
      a: "No — every pad's flash is fully visible with sound off, so Echo Steps is completely playable on mute. Sound adds a second channel (each pad has its own tone), which helps a lot but is never required to see the sequence.",
    },
    {
      q: 'Can the same pad appear twice in a row in a sequence?',
      a: "Yes — sequences are drawn with no restriction on repeats, exactly like the original Simon. A pad flashing twice in a row (with a brief dark gap between the two flashes) is a real pattern you'll see, not a bug.",
    },
    {
      q: "What's different between Easy, Medium and Hard?",
      a: 'Easy starts at a 2-note sequence and plays each step at a relaxed 600ms; Medium starts at 3 notes at the same 600ms pace; Hard also starts at 3 notes but speeds playback up to 420ms per step. Par length — the sequence length that scores a full 10 — also rises with difficulty: 8 notes on Easy, 10 on Medium, 12 on Hard.',
    },
    {
      q: 'How does the Daily Challenge work, and when does it reset?',
      a: "The Daily Challenge is three seeded sequences (Easy, Medium, Hard) shared by everyone, generated from a code that changes at midnight UTC — every note in every sequence is identical for every player that day, so it's a fair, direct comparison until the next day's code rolls in.",
    },
    {
      q: 'Is Echo Steps free, and do I need an account?',
      a: 'Free to play, with no download or signup. Your device gets an anonymous ID so your best runs and leaderboard entries stay yours across visits, without collecting anything personal — your best session is stored on-device.',
    },
  ],
  related: ['grid-flash', 'number-recall', 'memory-path', 'echo-ear'],
};
