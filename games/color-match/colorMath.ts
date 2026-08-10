/** Colour maths for Color Match. Pure functions, so scoring is unit-testable. */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export const CHANNEL_MAX = 255;

const clampChannel = (n: number): number => Math.min(CHANNEL_MAX, Math.max(0, Math.round(n)));

/**
 * HSL → RGB. Targets are authored in HSL because the difficulty bands are
 * saturation/lightness ranges; everything downstream works in RGB.
 *
 * @param h hue 0–360, @param s saturation 0–100, @param l lightness 0–100
 */
export function hslToRgb(h: number, s: number, l: number): RGB {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));

  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const m = light - c / 2;
  return {
    r: clampChannel((r + m) * CHANNEL_MAX),
    g: clampChannel((g + m) * CHANNEL_MAX),
    b: clampChannel((b + m) * CHANNEL_MAX),
  };
}

/** Hue in degrees, 0–360 (0 for greys). Used to keep rounds visually apart. */
export function rgbHue({ r, g, b }: RGB): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return 0;

  let hue: number;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;

  return (((hue * 60) % 360) + 360) % 360;
}

export function rgbToCss({ r, g, b }: RGB): string {
  return `rgb(${r}, ${g}, ${b})`;
}

export function rgbToHex({ r, g, b }: RGB): string {
  return `#${[r, g, b]
    .map((n) => clampChannel(n).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}

/** Largest possible redmean distance (black vs white); normalises to 0–1. */
export const MAX_DISTANCE = Math.sqrt(
  (2 + 127.5 / 256) * CHANNEL_MAX ** 2 +
    4 * CHANNEL_MAX ** 2 +
    (2 + (255 - 127.5) / 256) * CHANNEL_MAX ** 2
);

/**
 * Distance between two colours, 0–1, using the redmean weighting: the eye
 * resolves green far better than blue, so plain RGB distance would score a
 * visually close match worse than a visually distant one.
 */
export function colorDistance(a: RGB, b: RGB): number {
  const rMean = (a.r + b.r) / 2;
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  const raw = Math.sqrt(
    (2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db
  );
  return Math.min(1, raw / MAX_DISTANCE);
}

/**
 * Accuracy 0–100 (1dp). `tolerance` is the distance at which accuracy hits 0,
 * so it is the difficulty knob. Feeds `calculateScore` like every other game.
 */
export function colorAccuracy(target: RGB, actual: RGB, tolerance: number): number {
  const distance = colorDistance(target, actual);
  return Math.round(Math.max(0, 100 * (1 - distance / tolerance)) * 10) / 10;
}

/** Readable ink for text sitting on a colour swatch. */
export function contrastInk({ r, g, b }: RGB): string {
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / CHANNEL_MAX;
  return luminance > 0.55 ? '#0B0B1A' : '#F1F5F9';
}
