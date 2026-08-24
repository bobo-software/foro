import { describe, it, expect } from 'vitest';
import { deriveCompanyAbbreviation, computeOrderNumber } from './orderNumber';

describe('deriveCompanyAbbreviation', () => {
  it('lowercases and takes the first 5 alphanumeric characters', () => {
    expect(deriveCompanyAbbreviation('Intuitive Ltd')).toBe('intui');
  });

  it('keeps digits and strips punctuation/spaces', () => {
    expect(deriveCompanyAbbreviation('3M')).toBe('3m');
    expect(deriveCompanyAbbreviation('A & B (Pty) Ltd')).toBe('abpty');
  });

  it('returns whatever is available when shorter than 5 characters', () => {
    expect(deriveCompanyAbbreviation('Q & Co')).toBe('qco');
  });

  it('falls back to "co" when nothing alphanumeric remains', () => {
    expect(deriveCompanyAbbreviation('&&&')).toBe('co');
    expect(deriveCompanyAbbreviation('')).toBe('co');
  });
});

describe('computeOrderNumber', () => {
  const params = {
    type: 'IN' as const,
    companyName: 'Intuitive Ltd',
    issueDate: '2026-08-10',
  };

  it('returns the bare base string when no existing numbers match', () => {
    expect(computeOrderNumber({ ...params, existingOrderNumbers: [] })).toBe('IN-intui-20260810');
  });

  it('appends -2 when the bare base already exists', () => {
    expect(
      computeOrderNumber({ ...params, existingOrderNumbers: ['IN-intui-20260810'] })
    ).toBe('IN-intui-20260810-2');
  });

  it('increments past the highest existing suffix', () => {
    expect(
      computeOrderNumber({
        ...params,
        existingOrderNumbers: ['IN-intui-20260810', 'IN-intui-20260810-2'],
      })
    ).toBe('IN-intui-20260810-3');
  });

  it('takes max+1 even when there is a gap', () => {
    expect(
      computeOrderNumber({ ...params, existingOrderNumbers: ['IN-intui-20260810-2'] })
    ).toBe('IN-intui-20260810-3');
  });

  it('ignores order numbers for a different company, day, or type', () => {
    expect(
      computeOrderNumber({
        ...params,
        existingOrderNumbers: ['IN-other-20260810', 'IN-intui-20260809', 'QU-intui-20260810', 'CN-intui-20260810'],
      })
    ).toBe('IN-intui-20260810');
  });

  it('produces the correct prefix per document type', () => {
    expect(computeOrderNumber({ ...params, type: 'QU', existingOrderNumbers: [] })).toBe('QU-intui-20260810');
    expect(computeOrderNumber({ ...params, type: 'CN', existingOrderNumbers: [] })).toBe('CN-intui-20260810');
  });
});
