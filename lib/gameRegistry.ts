import { GameMeta } from '@/types/game';

export const GAME_REGISTRY: GameMeta[] = [
  {
    id: 'balloon-match',
    title: 'Balloon Match',
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
    description:
      'A free reflex and timing game: a glowing indicator sweeps a neon bar. Tap the instant it crosses the Perfect Zone at the centre for a top score.',
    tagline: 'Reflex & timing',
    howTo: 'A marker sweeps along a bar — tap the moment it hits the centre.',
    emoji: '🎯',
    accent: '#F97316',
    isAvailable: true,
    href: '/games/timing-tap',
  },
];
