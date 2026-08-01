import { describe, expect, it } from 'vitest';
import {
  CHALLENGE_DIFFICULTIES,
  CHALLENGE_ROUND_COUNT,
  MAX_CHALLENGE_SCORE,
  buildChallengeShareText,
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

  it('formats the daily code from the UTC date', () => {
    expect(getDailyChallengeCode(new Date(Date.UTC(2026, 6, 8)))).toBe('daily-20260708');
    expect(getDailyChallengeCode(new Date(Date.UTC(2026, 0, 1)))).toBe('daily-20260101');
  });

  it('uses UTC, not host-local time, so the daily code is identical worldwide', () => {
    // Pinned instant well inside 2026-07-31 UTC — must resolve to that UTC
    // date regardless of which timezone the test runner's host is in.
    expect(getDailyChallengeCode(new Date('2026-07-31T23:30:00Z'))).toBe('daily-20260731');

    // Either side of a UTC midnight boundary: these must land on different
    // days even though many local timezones would still consider the earlier
    // instant "the same evening" as the later one.
    expect(getDailyChallengeCode(new Date('2026-07-31T23:59:59Z'))).toBe('daily-20260731');
    expect(getDailyChallengeCode(new Date('2026-08-01T00:00:00Z'))).toBe('daily-20260801');
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
    expect(challengeLabel('daily-20260708')).toBe('Daily · 8 July 2026');
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

  it('formats a decimal total with no float noise (R2)', () => {
    const text = buildChallengeShareText(
      'balloon-match',
      'abc123',
      [7.46, 9.34, 5.98],
      'https://example.com'
    );
    // 7.46 + 9.34 + 5.98 = 22.78 exactly; a naive reduce can leave trailing
    // float noise (e.g. 22.779999999999998) — that must never reach the text.
    expect(text).toContain('22.78/30');
    expect(text).not.toMatch(/\d\.\d{3,}/);
  });

  it('trims a whole-number decimal total down to a bare integer', () => {
    // 10 + 10 + 10 → a clean 30, not "30.00".
    const text = buildChallengeShareText('balloon-match', 'abc123', [10, 10, 10], 'https://example.com');
    expect(text).toContain('30/30');
    expect(text).not.toContain('30.00');
  });
});
