/**
 * Content filtering for public-facing nickname input (leaderboard entries).
 * Names are rendered on shared, publicly-linkable boards, so this guards
 * against layout-breaking characters as well as a short, conservative
 * profanity blocklist.
 */

const MAX_NAME_LENGTH = 20;

// Zero-width and bidi-override characters can be used to spoof or corrupt
// leaderboard layout (invisible characters, right-to-left overrides, etc).
// U+200B-200F: zero-width space/joiners + LTR/RTL marks
// U+202A-202E: bidi embedding/override controls
// U+2060-2064: word joiner and invisible math operators
// U+FEFF: zero-width no-break space / BOM
const ZERO_WIDTH_AND_BIDI = /[\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff]/g;
// C0 and C1 control characters, excluding tab/newline/CR — those are
// left for the whitespace-collapsing step below to normalize into spaces.
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g;

// Deliberately short and conservative: unambiguous slurs/profanity only.
// No words with common innocent meanings, to avoid the Scunthorpe problem —
// matching happens against whole normalized tokens, never substrings.
const BLOCKLIST = new Set(['fuck', 'shit', 'bitch', 'nigger', 'nigga', 'cunt', 'faggot', 'retard']);

// Common leetspeak substitutions, folded before blocklist matching so
// trivial evasion (e.g. "fu(k", "n1gger") doesn't slip through.
const LEET_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '@': 'a',
  $: 's',
};

function normalizeToken(word: string): string {
  const leeted = word
    .toLowerCase()
    .split('')
    .map((ch) => LEET_MAP[ch] ?? ch)
    .join('');
  return leeted.replace(/[^a-z0-9]/g, '');
}

function containsBlockedWord(cleaned: string): boolean {
  const tokens = cleaned.split(/\s+/);
  return tokens.some((token) => BLOCKLIST.has(normalizeToken(token)));
}

/**
 * Clean and validate a public nickname. Returns the sanitized name, or
 * `null` if the input can't be made safe to display (empty after cleaning,
 * or matches the profanity blocklist).
 */
export function sanitizeName(raw: string): string | null {
  const stripped = raw
    .replace(ZERO_WIDTH_AND_BIDI, '')
    .replace(CONTROL_CHARS, '')
    .trim()
    .replace(/\s+/g, ' ');

  if (stripped.length === 0) return null;
  if (containsBlockedWord(stripped)) return null;

  return stripped.slice(0, MAX_NAME_LENGTH);
}
