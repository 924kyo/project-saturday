import { cloneSerializable, deepFreeze } from './immutable.js';

export type ArchiveJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly ArchiveJsonValue[]
  | { readonly [key: string]: ArchiveJsonValue };
type ArchiveNode = null | boolean | number | string | readonly [0 | 1, ...number[]];
export interface JsonArchiveV1 {
  readonly model: 'json_archive_v1';
  readonly nodes: readonly ArchiveNode[];
  readonly rootIndex: number;
}

export const JSON_ARCHIVE_LIMITS = Object.freeze({
  expandedChars: 1_000_000,
  nodes: 100_000,
  depth: 64,
});
const invalid = Object.freeze({ ok: false as const });
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Original deterministic JSON subtree interning. Object key order stays literal. */
export function packJsonArchiveV1(value: unknown): JsonArchiveV1 | null {
  const nodes: ArchiveNode[] = [];
  const ids = new Map<string, number>();
  const ancestors = new Set<object>();
  let expandedChars = 0;
  function visit(input: unknown, depth: number): number {
    if (depth > JSON_ARCHIVE_LIMITS.depth) throw new Error('archive_depth');
    let node: ArchiveNode;
    if (
      input === null ||
      typeof input === 'boolean' ||
      typeof input === 'string' ||
      (typeof input === 'number' && Number.isFinite(input))
    ) {
      node = input === 0 ? 0 : input;
      expandedChars += JSON.stringify(node).length;
    } else if (typeof input === 'object' && input !== null) {
      if (ancestors.has(input)) throw new Error('archive_cycle');
      ancestors.add(input);
      if (Array.isArray(input)) {
        if (
          Object.keys(input).length !== input.length ||
          Reflect.ownKeys(input).length !== input.length + 1
        )
          throw new Error('archive_array');
        expandedChars += 2 + Math.max(0, input.length - 1);
        node = [0, ...input.map((item) => visit(item, depth + 1))];
      } else {
        if (
          ![Object.prototype, null].includes(Object.getPrototypeOf(input) as object | null) ||
          Reflect.ownKeys(input).length !== Object.keys(input).length
        )
          throw new Error('archive_object');
        const entries = Object.entries(input);
        expandedChars += 2 + Math.max(0, entries.length - 1) + entries.length;
        node = [
          1,
          ...entries.flatMap(([key, item]) => [visit(key, depth + 1), visit(item, depth + 1)]),
        ];
      }
      ancestors.delete(input);
    } else throw new Error('archive_non_json');
    if (expandedChars > JSON_ARCHIVE_LIMITS.expandedChars) throw new Error('archive_expansion');
    const key = JSON.stringify(node);
    const existing = ids.get(key);
    if (existing !== undefined) return existing;
    if (nodes.length >= JSON_ARCHIVE_LIMITS.nodes) throw new Error('archive_nodes');
    const index = nodes.length;
    nodes.push(node);
    ids.set(key, index);
    return index;
  }
  try {
    const rootIndex = visit(value, 0);
    return deepFreeze({ model: 'json_archive_v1', nodes, rootIndex });
  } catch {
    return null;
  }
}

/** Validate expansion costs before constructing each node; no forward references or cycles. */
export function unpackJsonArchiveV1(
  input: unknown,
): { readonly ok: true; readonly value: ArchiveJsonValue } | typeof invalid {
  if (
    !record(input) ||
    Object.keys(input).sort().join('|') !== 'model|nodes|rootIndex' ||
    input['model'] !== 'json_archive_v1' ||
    !Array.isArray(input['nodes']) ||
    input['nodes'].length < 1 ||
    input['nodes'].length > JSON_ARCHIVE_LIMITS.nodes ||
    input['rootIndex'] !== input['nodes'].length - 1
  )
    return invalid;
  const values: ArchiveJsonValue[] = [];
  const costs: number[] = [];
  const depths: number[] = [];
  try {
    for (const [index, node] of (input['nodes'] as unknown[]).entries()) {
      let value: ArchiveJsonValue;
      let cost: number;
      let depth = 0;
      if (
        node === null ||
        typeof node === 'boolean' ||
        typeof node === 'string' ||
        (typeof node === 'number' && Number.isFinite(node))
      ) {
        value = node === 0 ? 0 : node;
        cost = JSON.stringify(value).length;
      } else {
        if (
          !Array.isArray(node) ||
          node.length < 1 ||
          (node[0] !== 0 && node[0] !== 1) ||
          Object.keys(node).length !== node.length ||
          Reflect.ownKeys(node).length !== node.length + 1
        )
          return invalid;
        const refs = node.slice(1) as unknown[];
        if (
          refs.some(
            (ref) =>
              typeof ref !== 'number' || !Number.isSafeInteger(ref) || ref < 0 || ref >= index,
          )
        )
          return invalid;
        const references = refs as number[];
        depth = references.reduce((maximum, ref) => Math.max(maximum, depths[ref]! + 1), 0);
        cost = 2 + references.reduce((total, ref) => total + costs[ref]!, 0);
        if (node[0] === 0) cost += Math.max(0, references.length - 1);
        else {
          if (references.length % 2 !== 0) return invalid;
          const keyRefs = references.filter((_, slot) => slot % 2 === 0);
          if (
            keyRefs.some((ref) => typeof values[ref] !== 'string') ||
            new Set(keyRefs.map((ref) => values[ref])).size !== keyRefs.length
          )
            return invalid;
          cost += Math.max(0, keyRefs.length - 1) + keyRefs.length;
        }
        if (cost > JSON_ARCHIVE_LIMITS.expandedChars || depth > JSON_ARCHIVE_LIMITS.depth)
          return invalid;
        value =
          node[0] === 0
            ? references.map((ref) => values[ref]!)
            : Object.fromEntries(
                references.flatMap((ref, slot) =>
                  slot % 2 === 0 ? [[values[ref] as string, values[references[slot + 1]!]!]] : [],
                ),
              );
      }
      if (cost > JSON_ARCHIVE_LIMITS.expandedChars) return invalid;
      values.push(value);
      costs.push(cost);
      depths.push(depth);
    }
    const value = values.at(-1)!;
    // Reject unused, duplicate or reordered dictionary nodes, including hidden
    // extra properties that JSON serialization would otherwise discard.
    const canonical = packJsonArchiveV1(value);
    if (
      canonical === null ||
      Reflect.ownKeys(input).length !== 3 ||
      Object.keys(input['nodes']).length !== input['nodes'].length ||
      Reflect.ownKeys(input['nodes']).length !== input['nodes'].length + 1 ||
      JSON.stringify(canonical.nodes) !== JSON.stringify(input['nodes'])
    )
      return invalid;
    return deepFreeze({ ok: true as const, value: cloneSerializable(value) });
  } catch {
    return invalid;
  }
}
