/**
 * Word Quest: a Wordle-style daily word game. Every round is the same
 * shape — guess a hidden five-letter word in six tries, with each guess
 * scored letter-by-letter — whether played solo, as today's Daily
 * Challenge, or as a Friend Challenge.
 */
export const GAME_ID = 'word-quest';

/** Matches the registry accent (lib/gameRegistry.ts). */
export const ACCENT = '#34D399';

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

/** Round 1 of a challenge draws from this common prefix of ANSWERS — the
 *  "easy" round, since ANSWERS' first 150 entries are its most everyday
 *  words. Rounds 2-3 draw from the full list. */
export const COMMON_SLICE_SIZE = 150;

/** How long a single tile's flip reveal takes, in ms. */
export const FLIP_DURATION_MS = 280;
/** Delay between each tile's flip starting, in ms — the cascading reveal. */
export const TILE_STAGGER_MS = 220;
/** How long a toast ("Not in word list") stays up, in ms. */
export const TOAST_DURATION_MS = 1600;
/** How long the shake animation on an invalid submit runs, in ms. */
export const SHAKE_DURATION_MS = 500;
/** Input stays locked for this long after a valid submit, so the reveal
 *  animation finishes before the next guess can start. */
export const REVEAL_LOCK_MS = TILE_STAGGER_MS * WORD_LENGTH + 300;
