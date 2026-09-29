import { cloneSerializable, deepFreeze } from '../player/immutable.js';

/** Shared retained evidence, not a second football engine or a presentation RNG source. */
export const TACTICAL_POSITION_IDS = Object.freeze([
  'position_qb',
  'position_rb',
  'position_wr',
  'position_cb',
  'position_lb',
  'position_edge',
] as const);

export type TacticalPositionId = (typeof TACTICAL_POSITION_IDS)[number];

export interface TacticalSnapContextV1 {
  readonly model: 'tactical_snap_context_v1';
  readonly gameId: `game_${string}`;
  readonly snapIndex: number;
  readonly positionId: TacticalPositionId;
  readonly clock: {
    readonly period: 1 | 2 | 3 | 4;
    readonly secondsRemaining: number;
  };
  /** Coordinates always increase toward the offense's scoring goal line. */
  readonly field: {
    readonly offense: 'PLAYER' | 'OPPONENT';
    readonly driveIndex: number;
    readonly down: 1 | 2 | 3 | 4;
    readonly distanceYards: number;
    readonly lineOfScrimmageYards: number;
  };
  readonly score: { readonly playerTeam: number; readonly opponent: number };
  readonly decisionIds: readonly [
    `key_snap_decision_${string}`,
    `key_snap_decision_${string}`,
    `key_snap_decision_${string}`,
  ];
  readonly revealedClueIds: readonly `game_clue_${string}`[];
}

function record(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function integer(value: unknown, minimum: number, maximum: number): value is number {
  return (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum
  );
}

function stableId(value: unknown, prefix: string): value is string {
  return (
    typeof value === 'string' &&
    value.length > prefix.length &&
    value.length <= 200 &&
    value.startsWith(prefix) &&
    /^[a-z0-9_]+$/u.test(value)
  );
}

function ids(value: unknown, prefix: string, minimum: number, maximum: number): boolean {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) return false;
  // Reject holes and extra enumerable array properties, including future hidden evidence.
  return (
    Object.keys(value).length === value.length &&
    Array.from({ length: value.length }, (_, index) => index).every(
      (index) => Object.hasOwn(value, index) && stableId(value[index], prefix),
    ) &&
    new Set(value).size === value.length
  );
}

/** Structural validation only; the owning game's replay must also verify source equality. */
export function isTacticalSnapContextV1(value: unknown): value is TacticalSnapContextV1 {
  if (
    !record(value, [
      'model',
      'gameId',
      'snapIndex',
      'positionId',
      'clock',
      'field',
      'score',
      'decisionIds',
      'revealedClueIds',
    ]) ||
    value['model'] !== 'tactical_snap_context_v1' ||
    !stableId(value['gameId'], 'game_') ||
    !integer(value['snapIndex'], 0, 11) ||
    !TACTICAL_POSITION_IDS.includes(value['positionId'] as TacticalPositionId) ||
    !ids(value['decisionIds'], 'key_snap_decision_', 3, 3) ||
    !ids(value['revealedClueIds'], 'game_clue_', 0, 3)
  )
    return false;
  const clock = value['clock'];
  const field = value['field'];
  const score = value['score'];
  if (
    !record(clock, ['period', 'secondsRemaining']) ||
    !integer(clock['period'], 1, 4) ||
    !integer(clock['secondsRemaining'], 1, 900) ||
    !record(field, ['offense', 'driveIndex', 'down', 'distanceYards', 'lineOfScrimmageYards']) ||
    !integer(field['driveIndex'], 0, 200) ||
    !integer(field['down'], 1, 4) ||
    !integer(field['lineOfScrimmageYards'], 1, 99) ||
    !integer(field['distanceYards'], 1, 100 - field['lineOfScrimmageYards']) ||
    !record(score, ['playerTeam', 'opponent']) ||
    !integer(score['playerTeam'], 0, 200) ||
    !integer(score['opponent'], 0, 200)
  )
    return false;
  const offense = ['position_qb', 'position_rb', 'position_wr'].includes(
    value['positionId'] as string,
  );
  return field['offense'] === (offense ? 'PLAYER' : 'OPPONENT');
}

/** Never freeze or retain a caller-owned nested object. Historical absence stays absent. */
export function copyTacticalSnapContextV1(value: unknown): TacticalSnapContextV1 | undefined {
  return isTacticalSnapContextV1(value) ? deepFreeze(cloneSerializable(value)) : undefined;
}

/** Pending identity/information guard. Whole-game source replay remains the save reader's job. */
export function matchesTacticalSnapContextV1(
  value: unknown,
  expected: Pick<
    TacticalSnapContextV1,
    'gameId' | 'positionId' | 'snapIndex' | 'decisionIds' | 'revealedClueIds'
  >,
): value is TacticalSnapContextV1 {
  return (
    isTacticalSnapContextV1(value) &&
    value.gameId === expected.gameId &&
    value.positionId === expected.positionId &&
    value.snapIndex === expected.snapIndex &&
    value.decisionIds.every((id, index) => id === expected.decisionIds[index]) &&
    value.revealedClueIds.length === expected.revealedClueIds.length &&
    value.revealedClueIds.every((id, index) => id === expected.revealedClueIds[index])
  );
}
