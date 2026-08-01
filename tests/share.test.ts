import { describe, expect, it } from 'vitest';
import { buildSessionShare, scoreEmoji } from '@/lib/share';

describe('scoreEmoji', () => {
  it('buckets scores into tiers re-tuned to the 2dp score curve (H3)', () => {
    expect(scoreEmoji(10)).toBe('🎯');
    expect(scoreEmoji(9.7)).toBe('🎯');
    expect(scoreEmoji(8)).toBe('🟢');
    expect(scoreEmoji(6)).toBe('🟡');
    expect(scoreEmoji(3)).toBe('🟠');
    expect(scoreEmoji(0)).toBe('🔴');
  });
});

describe('buildSessionShare', () => {
  it('summarizes a 5-round free-play session out of 50', () => {
    const text = buildSessionShare({
      emoji: '🎈',
      game: 'Balloon Match',
      subtitle: 'Easy',
      roundScores: [10, 8, 6, 3, 1],
      path: '/games/balloon-match',
      origin: 'https://example.com',
    });
    expect(text).toContain('Easy');
    expect(text).toContain('🎯 🟢 🟡 🟠 🔴');
    expect(text).toContain('28/50');
    expect(text).toContain('https://example.com/games/balloon-match');
  });

  it('formats a decimal session total with no float noise (R2)', () => {
    const text = buildSessionShare({
      emoji: '🥤',
      game: 'Perfect Pour',
      subtitle: 'Medium',
      roundScores: [7.46, 9.34, 5.98, 8.02, 6.5],
      path: '/games/perfect-pour',
      origin: 'https://example.com',
    });
    // Sum is 37.3 exactly; formatScore renders 2dp (only a bare .00 gets
    // trimmed), so this reads "37.30" — guard against trailing float noise.
    expect(text).toContain('37.30/50');
    expect(text).not.toMatch(/\d\.\d{3,}/);
  });
});
