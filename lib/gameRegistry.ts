import { GameMeta } from '@/types/game';

export const GAME_REGISTRY: GameMeta[] = [
  {
    id: 'balloon-match',
    title: 'Balloon Match',
    description:
      'A free memory and precision game: watch a balloon inflate, then recreate its size from memory by pressing and holding. How accurate can you be?',
    emoji: '🎈',
    gradientFrom: '#A855F7',
    gradientTo: '#EC4899',
    glowColor: 'rgba(168, 85, 247, 0.5)',
    isAvailable: true,
    href: '/games/balloon-match',
    tags: ['memory', 'precision', 'casual'],
  },
  {
    id: 'perfect-pour',
    title: 'Perfect Pour',
    description:
      'A free precision game: watch a glass fill, then pour it back from memory. A calm, relaxing test of timing and touch.',
    emoji: '🥤',
    gradientFrom: '#06B6D4',
    gradientTo: '#3B82F6',
    glowColor: 'rgba(6, 182, 212, 0.5)',
    isAvailable: true,
    href: '/games/perfect-pour',
    tags: ['memory', 'precision', 'relaxing'],
  },
  {
    id: 'memory-path',
    title: 'Memory Path',
    description:
      'A free brain memory game: a neon path lights up across the grid. Memorize it, then trace it back to train your focus and recall.',
    emoji: '🧠',
    gradientFrom: '#A855F7',
    gradientTo: '#06B6D4',
    glowColor: 'rgba(168, 85, 247, 0.5)',
    isAvailable: true,
    href: '/games/memory-path',
    tags: ['memory', 'focus', 'neon'],
  },
];
