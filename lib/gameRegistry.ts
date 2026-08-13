import { GameCategory, GameMeta } from '@/types/game';

/**
 * Human labels + one-line blurbs for the category sections on the hub and in
 * the footer directory. Order here is display order.
 */
export const CATEGORY_META: Record<GameCategory, { label: string; blurb: string }> = {
  reflex: { label: 'Reflex', blurb: 'Twitch-fast timing and reactions' },
  speed: { label: 'Speed Run', blurb: 'Beat the clock, rack up points' },
  memory: { label: 'Memory', blurb: 'Patterns, pairs and recall' },
  perception: { label: 'Perception', blurb: 'Trust your eyes, ears and inner clock' },
  precision: { label: 'Precision', blurb: 'Steady hands and perfect releases' },
  duel: { label: 'Duels', blurb: 'Outsmart the bot, challenge a friend' },
  puzzle: { label: 'Puzzle', blurb: 'Logic, planning and clean solves' },
  word: { label: 'Words', blurb: 'Daily word puzzles' },
  arcade: { label: 'Arcade', blurb: 'The classics, exactly as you remember' },
};

export const CATEGORY_ORDER = Object.keys(CATEGORY_META) as GameCategory[];

export const GAME_REGISTRY: GameMeta[] = [
  {
    id: 'balloon-match',
    title: 'Balloon Match',
    category: 'precision',
    description:
      'A free memory and precision game: watch a balloon inflate, then recreate its size from memory by pressing and holding. How accurate can you be?',
    tagline: 'Memory & precision',
    howTo: 'Watch a balloon inflate, then press and hold to blow it up to the same size.',
    emoji: '🎈',
    accent: '#A855F7',
    isAvailable: true,
    href: '/games/balloon-match',
  },
  {
    id: 'perfect-pour',
    title: 'Perfect Pour',
    category: 'precision',
    description:
      'A free precision game: watch a glass fill, then pour it back from memory. A calm, relaxing test of timing and touch.',
    tagline: 'Calm & precise',
    howTo: 'Watch a glass fill, then hold the tap to pour it back to the same line.',
    emoji: '🥤',
    accent: '#06B6D4',
    isAvailable: true,
    href: '/games/perfect-pour',
  },
  {
    // Indigo rather than the old #A855F7: with the card tint now derived
    // from one accent, sharing Balloon Match's purple made two of the four
    // cabinets read as the same game at a glance.
    id: 'memory-path',
    title: 'Memory Path',
    category: 'memory',
    description:
      'A free brain memory game: a neon path lights up across the grid. Memorize it, then trace it back to train your focus and recall.',
    tagline: 'Focus & recall',
    howTo: 'A path lights up across the grid — memorise it, then tap it back in order.',
    emoji: '🧠',
    accent: '#6366F1',
    isAvailable: true,
    href: '/games/memory-path',
  },
  {
    // Pink: the four existing cabinets already hold purple, cyan, indigo and
    // orange, and a colour game shouldn't share a hue with a neighbour.
    id: 'color-match',
    title: 'Color Match',
    category: 'perception',
    description:
      'A free colour perception game: memorise a colour, then recreate it from memory on RGB sliders. How accurate is your eye?',
    tagline: 'Colour & perception',
    howTo: 'Memorise a colour, then mix it back from memory on three sliders.',
    emoji: '🎨',
    accent: '#EC4899',
    isAvailable: true,
    href: '/games/color-match',
  },
  {
    id: 'timing-tap',
    title: 'Timing Tap',
    category: 'reflex',
    description:
      'A free reflex and timing game: a glowing indicator sweeps a neon bar. Tap the instant it crosses the Perfect Zone at the centre for a top score.',
    tagline: 'Reflex & timing',
    howTo: 'A marker sweeps along a bar — tap the moment it hits the centre.',
    emoji: '🎯',
    accent: '#F97316',
    isAvailable: true,
    href: '/games/timing-tap',
  },

  // ——— Staged expansion (REDESIGN-PLAN.md). Entries ship with
  // isAvailable: false and flip to true as each game lands, so the hub can
  // show the full cabinet wall while routes come online wave by wave.
  {
    id: 'math-sprint',
    title: 'Math Sprint',
    category: 'speed',
    description:
      'A free mental math game: solve as many quick sums as you can in 30 seconds. Addition, subtraction and times tables at sprint speed — how sharp is your arithmetic?',
    tagline: 'Quick arithmetic',
    howTo: 'Solve as many quick sums as you can before the 30-second timer runs out.',
    emoji: '🔢',
    accent: '#84CC16',
    isAvailable: true,
    href: '/games/math-sprint',
  },
  {
    id: 'tap-frenzy',
    title: 'Tap Frenzy',
    category: 'reflex',
    description:
      'A free reaction speed game: targets pop up around the arena — tap each one the instant it appears and chain combos for bonus points.',
    tagline: 'Speed & combos',
    howTo: 'Tap each target the instant it appears — fast chains build combo bonuses.',
    emoji: '⚡',
    accent: '#EAB308',
    isAvailable: true,
    href: '/games/tap-frenzy',
  },
  {
    id: 'grid-flash',
    title: 'Grid Flash',
    category: 'memory',
    description:
      'A free visual memory game: tiles flash on a grid, then go dark. Tap the pattern back from memory and keep climbing as the patterns grow.',
    tagline: 'Visual memory',
    howTo: 'Watch tiles light up on the grid, then tap the same pattern back from memory.',
    emoji: '🟦',
    accent: '#3B82F6',
    isAvailable: true,
    href: '/games/grid-flash',
  },
  {
    id: 'number-recall',
    title: 'Number Recall',
    category: 'memory',
    description:
      'A free number memory game: a number flashes on screen, then disappears. Type it back from memory as the digits grow longer every level.',
    tagline: 'Digit span',
    howTo: 'A number flashes briefly — type it back from memory as it grows longer each level.',
    emoji: '🔟',
    accent: '#14B8A6',
    isAvailable: true,
    href: '/games/number-recall',
  },
  {
    id: 'stroop-snap',
    title: 'Stroop Snap',
    category: 'speed',
    description:
      'A free brain-teasing speed game built on the Stroop effect: tap the colour of the ink, not the word it spells. Far trickier than it sounds.',
    tagline: 'Focus & speed',
    howTo: 'The word says one colour but is inked in another — tap the ink colour, fast.',
    emoji: '🎭',
    accent: '#D946EF',
    isAvailable: true,
    href: '/games/stroop-snap',
  },
  {
    id: 'block-count',
    title: 'Block Count',
    category: 'perception',
    description:
      'A free counting and perception game: blocks sweep across the screen in a moving crowd. Count only the red ones and trust your eyes.',
    tagline: 'Count & focus',
    howTo: 'Blocks sweep past in a crowd — count the red ones and enter your total.',
    emoji: '🧮',
    accent: '#EF4444',
    isAvailable: true,
    href: '/games/block-count',
  },
  {
    id: 'pair-chase',
    title: 'Pair Chase',
    category: 'memory',
    description:
      'A free card-matching memory game: flip cards to find pairs against the clock. Fewer flips and faster matches mean a higher score.',
    tagline: 'Pairs & speed',
    howTo: 'Flip cards to find matching pairs — clear the board fast in as few flips as you can.',
    emoji: '🃏',
    accent: '#F472B6',
    isAvailable: true,
    href: '/games/pair-chase',
  },
  {
    id: 'echo-steps',
    title: 'Echo Steps',
    category: 'memory',
    description:
      'A free sound and memory game: four pads light up in a growing sequence of colours and tones. Watch, listen, and repeat it back perfectly.',
    tagline: 'Sequence memory',
    howTo: 'Pads light up in a growing sequence — repeat it back in order without slipping.',
    emoji: '🚦',
    accent: '#22C55E',
    isAvailable: true,
    href: '/games/echo-steps',
  },
  {
    id: 'time-sense',
    title: 'Time Sense',
    category: 'perception',
    description:
      'A free time perception game: watch a duration tick by, then recreate it from feel alone. How accurate is your internal clock?',
    tagline: 'Internal clock',
    howTo: 'Watch a duration play out, then hold the button to recreate it from memory.',
    emoji: '⏱️',
    accent: '#38BDF8',
    isAvailable: true,
    href: '/games/time-sense',
  },
  {
    id: 'echo-ear',
    title: 'Echo Ear',
    category: 'perception',
    description:
      'A free pitch memory game: hear a tone, then recreate it on a slider by ear. A simple, surprisingly tricky test of your musical memory.',
    tagline: 'Pitch & ear',
    howTo: 'Listen to a tone, then slide until you match its pitch from memory.',
    emoji: '🎵',
    accent: '#A78BFA',
    isAvailable: true,
    href: '/games/echo-ear',
  },
  {
    // Archery, not darts: timing-tap already owns 🎯 on the wall.
    id: 'bullseye',
    title: 'Bullseye',
    category: 'precision',
    description:
      'A free darts precision game: one tap locks your aim, a second throws the dart. Land close to the bullseye across five throws for a top score.',
    tagline: 'Aim & release',
    howTo: 'Tap once to lock the aim, tap again to throw — the closer to the bullseye, the better.',
    emoji: '🏹',
    accent: '#F43F5E',
    isAvailable: true,
    href: '/games/bullseye',
  },
  {
    id: 'type-storm',
    title: 'Type Storm',
    category: 'speed',
    description:
      'A free typing speed test: type the words streaming across the screen for 30 seconds. Speed matters, but accuracy keeps your score alive.',
    tagline: 'Typing speed',
    howTo: 'Type the words as they appear for 30 seconds — speed and accuracy both count.',
    emoji: '⌨️',
    accent: '#06B6D4',
    isAvailable: true,
    href: '/games/type-storm',
  },
  {
    id: 'rps-arena',
    title: 'RPS Arena',
    category: 'duel',
    description:
      'A free rock paper scissors arena: play best-of-nine against a bot that studies your habits. Break your own patterns to beat it.',
    tagline: 'Mind games',
    howTo: 'Pick rock, paper or scissors each round — outguess a bot that learns your habits.',
    emoji: '✊',
    accent: '#F59E0B',
    isAvailable: true,
    href: '/games/rps-arena',
  },
  {
    id: 'hand-cricket',
    title: 'Hand Cricket',
    category: 'duel',
    description:
      'A free hand cricket game, the classic schoolyard duel: throw a number from 1 to 6 each ball. Match the bot and you are out — chase runs, take wickets.',
    tagline: 'Schoolyard duel',
    howTo: 'Throw 1–6 each ball to score runs — if the bot matches your number, you are out.',
    emoji: '🏏',
    accent: '#10B981',
    isAvailable: true,
    href: '/games/hand-cricket',
  },
  {
    id: 'xo-shift',
    title: 'XO Shift',
    category: 'duel',
    description:
      'A free strategy duel that starts like tic-tac-toe and turns into a sliding battle: place three marks, then shift them around the board to line up three in a row.',
    tagline: 'Slide & strategise',
    howTo: 'Place your three marks, then slide them one cell at a time to make a line first.',
    emoji: '⚔️',
    accent: '#8B5CF6',
    isAvailable: false,
    href: '/games/xo-shift',
  },
  {
    id: 'fading-xo',
    title: 'Fading XO',
    category: 'duel',
    description:
      'A free twist on tic-tac-toe where nothing stays put: your oldest mark fades away and must be moved, so every turn rewrites the board.',
    tagline: 'Nothing stays',
    howTo: 'Play XO where your oldest mark fades each turn — move it and keep three in sight.',
    emoji: '👻',
    accent: '#64748B',
    isAvailable: false,
    href: '/games/fading-xo',
  },
  {
    id: 'shape-echo',
    title: 'Shape Echo',
    category: 'perception',
    description:
      'A free spatial memory game: a shape flashes with a size, spot and tilt, then vanishes. Rebuild it from memory and see how close you get.',
    tagline: 'Spatial memory',
    howTo: 'A shape flashes and vanishes — drag, resize and rotate yours to match it from memory.',
    emoji: '🔷',
    accent: '#0EA5E9',
    isAvailable: true,
    href: '/games/shape-echo',
  },
  {
    id: 'word-quest',
    title: 'Word Quest',
    category: 'word',
    description:
      'A free daily word game: guess the hidden five-letter word in six tries. Colour clues steer every guess, with a fresh puzzle every day.',
    tagline: 'Daily word',
    howTo: 'Guess the five-letter word in six tries — tiles turn green and gold to guide you.',
    emoji: '📝',
    accent: '#34D399',
    isAvailable: false,
    href: '/games/word-quest',
  },
  {
    id: '2048',
    title: '2048',
    category: 'puzzle',
    description:
      'Play 2048 free: slide numbered tiles so equal pairs merge and double. Build your way to the 2048 tile — and beyond — before the grid locks up.',
    tagline: 'Merge & double',
    howTo: 'Swipe to slide tiles — equal numbers merge, doubling toward 2048.',
    emoji: '🧩',
    accent: '#FB923C',
    isAvailable: false,
    href: '/games/2048',
  },
  {
    id: 'snake',
    title: 'Snake',
    category: 'arcade',
    description:
      'Play Snake free: steer the snake to the food, grow longer with every bite, and do not hit the walls or yourself. The classic, exactly as you remember it.',
    tagline: 'Grow & survive',
    howTo: 'Steer the snake to the food and grow — avoid the walls and your own tail.',
    emoji: '🐍',
    accent: '#4ADE80',
    isAvailable: false,
    href: '/games/snake',
  },
  {
    id: 'minesweeper',
    title: 'Minesweeper',
    category: 'puzzle',
    description:
      'Play Minesweeper free: clear the board using the number clues, flag the mines, and do not set one off. The classic logic puzzle with a first-click guarantee.',
    tagline: 'Logic & nerve',
    howTo: 'Reveal squares using number clues, flag the mines, and clear the whole board.',
    emoji: '💣',
    accent: '#CBD5E1',
    isAvailable: false,
    href: '/games/minesweeper',
  },
];

/** Convenience views used by the hub, footer directory, sitemap and quests. */
export const AVAILABLE_GAMES = () => GAME_REGISTRY.filter((g) => g.isAvailable);
export const gamesByCategory = (category: GameCategory) =>
  GAME_REGISTRY.filter((g) => g.category === category);
export const getGameMeta = (id: string) => GAME_REGISTRY.find((g) => g.id === id);
