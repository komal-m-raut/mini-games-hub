import { Difficulty } from '@/types/game';
import { clamp } from '@/lib/utils';
import { MAX_ROUND_SCORE, round2 } from '@/utils/scoring';

/**
 * Echo Steps: a Simon-style sequence memory game. Each round plays a growing
 * sequence of pad flashes (with distinct tones), then the player repeats it
 * back; a full correct repeat extends the sequence by one and the *whole*
 * new sequence replays from the top. One wrong tap ends the round.
 *
 * The sequence itself never gets regenerated level to level — a round draws
 * one fixed "master" sequence up front, and each level's pattern is simply
 * `master.slice(0, length)` (see `sequenceForLevel`), exactly like the
 * original Simon: the sequence you already know never changes, it just
 * grows by one note each time you get it right.
 */
export interface EchoStepsDifficultyConfig {
  label: string;
  /** First level's sequence length. */
  start: number;
  /** Sequence length that scores a full 10 for this difficulty. */
  par: number;
  /** Playback speed: ms per step (light-on + gap). */
  stepMs: number;
  color: string;
  glow: string;
}

export const ECHO_STEPS_DIFFICULTY: Record<Difficulty, EchoStepsDifficultyConfig> = {
  easy: {
    label: 'Easy',
    start: 2,
    par: 8,
    stepMs: 600,
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
  medium: {
    label: 'Medium',
    start: 3,
    par: 10,
    stepMs: 600,
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
  hard: {
    label: 'Hard',
    start: 3,
    par: 12,
    stepMs: 420,
    color: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
};

/** The game's single identity colour (matches the registry accent). */
export const ACCENT = '#22C55E';
export const ACCENT_GLOW = 'rgba(34, 197, 94, 0.4)';

export const PAD_COUNT = 4;
/** Pad 0=green, 1=red, 2=yellow, 3=blue — order matches `tones.ts`'s
 *  PAD_FREQS (E4, A4, C#5, E5). */
export const PAD_COLORS = ['#22C55E', '#EF4444', '#EAB308', '#3B82F6'];
export const PAD_LABELS = ['Green', 'Red', 'Yellow', 'Blue'];

/** Solo sessions run 3 rounds, same as a challenge (3 seeded ladders,
 *  easy → medium → hard). */
export const SOLO_ROUND_COUNT = 3;

/** Every round draws from a master sequence this long. Comfortably above
 *  every difficulty's par (max 12) so a round never runs out of sequence to
 *  extend into, however far a player climbs. */
export const MASTER_SEQUENCE_LENGTH = 24;

/** Portion of a step's `stepMs` the pad stays lit; the rest is a dark gap,
 *  so two identical pads back to back in a sequence still read as two
 *  distinct flashes rather than one long one. */
export const LIGHT_MS_RATIO = 0.6;

/** Pause between a fully-repeated sequence and the next (extended) one's
 *  playback, in ms. */
export const LEVEL_PAUSE_MS = 700;
/** How long a correct tap's press pulse holds before clearing, in ms. */
export const TAP_FLASH_MS = 220;
/** Beat after a wrong tap, so the buzz + correct-pad reveal read before the
 *  round's result screen cuts in. */
export const ROUND_END_DELAY_MS = 650;

/**
 * `length` pad indices (0–3), each independently random — true Simon
 * allows (and even relies on) immediate repeats, so there's no
 * no-repeat constraint here.
 */
export function makeSequence(length: number, rand: () => number = Math.random): number[] {
  return Array.from({ length }, () => Math.floor(rand() * PAD_COUNT));
}

/** A level's sequence is just a prefix of the round's fixed master —
 *  never a fresh draw — so every player who reaches level N hears exactly
 *  the same N notes as everyone else who reached level N. */
export function sequenceForLevel(master: number[], length: number): number[] {
  return master.slice(0, length);
}

/**
 * Round score out of 10 from `len` — the longest sequence length fully
 * repeated this round: a straight line from `start - 1` (failed the very
 * first playback — score 0) up to `par` (score 10), clamped so climbing
 * past par still tops out at 10.
 */
export function scoreRound(len: number, difficulty: Difficulty): number {
  const cfg = ECHO_STEPS_DIFFICULTY[difficulty];
  const floor = cfg.start - 1;
  return round2(clamp(((len - floor) / (cfg.par - floor)) * 10, 0, MAX_ROUND_SCORE));
}
