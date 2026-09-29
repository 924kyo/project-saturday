import { describe, expect, it } from 'vitest';
import { packJsonArchiveV1 } from '../src/player/json-archive.js';
import { utf8ByteLength } from '../src/player/utf8.js';
import {
  packPositionHistoryPagesV3,
  unpackPositionHistoryPagesV3,
} from '../src/season/position-alpha-wire-v3.js';

describe('bounded canonical current-history pages', () => {
  it('retains a history larger than one archive without changing per-archive limits', () => {
    const source = Array.from({ length: 12 }, (_, index) => ({
      week: index,
      evidence: 'retained-evidence-'.repeat(6_000),
    }));
    expect(JSON.stringify(source).length).toBeGreaterThan(1_000_000);
    expect(packJsonArchiveV1(source)).toBeNull();
    const pages = packPositionHistoryPagesV3(source, 12)!;
    expect(pages).toHaveLength(3);
    expect(JSON.stringify(pages).length).toBeLessThan(1_000_000);
    const restored = unpackPositionHistoryPagesV3(JSON.parse(JSON.stringify(pages)), 12);
    expect(restored).toEqual(source);
    expect(JSON.stringify(restored)).toBe(JSON.stringify(source));
    expect(packPositionHistoryPagesV3(restored!, 12)).toEqual(pages);
    expect(Object.isFrozen(source[0])).toBe(false);
    expect(Object.isFrozen(restored?.[0])).toBe(true);
  });

  it('uses exact four-record boundaries and no page for empty history', () => {
    for (const length of [0, 1, 2, 4, 5, 8, 9, 12]) {
      const source = Array.from({ length }, (_, index) => ({ index, copy: '선수 🏈' }));
      const pages = packPositionHistoryPagesV3(source, 12)!;
      expect(pages).toHaveLength(Math.ceil(length / 4));
      expect(unpackPositionHistoryPagesV3(pages, 12)).toEqual(source);
    }
    expect(packPositionHistoryPagesV3([], 2)).toEqual([]);
    expect(unpackPositionHistoryPagesV3([], 2)).toEqual([]);
    expect(packPositionHistoryPagesV3([1, 2, 3], 2)).toBeNull();
    expect(packPositionHistoryPagesV3(Array(13).fill(null), 12)).toBeNull();
  });

  it('rejects sparse, empty, overfull, noncanonical, oversized and malformed pages', () => {
    const page = (value: unknown) => packJsonArchiveV1(value);
    for (const invalid of [
      null,
      {},
      Array(1),
      [page([])],
      [page({})],
      [page([1, 2, 3, 4, 5])],
      [page([1]), page([2])],
      Array(4).fill(page([1, 2, 3, 4])),
      [{ ...page([1]), rootIndex: 99 }],
      Object.assign([page([1])], { hidden: true }),
    ])
      expect(unpackPositionHistoryPagesV3(invalid, 12)).toBeNull();
    expect(unpackPositionHistoryPagesV3([page([1, 2, 3])], 2)).toBeNull();
    expect(packPositionHistoryPagesV3(Array(1), 12)).toBeNull();
    expect(packPositionHistoryPagesV3([undefined], 12)).toBeNull();
    expect(packPositionHistoryPagesV3(['x'.repeat(1_000_001)], 12)).toBeNull();
    const cycle: unknown[] = [];
    cycle.push(cycle);
    expect(packPositionHistoryPagesV3(cycle, 12)).toBeNull();
  });

  it('measures canonical UTF-8 bytes without a browser encoder', () => {
    expect(utf8ByteLength('abc')).toBe(3);
    expect(utf8ByteLength('é')).toBe(2);
    expect(utf8ByteLength('선수')).toBe(6);
    expect(utf8ByteLength('🏈')).toBe(4);
    expect(utf8ByteLength('\ud800')).toBe(3);
    expect(utf8ByteLength('\udc00')).toBe(3);
  });
});
