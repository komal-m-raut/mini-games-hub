import { describe, expect, it } from 'vitest';
import { sanitizeName } from '@/lib/moderation';

describe('sanitizeName', () => {
  it('collapses internal whitespace runs to a single space', () => {
    expect(sanitizeName('Komal    Raut')).toBe('Komal Raut');
    expect(sanitizeName('  Komal\t\tRaut  ')).toBe('Komal Raut');
  });

  it('strips zero-width and bidi-override characters', () => {
    // U+200B zero-width space, U+202E right-to-left override
    expect(sanitizeName('Ko​mal‮')).toBe('Komal');
  });

  it('rejects a name that is empty after cleaning', () => {
    expect(sanitizeName('   ')).toBeNull();
    expect(sanitizeName('​​')).toBeNull();
  });

  it('rejects a blocklist hit', () => {
    expect(sanitizeName('fuck')).toBeNull();
  });

  it('rejects leetspeak evasion of a blocklist word', () => {
    expect(sanitizeName('fu(c)k')).toBeNull();
    expect(sanitizeName('n1gg3r')).toBeNull();
  });

  it('allows a legitimate name containing a blocked word as a substring (Scunthorpe case)', () => {
    expect(sanitizeName('Scunthorpe')).toBe('Scunthorpe');
    expect(sanitizeName('classic')).toBe('classic');
  });

  it('truncates to 20 characters', () => {
    expect(sanitizeName('a'.repeat(30))).toBe('a'.repeat(20));
  });
});
