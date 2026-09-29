import { describe, expect, it } from 'vitest';
import { matchesJsonEvidence } from '../src/json-evidence.js';

describe('validated JSON evidence comparison', () => {
  it('allows only the signed-zero representation change without mutating evidence', () => {
    const source = Object.freeze({ value: -0, nested: Object.freeze([-0, 3]) });
    expect(matchesJsonEvidence(JSON.parse(JSON.stringify(source)), source)).toBe(true);
    expect(Object.is(source.value, -0)).toBe(true);
    expect(matchesJsonEvidence({ value: 1, nested: [0, 3] }, source)).toBe(false);
  });
  it('retains missing/extra undefined keys and sparse-member distinctions', () => {
    expect(matchesJsonEvidence({}, { value: undefined })).toBe(false);
    expect(matchesJsonEvidence([null], [undefined])).toBe(false);
    expect(matchesJsonEvidence([undefined], new Array<unknown>(1))).toBe(false);
    expect(matchesJsonEvidence([1], Object.assign([1], { extra: undefined }))).toBe(false);
    expect(matchesJsonEvidence([null], [NaN])).toBe(false);
    expect(matchesJsonEvidence([null], [Infinity])).toBe(false);
    expect(matchesJsonEvidence({ b: 2, a: 1 }, { a: 1, b: 2 })).toBe(true);
  });
});
