import { describe, expect, it } from 'vitest';
import {
  CHALLENGE_DIFFICULTIES,
  CHALLENGE_ROUND_COUNT,
  MAX_CHALLENGE_SCORE,
  buildChallengeShareText,
  buildSessionShareText,
  challengeLabel,
  challengePath,
  generateChallengeCode,
  getChallengeRounds,
  getDailyChallengeCode,
  isDailyCode,
  isValidChallengeCode,
} from '@/lib/challenge';
import { DIFFICULTY_CONFIG } from '@/lib/constants';

/**
 * GOLDEN VALUES — do not update these without understanding the consequences.
 *
 * Challenge fairness rests on "same code → identical rounds for every player
 * on every device forever". If a refactor of the seeded RNG (xmur3/mulberry32),
 * the difficulty order, or the target/color derivation changes these outputs,
 * every already-shared challenge link silently breaks: players on the same
 * leaderboard get different targets. If these assertions fail, fix the code —
 * not the test — unless you are knowingly invalidating all existing links.
 */
const GOLDEN: Record<string, { difficulty: string; targetUnits: number; color: string }[]> = {
  test42: [
    { difficulty: 'easy', targetUnits: 30, color: '#F97316' },
    { difficulty: 'medium', targetUnits: 30, color: '#14B8A6' },
    { difficulty: 'hard', targetUnits: 42, color: '#EAB308' },
  ],
  'daily-20260708': [
    { difficulty: 'easy', targetUnits: 65, color: '#14B8A6' },
    { difficulty: 'medium', targetUnits: 44, color: '#EAB308' },
    { difficulty: 'hard', targetUnits: 21, color: '#EF4444' },
  ],
  abc123: [
    { difficulty: 'easy', targetUnits: 36, color: '#F97316' },
    { difficulty: 'medium', targetUnits: 54, color: '#EF4444' },
    { difficulty: 'hard', targetUnits: 57, color: '#EC4899' },
  ],
  zzzzzz: [
    { difficulty: 'easy', targetUnits: 65, color: '#14B8A6' },
    { difficulty: 'medium', targetUnits: 57, color: '#06B6D4' },
    { difficulty: 'hard', targetUnits: 48, color: '#EC4899' },
  ],
};

describe('getChallengeRounds — seeded determinism', () => {
  it('produces the exact pinned rounds for known codes', () => {
    for (const [code, rounds] of Object.entries(GOLDEN)) {
      expect(getChallengeRounds(code)).toEqual(rounds);
    }
  });

  it('is case-insensitive so shared links survive uppercasing', () => {
    expect(getChallengeRounds('TEST42')).toEqual(getChallengeRounds('test42'));
    expect(getChallengeRounds('Abc123')).toEqual(getChallengeRounds('abc123'));
  });

  it('returns identical rounds across repeated calls', () => {
    expect(getChallengeRounds('repeat-me')).toEqual(getChallengeRounds('repeat-me'));
  });

  it('differentiates codes', () => {
    expect(getChallengeRounds('aaaaaa')).not.toEqual(getChallengeRounds('bbbbbb'));
  });

  it('always follows the easy → medium → hard sequence', () => {
    const rounds = getChallengeRounds('any-code');
    expect(rounds.map((r) => r.difficulty)).toEqual(CHALLENGE_DIFFICULTIES);
    expect(rounds).toHaveLength(CHALLENGE_ROUND_COUNT);
  });

  it('keeps every target within its difficulty min/max units', () => {
    // Sample many codes; a target outside the difficulty range is unwinnable.
    for (let i = 0; i < 200; i++) {
      for (const round of getChallengeRounds(`fuzz-${i}`)) {
        const cfg = DIFFICULTY_CONFIG[round.difficulty];
        expect(round.targetUnits).toBeGreaterThanOrEqual(cfg.minUnits);
        expect(round.targetUnits).toBeLessThanOrEqual(cfg.maxUnits);
      }
    }
  });
});

describe('challenge codes', () => {
  it('generates valid 6-char codes from the unambiguous alphabet', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateChallengeCode();
      expect(code).toMatch(/^[a-z2-9]{6}$/);
      expect(isValidChallengeCode(code)).toBe(true);
    }
  });

  it('formats the daily code from the local date', () => {
    expect(getDailyChallengeCode(new Date(2026, 6, 8))).toBe('daily-20260708');
    expect(getDailyChallengeCode(new Date(2026, 0, 1))).toBe('daily-20260101');
  });

  it('classifies codes', () => {
    expect(isDailyCode('daily-20260708')).toBe(true);
    expect(isDailyCode('abc123')).toBe(false);
    expect(isValidChallengeCode('daily-20260708')).toBe(true);
    expect(isValidChallengeCode('abc12')).toBe(false); // too short
    expect(isValidChallengeCode('abc12l')).toBe(false); // ambiguous letter l
  });

  it('builds paths and labels', () => {
    expect(challengePath('balloon-match', 'abc123')).toBe('/games/balloon-match/challenge/abc123');
    expect(challengePath('perfect-pour', 'abc123')).toBe('/games/perfect-pour/challenge/abc123');
    expect(challengeLabel('daily-20260708')).toBe('Daily · 2026-07-08');
    expect(challengeLabel('abc123')).toBe('Challenge ABC123');
  });
});

describe('buildChallengeShareText', () => {
  it('summarizes the run with emoji, total, and invite link', () => {
    const text = buildChallengeShareText('balloon-match', 'abc123', [10, 7, 3], 'https://example.com');
    expect(text).toContain('🎯 🟡 🟠');
    expect(text).toContain(`20/${MAX_CHALLENGE_SCORE}`);
    expect(text).toContain('https://example.com/games/balloon-match/challenge/abc123');
  });

  it('uses each game’s own name and path', () => {
    const text = buildChallengeShareText('perfect-pour', 'abc123', [10, 7, 3], 'https://example.com');
    expect(text).toContain('Perfect Pour');
    expect(text).toContain('https://example.com/games/perfect-pour/challenge/abc123');
  });
});

describe('buildSessionShareText', () => {
  it('summarizes a 5-round free-play session out of 50', () => {
    const text = buildSessionShareText('balloon-match', 'Easy', [10, 8, 6, 3, 1], 'https://example.com');
    expect(text).toContain('Easy');
    expect(text).toContain('🎯 🟢 🟡 🟠 🔴');
    expect(text).toContain('28/50');
    expect(text).toContain('https://example.com/games/balloon-match');
  });
});
