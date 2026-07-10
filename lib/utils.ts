/** Merge Tailwind class names, filtering falsy values. */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Pick a random element from an array. */
export function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Random integer between min and max inclusive. */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Random float between min and max. */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/** Clamp a value between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
