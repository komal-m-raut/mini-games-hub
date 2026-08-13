import { RGB } from '../colorMath';

/**
 * Presentational metadata for the three RGB channels — shared between the
 * sliders and the result screen's per-channel breakdown so the colours used
 * to talk about "red" stay identical everywhere. Purely UI; nothing here
 * feeds scoring.
 */
export interface ChannelMeta {
  key: keyof RGB;
  /** Single-letter badge next to the slider/delta row. */
  label: string;
  /** Full name for aria labels. */
  name: string;
  /** Pure channel colour, used for thumb tint and delta dots. */
  ramp: string;
}

export const CHANNEL_META: ChannelMeta[] = [
  { key: 'r', label: 'R', name: 'Red', ramp: '#FF5C5C' },
  { key: 'g', label: 'G', name: 'Green', ramp: '#4DE07A' },
  { key: 'b', label: 'B', name: 'Blue', ramp: '#5B9CFF' },
];
