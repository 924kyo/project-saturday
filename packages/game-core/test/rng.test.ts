import {
  RNG_ALGORITHM,
  createRng,
  deserializeRngState,
  forkRng,
  isRngState,
  nextFloat01,
  nextInt,
  nextUint32,
  restoreRngState,
  sampleOne,
  serializeRngState,
  shuffle,
} from '../src/index.js';
import type { RngState } from '../src/index.js';
import { describe, expect, it } from 'vitest';

function drawUint32Sequence(seed: number | string, count: number): readonly number[] {
  let rng = createRng(seed);
  const values: number[] = [];

  for (let index = 0; index < count; index += 1) {
    const sample = nextUint32(rng);
    values.push(sample.value);
    rng = sample.nextRng;
  }

  return values;
}

describe('seeded RNG', () => {
  it('matches the versioned golden vector', () => {
    expect(createRng(0)).toEqual({
      algorithm: RNG_ALGORITHM,
      state: [3_005_030_388, 1_563_460_212, 1_228_030_536, 661_880_827],
      drawCount: 0,
    });

    expect(drawUint32Sequence(0, 8)).toEqual([
      3_279_369_640, 1_294_669_097, 3_707_065_613, 2_774_097_142, 1_492_326_288, 3_388_320_282,
      3_652_046_600, 1_239_827_064,
    ]);
    expect(drawUint32Sequence('saturday', 5)).toEqual([
      2_252_702_078, 3_494_354_600, 3_310_033_997, 2_195_137_611, 3_716_077_304,
    ]);
  });

  it('replays identical seeds and separates seed domains', () => {
    expect(drawUint32Sequence(42, 32)).toEqual(drawUint32Sequence(42, 32));
    expect(drawUint32Sequence(42, 32)).not.toEqual(drawUint32Sequence(43, 32));
    expect(drawUint32Sequence(42, 32)).not.toEqual(drawUint32Sequence('42', 32));
  });

  it('returns immutable state and advances exactly once per direct draw', () => {
    const initial = createRng(7);
    const sample = nextUint32(initial);

    expect(Object.isFrozen(initial)).toBe(true);
    expect(Object.isFrozen(initial.state)).toBe(true);
    expect(initial.drawCount).toBe(0);
    expect(sample.nextRng.drawCount).toBe(1);
    expect(nextUint32(initial)).toEqual(sample);
  });

  it('round-trips and resumes serialized state exactly', () => {
    let rng = createRng('save-slot-one');
    for (let index = 0; index < 17; index += 1) {
      rng = nextUint32(rng).nextRng;
    }

    const serialized = serializeRngState(rng);
    const restored = deserializeRngState(serialized);

    expect(restored).toEqual(rng);
    expect(Object.isFrozen(restored)).toBe(true);
    expect(Object.isFrozen(restored.state)).toBe(true);
    expect(nextUint32(restored)).toEqual(nextUint32(rng));
  });

  it('rejects malformed serialized state', () => {
    const sparseState = new Array<number>(4);
    sparseState[0] = 1;

    expect(() => deserializeRngState('{')).toThrow(TypeError);
    expect(() =>
      restoreRngState({
        algorithm: RNG_ALGORITHM,
        state: [1, 2, 3],
        drawCount: 0,
      }),
    ).toThrow(TypeError);
    expect(
      isRngState({
        algorithm: RNG_ALGORITHM,
        state: [1, 2, 3, -1],
        drawCount: 0,
      }),
    ).toBe(false);
    expect(
      isRngState({
        algorithm: RNG_ALGORITHM,
        state: sparseState,
        drawCount: 0,
      }),
    ).toBe(false);
    expect(() =>
      restoreRngState({
        algorithm: RNG_ALGORITHM,
        state: sparseState,
        drawCount: 0,
      }),
    ).toThrow(TypeError);
    expect(
      isRngState({
        algorithm: RNG_ALGORITHM,
        state: [0, 0, 0, 0],
        drawCount: 0,
      }),
    ).toBe(false);
  });

  it('forks stable label-specific streams without consuming the parent', () => {
    const parent = createRng(42);
    const first = forkRng(parent, 'weekly-actions');
    const replay = forkRng(parent, 'weekly-actions');
    const other = forkRng(parent, 'game-resolution');

    expect(first).toEqual(replay);
    expect(first).not.toEqual(other);
    expect(parent.drawCount).toBe(0);
    expect(first).toEqual({
      algorithm: RNG_ALGORITHM,
      state: [1_172_345_120, 423_265_255, 2_091_895_340, 1_870_188_344],
      drawCount: 0,
    });

    const advancedParent = nextUint32(parent).nextRng;
    expect(forkRng(advancedParent, 'weekly-actions')).not.toEqual(first);
  });

  it('rejects invalid seeds and fork labels', () => {
    expect(() => createRng(-1)).toThrow(RangeError);
    expect(() => createRng(0x1_0000_0000)).toThrow(RangeError);
    expect(() => createRng(1.5)).toThrow(RangeError);
    expect(() => createRng('')).toThrow(RangeError);
    expect(() => forkRng(createRng(1), '')).toThrow(RangeError);
  });
});

describe('RNG sampling', () => {
  it('produces half-open floating-point samples', () => {
    let rng = createRng(12_345);

    for (let index = 0; index < 10_000; index += 1) {
      const sample = nextFloat01(rng);
      expect(sample.value).toBeGreaterThanOrEqual(0);
      expect(sample.value).toBeLessThan(1);
      rng = sample.nextRng;
    }
  });

  it('samples integer ranges without escaping their bounds', () => {
    let rng = createRng('integer-bounds');

    for (let index = 0; index < 10_000; index += 1) {
      const sample = nextInt(rng, -17, 29);
      expect(Number.isInteger(sample.value)).toBe(true);
      expect(sample.value).toBeGreaterThanOrEqual(-17);
      expect(sample.value).toBeLessThan(29);
      rng = sample.nextRng;
    }

    const fullWidth = nextInt(createRng(99), -2_147_483_648, 2_147_483_648);
    expect(fullWidth.value).toBeGreaterThanOrEqual(-2_147_483_648);
    expect(fullWidth.value).toBeLessThan(2_147_483_648);
  });

  it('rejects out-of-window draws instead of introducing modulo bias', () => {
    const sample = nextInt(createRng(0), 0, 2_147_483_649);

    expect(sample.value).toBe(1_294_669_097);
    expect(sample.nextRng.drawCount).toBe(2);
  });

  it('rejects invalid integer ranges', () => {
    const rng = createRng(1);
    expect(() => nextInt(rng, 1, 1)).toThrow(RangeError);
    expect(() => nextInt(rng, 2, 1)).toThrow(RangeError);
    expect(() => nextInt(rng, 0.5, 2)).toThrow(RangeError);
    expect(() => nextInt(rng, 0, 0x1_0000_0001)).toThrow(RangeError);
  });

  it('samples collections deterministically and rejects empty input', () => {
    const values = Object.freeze(['alpha', 'beta', 'gamma']);
    const rng = createRng('sample');

    expect(sampleOne(rng, values)).toEqual(sampleOne(rng, values));
    expect(values).toEqual(['alpha', 'beta', 'gamma']);
    expect(() => sampleOne(rng, [])).toThrow(RangeError);
  });

  it('shuffles a copy deterministically and preserves the input', () => {
    const values = Object.freeze([1, 2, 3, 4, 5, 6]);
    const rng = createRng('shuffle');
    const first = shuffle(rng, values);
    const replay = shuffle(rng, values);

    expect(first).toEqual(replay);
    expect(first.value).not.toBe(values);
    expect(Object.isFrozen(first.value)).toBe(true);
    expect([...first.value].sort()).toEqual(values);
    expect(values).toEqual([1, 2, 3, 4, 5, 6]);
    expect(first.nextRng.drawCount).toBe(values.length - 1);
  });

  it('validates and normalizes RNG state even when shuffle draws nothing', () => {
    const mutableState: RngState = {
      algorithm: RNG_ALGORITHM,
      state: [1, 2, 3, 4],
      drawCount: 5,
    };
    const result = shuffle(mutableState, []);

    expect(result.nextRng).toEqual(mutableState);
    expect(result.nextRng).not.toBe(mutableState);
    expect(Object.isFrozen(result.nextRng)).toBe(true);
    expect(Object.isFrozen(result.nextRng.state)).toBe(true);
    expect(() =>
      shuffle(
        {
          algorithm: RNG_ALGORITHM,
          state: [0, 0, 0, 0],
          drawCount: 0,
        },
        [],
      ),
    ).toThrow(TypeError);
  });

  it('refuses an exhausted draw counter', () => {
    const exhausted: RngState = restoreRngState({
      algorithm: RNG_ALGORITHM,
      state: [1, 2, 3, 4],
      drawCount: Number.MAX_SAFE_INTEGER,
    });

    expect(() => nextUint32(exhausted)).toThrow(RangeError);
  });
});
