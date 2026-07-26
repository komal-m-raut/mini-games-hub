import { Difficulty } from '@/types/game';
import { BALLOON_COLORS, DIFFICULTY_CONFIG } from '@/lib/constants';
import { GAME_REGISTRY } from '@/lib/gameRegistry';
import { MAX_ROUND_SCORE } from '@/utils/scoring';

/**
 * Challenge Mode: a series of 3 seeded rounds (easy → medium → hard).
 * The challenge code deterministically generates the same targets for
 * everyone who opens the link, so scores are directly comparable. Every game
 * shares this scaffolding (codes, RNG, sharing) and plugs in its own seeded
 * round content via `makeChallengeRand`.
 */
export const CHALLENGE_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
export const CHALLENGE_ROUND_COUNT = CHALLENGE_DIFFICULTIES.length;
export const MAX_CHALLENGE_SCORE = CHALLENGE_ROUND_COUNT * MAX_ROUND_SCORE;

/** Shared difficulty accents for the generic challenge screens. */
export const DIFFICULTY_ACCENT: Record<Difficulty, string> = {
  easy: '#22C55E',
  medium: '#F97316',
  hard: '#EF4444',
};

export interface ChallengeRound {
  difficulty: Difficulty;
  targetUnits: number;
  color: string;
}

// ── Seeded RNG (xmur3 hash + mulberry32) ────────────────────────────

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A deterministic 0–1 RNG for a challenge code. Pass a `salt` (the gameId) so
 * two games seeded from the same daily code produce independent content.
 * Balloon Match seeds from the bare code for backward compatibility with
 * already-shared links (its golden values must never change).
 */
export function makeChallengeRand(code: string, salt = ''): () => number {
  const seed = salt ? `${salt}:${code.toLowerCase()}` : code.toLowerCase();
  return mulberry32(xmur3(seed)());
}

/** Derives the same 3 rounds for a given code on every device. */
export function getChallengeRounds(code: string): ChallengeRound[] {
  const rand = makeChallengeRand(code);
  return CHALLENGE_DIFFICULTIES.map((difficulty) => {
    const cfg = DIFFICULTY_CONFIG[difficulty];
    const targetUnits = Math.floor(rand() * (cfg.maxUnits - cfg.minUnits + 1)) + cfg.minUnits;
    const color = BALLOON_COLORS[Math.floor(rand() * BALLOON_COLORS.length)];
    return { difficulty, targetUnits, color };
  });
}

// ── Challenge codes ─────────────────────────────────────────────────

// No ambiguous characters (0/O, 1/l/I) so codes are easy to read aloud.
const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const CODE_LENGTH = 6;

export function generateChallengeCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

/** Everyone gets the same code (and therefore rounds) on a given day. */
export function getDailyChallengeCode(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `daily-${y}${m}${d}`;
}

export function isDailyCode(code: string): boolean {
  return /^daily-\d{8}$/.test(code);
}

export function isValidChallengeCode(code: string): boolean {
  return /^[a-z2-9]{6}$/.test(code) || isDailyCode(code);
}

export function challengePath(gameId: string, code: string): string {
  return `/games/${gameId}/challenge/${code}`;
}

export function challengeLabel(code: string): string {
  if (isDailyCode(code)) {
    const raw = code.slice(6);
    return `Daily · ${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return `Challenge ${code.toUpperCase()}`;
}

// ── Result sharing (Wordle/dialed.gg-style emoji summary) ───────────

function scoreEmoji(score: number): string {
  if (score >= 10) return '🎯';
  if (score >= 8) return '🟢';
  if (score >= 6) return '🟡';
  if (score >= 3) return '🟠';
  return '🔴';
}

/** Emoji + display name for a game, for share text headers. */
function gameHeader(gameId: string): string {
  const meta = GAME_REGISTRY.find((g) => g.id === gameId);
  return meta ? `${meta.emoji} ${meta.title}` : gameId;
}

/** Emoji summary of a completed challenge, with an invite link to beat it. */
export function buildChallengeShareText(
  gameId: string,
  code: string,
  roundScores: number[],
  origin: string
): string {
  const total = roundScores.reduce((a, b) => a + b, 0);
  const grid = roundScores.map(scoreEmoji).join(' ');
  return [
    `${gameHeader(gameId)} — ${challengeLabel(code)}`,
    `${grid}  ${total}/${MAX_CHALLENGE_SCORE}`,
    `Beat my score: ${origin}${challengePath(gameId, code)}`,
  ].join('\n');
}

/** Share text for a completed free-play session (5 rounds, /50). */
export function buildSessionShareText(
  gameId: string,
  difficultyLabel: string,
  roundScores: number[],
  origin: string
): string {
  const total = roundScores.reduce((a, b) => a + b, 0);
  const max = roundScores.length * MAX_ROUND_SCORE;
  const grid = roundScores.map(scoreEmoji).join(' ');
  return [
    `${gameHeader(gameId)} — ${difficultyLabel}`,
    `${grid}  ${total}/${max}`,
    `Play: ${origin}/games/${gameId}`,
  ].join('\n');
}
