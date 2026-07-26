import { GameMeta } from '@/types/game';

export const GAME_REGISTRY: GameMeta[] = [
  {
    id: 'balloon-match',
    title: 'Balloon Match',
    description:
      'Observe a balloon, then recreate it by feel. Test your memory and touch precision!',
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
      'Watch a glass fill, then pour it back from memory. Calm, satisfying precision.',
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
      'A neon path lights up across the grid. Memorize it, then trace it back.',
    emoji: '🧠',
    gradientFrom: '#A855F7',
    gradientTo: '#06B6D4',
    glowColor: 'rgba(168, 85, 247, 0.5)',
    isAvailable: true,
    href: '/games/memory-path',
    tags: ['memory', 'focus', 'neon'],
  },
];
