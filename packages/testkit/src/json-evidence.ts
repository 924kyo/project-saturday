import { isDeepStrictEqual } from 'node:util';

/** JSON has one zero. Preserve every other key/value and sparse array member. */
function normalizeSignedZero(value: unknown): unknown {
  if (typeof value === 'number' && Object.is(value, -0)) return 0;
  if (Array.isArray(value)) {
    const normalized = new Array<unknown>(value.length);
    for (const [key, item] of Object.entries(value))
      Object.defineProperty(normalized, key, {
        value: normalizeSignedZero(item),
        enumerable: true,
        writable: true,
        configurable: true,
      });
    return normalized;
  }
  if (typeof value === 'object' && value !== null)
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeSignedZero(item)]),
    );
  return value;
}

/** For validated plain domain records, not an unknown-input schema validator. */
export function matchesJsonEvidence(actual: unknown, expected: unknown): boolean {
  return isDeepStrictEqual(normalizeSignedZero(actual), normalizeSignedZero(expected));
}
