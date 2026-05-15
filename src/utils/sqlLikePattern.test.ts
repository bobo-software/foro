import { describe, expect, it } from 'vitest';
import { escapeIlikePattern } from './sqlLikePattern';

describe('escapeIlikePattern', () => {
  it('escapes LIKE metacharacters', () => {
    expect(escapeIlikePattern('100%')).toBe('100\\%');
    expect(escapeIlikePattern('a_b')).toBe('a\\_b');
    expect(escapeIlikePattern('x\\y')).toBe('x\\\\y');
  });
});
