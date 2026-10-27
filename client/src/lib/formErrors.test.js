import { describe, it, expect } from 'vitest';
import { mapFieldErrors, hasFieldErrors } from './formErrors.js';

describe('mapFieldErrors', () => {
  it('maps server details into a field → message object', () => {
    const details = [
      { field: 'email', message: 'Enter a valid email address' },
      { field: 'password', message: 'Password must contain a number' },
    ];
    expect(mapFieldErrors(details)).toEqual({
      email: 'Enter a valid email address',
      password: 'Password must contain a number',
    });
  });

  it('translates server field names to local form field names', () => {
    const details = [{ field: 'confirmPassword', message: 'Passwords do not match' }];
    expect(mapFieldErrors(details, { confirmPassword: 'confirm' })).toEqual({
      confirm: 'Passwords do not match',
    });
  });

  it('keeps only the first message per field', () => {
    const details = [
      { field: 'password', message: 'first' },
      { field: 'password', message: 'second' },
    ];
    expect(mapFieldErrors(details).password).toBe('first');
  });

  it('returns an empty object for missing or malformed details', () => {
    expect(mapFieldErrors(null)).toEqual({});
    expect(mapFieldErrors(undefined)).toEqual({});
    expect(mapFieldErrors('nope')).toEqual({});
    expect(mapFieldErrors([{}])).toEqual({});
  });
});

describe('hasFieldErrors', () => {
  it('is true only when at least one field detail is present', () => {
    expect(hasFieldErrors({ details: [{ field: 'x', message: 'y' }] })).toBe(true);
    expect(hasFieldErrors({ details: [] })).toBe(false);
    expect(hasFieldErrors({})).toBe(false);
    expect(hasFieldErrors(null)).toBe(false);
  });
});
