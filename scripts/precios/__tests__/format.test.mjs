import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatLempira, parseNumber, today } from '../format.mjs';

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
