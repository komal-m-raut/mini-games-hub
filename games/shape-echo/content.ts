import { GameContent } from '@/types/content';

/**
 * Real content for the Shape Echo game page — written against
 * `games/shape-echo/constants.ts` (`SHAPE_DIFFICULTY`, `shapeAccuracyDetail`,
 * `symmetryPeriod`), so every number below is true of the actual game.
 */
export const CONTENT: GameContent = {
  intro: [
    "Shape Echo trains spatial working memory and size constancy — the everyday skill of holding an object's position, scale and tilt in mind after it's gone, rather than while it's still in view. Each round flashes a single shape on a square stage for a couple of seconds, then hides it completely. From there you rebuild it from nothing: drag anywhere on the stage to move your shape, and use the Size and Rotation sliders below it to match what you remember, before locking in your answer.",
    "Scoring is split into three components, weighted 40% position, 40% size and 20% rotation. Position is measured as the distance between your shape's center and the target's, size compares the two shapes' areas rather than raw width, and rotation compares angles honestly — a rectangle or ellipse looks identical every 180°, so a 178° guess against a 2° target is judged as roughly 4° off, not 176°. An equilateral triangle repeats every 120° for the same reason. The three components combine into an accuracy percentage, which converts to a round score out of 10 on the site's usual curve.",
    'Difficulty adds shape types and removes forgiveness together: Easy is rectangles only with no rotation to worry about, Medium adds ellipses and tilt, and Hard adds triangles with only 1.5 seconds to look before it vanishes.',
  ],
  tips: [
    "Set rotation first, even though it's only worth 20% of the score — it anchors how the rest of the shape sits in your memory, and it's much easier to nail position and size once you've already got the tilt right in your head.",
    'Anchor the position to the stage in thirds rather than trying to remember exact coordinates — was the shape in the upper-left third, dead center, or hugging the bottom-right corner?',
    "Judge size against a remembered fraction of the stage width, not a pixel count — 'about a third of the stage across' survives the flash a lot better than a specific number.",
    "The aspect ratio (how stretched the shape is) is given to you on the recreate screen — you're only ever recreating position, size and rotation, so don't waste your look trying to memorise how wide versus tall it was.",
    'On Medium and Hard, a shape near the top of its rotational symmetry (close to 180° for a rectangle or ellipse, 120° for a triangle) can look almost identical to one near 0° — use the shape\'s relationship to the stage edges, not just its apparent tilt, to judge which way it\'s actually turned.',
    'The Daily Challenge locks in the same three seeded shapes (Easy, Medium, Hard) for every player, so it is the fairest way to compare your spatial memory against the leaderboard that day.',
  ],
  faq: [
    {
      q: 'How is my score calculated?',
      a: "Accuracy is 40% position (how close your shape's center is to the target's, as a fraction of the stage), 40% size (how close your shape's area is to the target's), and 20% rotation (a symmetry-aware angle comparison — always full marks on Easy, since nothing rotates there). Each component is clamped to 0-100% before being weighted, and the combined accuracy converts to a round score out of 10 on the same curve as every game here. A solo session is five rounds; Daily and Friend Challenges are always three seeded rounds for up to 30 points.",
    },
    {
      q: 'Is the aspect ratio (how stretched the shape is) something I need to recreate?',
      a: "No — the aspect ratio is given to you automatically on the recreate screen, matching the target exactly. Only position, size and rotation are yours to reproduce, and only those three are scored.",
    },
    {
      q: "What happens if I never touch a slider?",
      a: 'Your shape stays at its default 30% stage width with no rotation, and it still gets scored normally against the target — size and rotation accuracy will simply reflect how close that default happens to land.',
    },
    {
      q: 'What are the controls?',
      a: 'Drag anywhere on the stage to move your shape (you don\'t need to grab the shape itself). Arrow keys also nudge it — 1% of the stage per press, or 5% held with Shift — and the Size and Rotation sliders below the stage work with mouse, touch or keyboard once focused.',
    },
    {
      q: "What's different between Easy, Medium and Hard?",
      a: "Easy uses rectangles only, always upright, with 2.5 seconds to look. Medium adds ellipses and rotation. Hard adds equilateral triangles and cuts the look to 1.5 seconds — and a triangle's rotation only has to be judged within its 120° symmetry, which is more forgiving than a rectangle's 180°.",
    },
    {
      q: 'How does the Daily Challenge work, and when does it reset?',
      a: 'The Daily Challenge is three seeded shapes (Easy, Medium, Hard) shared by every player, generated from a code that changes at midnight UTC, so everyone recreates identical shapes until the next day\'s code arrives.',
    },
    {
      q: 'Can I play Shape Echo offline, and is it free?',
      a: "Free to play, no download or signup. It's cached by Mettle's installable PWA, so it stays playable offline once you've opened it — leaderboard submissions just need you back online. Personal bests are stored on your device, and an anonymous ID keeps your scores yours across visits.",
    },
  ],
  related: ['balloon-match', 'color-match', 'grid-flash', 'block-count'],
};
