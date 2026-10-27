import { describe, it, expect } from 'vitest';
import { formatINR, initials, titleCase } from './format.js';

describe('formatINR', () => {
  it('renders an INR currency string', () => {
    const out = formatINR(499);
    expect(out).toContain('₹');
    expect(out).toContain('499');
  });

  it('formats thousands with grouping', () => {
    expect(formatINR(1234)).toContain('1,234');
  });

  it('defaults to zero for empty values', () => {
    expect(formatINR(undefined)).toContain('0');
  });
});

describe('initials', () => {
  it('uses the first letters of the first two words', () => {
    expect(initials('Ravi Kumar')).toBe('RK');
  });

  it('falls back to U for an empty name', () => {
    expect(initials('')).toBe('U');
  });
});

describe('titleCase', () => {
  it('converts snake_case to Title Case', () => {
    expect(titleCase('in_kitchen')).toBe('In Kitchen');
  });
});
