import { describe, it, expect } from 'vitest';
import { sha256Hex } from './sha256Hex';

describe('sha256Hex', () => {
  it('matches known empty-string digest', async () => {
    const h = await sha256Hex('');
    expect(h).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});
