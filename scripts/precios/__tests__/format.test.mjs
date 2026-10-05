import { afterEach, describe, expect, it, vi } from 'vitest';
import { daysBetween, formatLempira, parseNumber, today } from '../format.mjs';

describe('parseNumber', () => {
  it('parses plain decimals', () => {
    expect(parseNumber('26.8989')).toBe(26.8989);
  });

  it('strips currency symbols, spaces and thousands separators', () => {
    expect(parseNumber('L 1,234.50')).toBe(1234.5);
  });

  it('throws when the cleaned text is not a finite number', () => {
    expect(() => parseNumber('1.2.3')).toThrow('Valor no numérico: "1.2.3"');
  });

  // Slice 1 characterized a latent quirk: text with no digits cleans to '' and
  // Number('') is 0, so parseNumber('n/a') returned 0. It now rejects.
  it('throws for text with no digits instead of returning 0', () => {
    expect(() => parseNumber('n/a')).toThrow('Valor no numérico: "n/a"');
  });
});

describe('formatLempira', () => {
  it('formats with the requested decimals', () => {
    expect(formatLempira(149.2, 2)).toBe('L 149.20');
    expect(formatLempira(27.0334, 4)).toBe('L 27.0334');
  });
});

describe('today', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns dd/mm/yyyy with zero padding', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 12, 0, 0));
    expect(today()).toBe('05/01/2026');
  });
});

describe('daysBetween', () => {
  it('counts whole calendar days between two ISO dates', () => {
    expect(daysBetween('2026-10-05', '2026-10-05')).toBe(0);
    expect(daysBetween('2026-09-28', '2026-10-05')).toBe(7);
    expect(daysBetween('2026-10-05', '2026-10-03')).toBe(-2);
  });

  it('crosses month, year and leap-day boundaries', () => {
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3);
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
  });

  it('is NaN for anything that is not an ISO date (callers decide, nothing throws)', () => {
    expect(daysBetween('05/10/2026', '2026-10-05')).toBeNaN();
    expect(daysBetween(undefined, '2026-10-05')).toBeNaN();
  });
});
