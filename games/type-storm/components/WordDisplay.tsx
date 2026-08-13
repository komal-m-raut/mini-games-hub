'use client';

import { motion } from 'framer-motion';

interface WordDisplayProps {
  word: string;
  /** What's typed so far for `word`. */
  input: string;
  /** True while the wrong-submit shake/flash plays. */
  isWrong: boolean;
  /** The next two words, shown dimmed below. */
  queue: string[];
  accent: string;
}

/** Index of the first character where `input` diverges from `word` — every
 *  character before it is a confirmed-correct prefix. Exported so it can be
 *  covered directly if the coloring logic ever grows more nuance. */
function firstMismatch(word: string, input: string): number {
  const len = Math.min(word.length, input.length);
  for (let i = 0; i < len; i++) {
    if (word[i] !== input[i]) return i;
  }
  return len;
}

/**
 * The word in progress, big and centred, coloured character-by-character as
 * you type: a correct prefix in the game's accent, the first wrong
 * character onward in red (including any overtyped tail past the word's own
 * length) — never a blanket "right" or "wrong" wash, so you can see exactly
 * where a mistake started. The next two words queue up dimmed underneath,
 * exactly as they'll appear once you reach them.
 */
export function WordDisplay({ word, input, isWrong, queue, accent }: WordDisplayProps) {
  const mismatchIndex = firstMismatch(word, input);
  const overtype = input.length > word.length ? input.slice(word.length) : '';

  return (
    <motion.div
      className="flex flex-col items-center gap-4 w-full"
      animate={isWrong ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <p className="font-display text-5xl sm:text-6xl tracking-tight text-center break-all">
        {word.split('').map((ch, i) => (
          <span key={i} style={{ color: i < mismatchIndex ? accent : i < input.length ? '#EF4444' : undefined }}>
            <span className={i < input.length ? undefined : 'text-ink-4'}>{ch}</span>
          </span>
        ))}
        {overtype && <span style={{ color: '#EF4444' }}>{overtype}</span>}
      </p>

      <div className="flex gap-4 text-ink-4 text-lg sm:text-xl font-display" aria-hidden="true">
        {queue.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
    </motion.div>
  );
}
