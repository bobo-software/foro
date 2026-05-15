import { describe, it, expect } from 'vitest';
import { escapeCsvField, buildCsvLines, withUtf8Bom } from './csvDownload';

describe('escapeCsvField', () => {
  it('quotes fields with commas or quotes', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"');
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvField('line\nbreak')).toBe('"line\nbreak"');
  });

  it('leaves simple strings unquoted', () => {
    expect(escapeCsvField('todo')).toBe('todo');
    expect(escapeCsvField(42)).toBe('42');
    expect(escapeCsvField(null)).toBe('');
  });
});

describe('buildCsvLines', () => {
  it('joins header and rows', () => {
    const csv = buildCsvLines(
      ['a', 'b'],
      [
        [1, 'x'],
        [2, 'y'],
      ]
    );
    expect(csv).toBe('a,b\r\n1,x\r\n2,y');
  });
});

describe('withUtf8Bom', () => {
  it('prefixes BOM', () => {
    expect(withUtf8Bom('a')).toMatch(/^\uFEFFa$/);
  });
});
