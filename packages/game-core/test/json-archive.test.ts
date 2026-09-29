import { describe, expect, it } from 'vitest';
import {
  JSON_ARCHIVE_LIMITS,
  packJsonArchiveV1,
  unpackJsonArchiveV1,
} from '../src/player/json-archive.js';

const archive = (nodes: unknown[]) => ({
  model: 'json_archive_v1',
  nodes,
  rootIndex: nodes.length - 1,
});
const nest = (levels: number, leaf: unknown = null): unknown => {
  let value = leaf;
  for (let index = 0; index < levels; index += 1) value = [value];
  return value;
};

describe('bounded lossless JSON archive', () => {
  it('round-trips JSON values, Korean copy, literal key order and prototype-named keys', () => {
    const values: unknown[] = [
      null,
      false,
      true,
      0,
      -3.5,
      '',
      '선수 / Athlete 🏈',
      [],
      {},
      JSON.parse('{"z":1,"__proto__":{"safe":true},"a":[null,false,"준"],"constructor":2}'),
    ];
    for (const value of values) {
      const packed = packJsonArchiveV1(value);
      expect(packed).not.toBeNull();
      const decoded = unpackJsonArchiveV1(JSON.parse(JSON.stringify(packed)));
      expect(decoded.ok).toBe(true);
      if (!decoded.ok) throw new Error('decode');
      expect(JSON.stringify(decoded.value)).toBe(JSON.stringify(value));
      expect(packJsonArchiveV1(decoded.value)).toEqual(packed);
    }
  });

  it('interns repeated values and subtrees without changing or freezing caller data', () => {
    const source = {
      weeks: Array.from({ length: 30 }, () => ({
        label: 'original-snap-evidence',
        scores: [10, 20, 30],
      })),
    };
    const packed = packJsonArchiveV1(source)!;
    expect(JSON.stringify(packed).length).toBeLessThan(JSON.stringify(source).length / 3);
    expect(Object.isFrozen(source.weeks[0])).toBe(false);
    expect(Object.isFrozen(packed.nodes)).toBe(true);
    const mutable = JSON.parse(JSON.stringify(packed));
    const decoded = unpackJsonArchiveV1(mutable);
    expect(decoded).toEqual({ ok: true, value: source });
    expect(Object.isFrozen(mutable.nodes)).toBe(false);
    if (!decoded.ok) throw new Error('decode');
    expect(Object.isFrozen(decoded.value)).toBe(true);
    source.weeks[0]!.scores[0] = 99;
    mutable.nodes[0] = 'edited';
    expect(decoded.value).not.toEqual(source);
    expect(unpackJsonArchiveV1(packed)).toEqual(decoded);
  });

  it('rejects cycles, non-JSON values, sparse arrays and hidden properties', () => {
    const cycle: unknown[] = [];
    cycle.push(cycle);
    const hidden = Object.defineProperty({}, 'hidden', { value: 1 });
    const symbol = { [Symbol('extra')]: 1 };
    const extraArray = Object.assign([1], { extra: 2 });
    for (const value of [
      undefined,
      NaN,
      Infinity,
      -Infinity,
      1n,
      () => 1,
      new Date(),
      cycle,
      [undefined],
      { key: undefined },
      Array(2),
      hidden,
      symbol,
      extraArray,
    ]) {
      expect(packJsonArchiveV1(value)).toBeNull();
    }
    expect(unpackJsonArchiveV1(packJsonArchiveV1(-0))).toEqual({ ok: true, value: 0 });
    expect(unpackJsonArchiveV1(packJsonArchiveV1(Object.create(null)))).toEqual({
      ok: true,
      value: {},
    });
  });

  it('uses matching encoder/decoder depth boundaries, including empty containers', () => {
    for (const leaf of [null, []]) {
      const atLimit = packJsonArchiveV1(nest(JSON_ARCHIVE_LIMITS.depth, leaf));
      expect(atLimit).not.toBeNull();
      expect(unpackJsonArchiveV1(atLimit).ok).toBe(true);
      expect(packJsonArchiveV1(nest(JSON_ARCHIVE_LIMITS.depth + 1, leaf))).toBeNull();
    }
    const nodes: unknown[] = [null];
    for (let index = 0; index <= JSON_ARCHIVE_LIMITS.depth; index += 1) nodes.push([0, index]);
    expect(unpackJsonArchiveV1(archive(nodes))).toEqual({ ok: false });
  });

  it('enforces the literal expanded JSON character limit on both paths', () => {
    const atLimit = 'x'.repeat(JSON_ARCHIVE_LIMITS.expandedChars - 2);
    expect(unpackJsonArchiveV1(packJsonArchiveV1(atLimit))).toEqual({ ok: true, value: atLimit });
    expect(packJsonArchiveV1(`${atLimit}x`)).toBeNull();
    expect(unpackJsonArchiveV1(archive([`${atLimit}x`]))).toEqual({ ok: false });
    expect(packJsonArchiveV1([atLimit])).toBeNull();
  });

  it('rejects an exponential back-reference expansion before materializing it', () => {
    const nodes: unknown[] = ['payload'];
    for (let index = 0; index < 60; index += 1) nodes.push([0, index, index]);
    expect(unpackJsonArchiveV1(archive(nodes))).toEqual({ ok: false });
  });

  it('rejects invalid envelopes and noncanonical dictionaries', () => {
    const good = packJsonArchiveV1({ a: [1, 2] })!;
    for (const value of [
      null,
      {},
      { ...good, model: 'json_archive_v2' },
      { ...good, extra: true },
      { ...good, rootIndex: 0 },
      archive([]),
      archive([NaN]),
      archive([undefined]),
      archive([{}, [0, 0]]),
      archive([1, [2, 0]]),
      archive([1, [0, -1]]),
      archive([1, [0, 0.5]]),
      archive([1, [0, 1]]),
      archive([1, [0, 2]]),
      archive([1, [1, 0]]),
      archive([1, 2, [1, 0, 1]]),
      archive(['a', 1, [1, 0, 1, 0, 1]]),
      archive([1, 1, [0, 0, 1]]),
      archive(['unused', 1]),
      archive([2, 1, [0, 1, 0]]),
      { ...good, [Symbol('hidden')]: true },
    ]) {
      expect(unpackJsonArchiveV1(value)).toEqual({ ok: false });
    }
    const extraNode = archive([Object.assign([0], { extra: 1 })]);
    const extraNodes = archive(Object.assign([null], { extra: true }));
    expect(unpackJsonArchiveV1(extraNode)).toEqual({ ok: false });
    expect(unpackJsonArchiveV1(extraNodes)).toEqual({ ok: false });
  });

  it('bounds node counts even with otherwise small JSON values', () => {
    expect(unpackJsonArchiveV1(archive(Array(JSON_ARCHIVE_LIMITS.nodes + 1).fill(null)))).toEqual({
      ok: false,
    });
    expect(
      packJsonArchiveV1(Array.from({ length: JSON_ARCHIVE_LIMITS.nodes }, (_, index) => index)),
    ).toBeNull();
  });
});
