export const RNG_ALGORITHM = 'xoshiro128ss-v1' as const;

export type RngSeed = number | string;

export interface RngState {
  readonly algorithm: typeof RNG_ALGORITHM;
  readonly state: readonly [number, number, number, number];
  readonly drawCount: number;
}

export interface RngSample<T> {
  readonly value: T;
  readonly nextRng: RngState;
}

const UINT32_MAX = 0xffff_ffff;
const UINT32_RANGE = 0x1_0000_0000;
const GOLDEN_RATIO_32 = 0x9e37_79b9;
const NUMBER_SEED_DOMAIN = 0x6d2b_79f5;
const STRING_SEED_DOMAIN = 0xa5a5_a5a5;
const FORK_DOMAIN = 0xf017_5eed;

function isUint32(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= UINT32_MAX;
}

function avalanche32(value: number): number {
  let mixed = value >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x21f0_aaad) >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 15), 0x735a_2d97) >>> 0;
  return (mixed ^ (mixed >>> 15)) >>> 0;
}

function hashUtf16(value: string): number {
  let hash = 0x811c_9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x0100_0193) >>> 0;
  }

  return hash >>> 0;
}

function normalizeSeed(seed: RngSeed): number {
  if (typeof seed === 'number') {
    if (!isUint32(seed)) {
      throw new RangeError('RNG numeric seeds must be unsigned 32-bit integers.');
    }

    return avalanche32(seed ^ NUMBER_SEED_DOMAIN);
  }

  if (seed.length === 0) {
    throw new RangeError('RNG string seeds must not be empty.');
  }

  return avalanche32(hashUtf16(seed) ^ STRING_SEED_DOMAIN);
}

function makeRngState(
  state: readonly [number, number, number, number],
  drawCount: number,
): RngState {
  const frozenState = Object.freeze([
    state[0] >>> 0,
    state[1] >>> 0,
    state[2] >>> 0,
    state[3] >>> 0,
  ] as [number, number, number, number]);

  return Object.freeze({
    algorithm: RNG_ALGORITHM,
    state: frozenState,
    drawCount,
  });
}

function expandSeed(seed: number): readonly [number, number, number, number] {
  let cursor = seed >>> 0;
  const words: [number, number, number, number] = [0, 0, 0, 0];

  for (let index = 0; index < words.length; index += 1) {
    cursor = (cursor + GOLDEN_RATIO_32) >>> 0;
    words[index] = avalanche32(cursor);
  }

  if (words.every((word) => word === 0)) {
    words[0] = GOLDEN_RATIO_32;
  }

  return words;
}

function rotateLeft32(value: number, amount: number): number {
  return ((value << amount) | (value >>> (32 - amount))) >>> 0;
}

function assertUsableRng(rng: RngState): void {
  if (!isRngState(rng)) {
    throw new TypeError('Invalid RNG state.');
  }

  if (rng.drawCount === Number.MAX_SAFE_INTEGER) {
    throw new RangeError('RNG draw count exhausted the safe integer range.');
  }
}

function freezeSample<T>(value: T, nextRng: RngState): RngSample<T> {
  return Object.freeze({ value, nextRng });
}

export function createRng(seed: RngSeed): RngState {
  return makeRngState(expandSeed(normalizeSeed(seed)), 0);
}

export function isRngState(value: unknown): value is RngState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as {
    readonly algorithm?: unknown;
    readonly state?: unknown;
    readonly drawCount?: unknown;
  };

  if (candidate.algorithm !== RNG_ALGORITHM || !Array.isArray(candidate.state)) {
    return false;
  }

  const state = candidate.state;
  const requiredIndexes = [0, 1, 2, 3] as const;
  if (
    state.length !== requiredIndexes.length ||
    !requiredIndexes.every((index) => Object.hasOwn(state, index) && isUint32(state[index]))
  ) {
    return false;
  }

  return (
    requiredIndexes.some((index) => state[index] !== 0) &&
    typeof candidate.drawCount === 'number' &&
    Number.isSafeInteger(candidate.drawCount) &&
    candidate.drawCount >= 0
  );
}

export function restoreRngState(value: unknown): RngState {
  if (!isRngState(value)) {
    throw new TypeError('Serialized value is not a valid RNG state.');
  }

  return makeRngState(
    [value.state[0], value.state[1], value.state[2], value.state[3]],
    value.drawCount,
  );
}

export function serializeRngState(rng: RngState): string {
  if (!isRngState(rng)) {
    throw new TypeError('Cannot serialize an invalid RNG state.');
  }

  return JSON.stringify({
    algorithm: rng.algorithm,
    state: [...rng.state],
    drawCount: rng.drawCount,
  });
}

export function deserializeRngState(serialized: string): RngState {
  let value: unknown;

  try {
    value = JSON.parse(serialized) as unknown;
  } catch {
    throw new TypeError('RNG state must be valid JSON.');
  }

  return restoreRngState(value);
}

export function nextUint32(rng: RngState): RngSample<number> {
  assertUsableRng(rng);

  const [state0, state1, state2, state3] = rng.state;
  const result = Math.imul(rotateLeft32(Math.imul(state1, 5) >>> 0, 7), 9) >>> 0;
  const shiftedState1 = (state1 << 9) >>> 0;

  let nextState2 = (state2 ^ state0) >>> 0;
  let nextState3 = (state3 ^ state1) >>> 0;
  const nextState1 = (state1 ^ nextState2) >>> 0;
  const nextState0 = (state0 ^ nextState3) >>> 0;
  nextState2 = (nextState2 ^ shiftedState1) >>> 0;
  nextState3 = rotateLeft32(nextState3, 11);

  return freezeSample(
    result,
    makeRngState([nextState0, nextState1, nextState2, nextState3], rng.drawCount + 1),
  );
}

export function nextFloat01(rng: RngState): RngSample<number> {
  const sample = nextUint32(rng);
  return freezeSample(sample.value / UINT32_RANGE, sample.nextRng);
}

export function nextInt(
  rng: RngState,
  minInclusive: number,
  maxExclusive: number,
): RngSample<number> {
  if (!Number.isSafeInteger(minInclusive) || !Number.isSafeInteger(maxExclusive)) {
    throw new RangeError('Integer range bounds must be safe integers.');
  }

  const span = maxExclusive - minInclusive;
  if (span <= 0 || span > UINT32_RANGE) {
    throw new RangeError('Integer range must be non-empty and no wider than 2^32.');
  }

  const acceptanceLimit = UINT32_RANGE - (UINT32_RANGE % span);
  let currentRng = rng;

  for (;;) {
    const sample = nextUint32(currentRng);
    currentRng = sample.nextRng;

    if (sample.value < acceptanceLimit) {
      return freezeSample(minInclusive + (sample.value % span), currentRng);
    }
  }
}

export function sampleOne<T>(rng: RngState, values: readonly T[]): RngSample<T> {
  if (values.length === 0) {
    throw new RangeError('Cannot sample from an empty collection.');
  }

  const indexSample = nextInt(rng, 0, values.length);
  return freezeSample(values[indexSample.value] as T, indexSample.nextRng);
}

export function shuffle<T>(rng: RngState, values: readonly T[]): RngSample<readonly T[]> {
  const shuffled = [...values];
  let currentRng = restoreRngState(rng);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndexSample = nextInt(currentRng, 0, index + 1);
    currentRng = swapIndexSample.nextRng;
    const swapIndex = swapIndexSample.value;
    const currentValue = shuffled[index] as T;
    shuffled[index] = shuffled[swapIndex] as T;
    shuffled[swapIndex] = currentValue;
  }

  return freezeSample(Object.freeze(shuffled), currentRng);
}

export function forkRng(rng: RngState, label: string): RngState {
  if (!isRngState(rng)) {
    throw new TypeError('Cannot fork an invalid RNG state.');
  }

  if (label.length === 0) {
    throw new RangeError('RNG fork labels must not be empty.');
  }

  let derivedSeed = avalanche32(hashUtf16(label) ^ FORK_DOMAIN);
  for (const word of rng.state) {
    derivedSeed = avalanche32(derivedSeed ^ word);
  }

  const drawCountLow = rng.drawCount % UINT32_RANGE;
  const drawCountHigh = Math.floor(rng.drawCount / UINT32_RANGE);
  derivedSeed = avalanche32(derivedSeed ^ drawCountLow);
  derivedSeed = avalanche32(derivedSeed ^ drawCountHigh);

  return createRng(derivedSeed);
}
