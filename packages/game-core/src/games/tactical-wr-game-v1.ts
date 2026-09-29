import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import type { CareerRunV7 } from '../player/types.js';
import { utf8ByteLength } from '../player/utf8.js';
import type { RngState } from '../random/rng.js';
import { collectEquippedGameHooks } from '../skills/effects.js';
import type { CollectedGameHook, SkillMechanicsDefinition } from '../skills/types.js';
import { isKeySnapDecisionId, type KeySnapDecisionId } from './ids.js';
import type { TacticalSnapContextV1 } from './tactical-context-v1.js';
import {
  advanceWrDriveEvidence,
  deriveWrGameCompletionEvidence,
  matchesExactWrEvidence,
  prepareWrKickoffEvidence,
  stageWrResolvedSnapBoundaryV1,
  type WrGameCompletionEvidence,
  type WrResolvedSnapBoundaryV1,
  type WrSimulationCursor,
} from './transitions.js';
import type {
  ActiveGameState,
  GameTuningDefinition,
  KeySnapFamilyMechanicsDefinition,
  KeySnapPatternMechanicsDefinition,
  PendingKeySnap,
} from './types.js';

/** Supplied by the owning content adapter, never serialized as caller-authored rules. */
export interface WrTacticalMechanicsV1 {
  readonly tuning: GameTuningDefinition;
  readonly families: readonly KeySnapFamilyMechanicsDefinition[];
  readonly patterns: readonly KeySnapPatternMechanicsDefinition[];
  readonly skills: readonly SkillMechanicsDefinition[];
}

export type WrTacticalGameBoundaryV1 =
  | { readonly type: 'GAME_PREVIEW' }
  | {
      readonly type: 'KEY_SNAP';
      readonly game: ActiveGameState;
      readonly pendingSnap: PendingKeySnap;
      readonly context: TacticalSnapContextV1;
      readonly rng: RngState;
    }
  | { readonly type: 'SNAP_RESOLVED'; readonly result: WrResolvedSnapBoundaryV1 }
  | {
      readonly type: 'POST_GAME';
      readonly completion: WrGameCompletionEvidence;
      readonly rng: RngState;
    };

/** Staged owning-engine record, not a shipping career/save envelope. */
export interface WrTacticalGameV1 {
  readonly model: 'wr_tactical_game_v1';
  /** Exact pre-kickoff preview only; the v7 validator excludes recursive tactical records. */
  readonly source: CareerRunV7;
  readonly revision: number;
  readonly decisions: readonly KeySnapDecisionId[];
  readonly boundary: WrTacticalGameBoundaryV1;
  /** Remains available independently of the next pending opportunity or final aggregate. */
  readonly lastResolvedPlay: WrResolvedSnapBoundaryV1['play'] | null;
}

const MAX_RECORD_BYTES = 1_000_000;

function fitsRecordBudget(value: unknown): boolean {
  try {
    const json = JSON.stringify(value);
    return (
      typeof json === 'string' &&
      json.length < MAX_RECORD_BYTES &&
      utf8ByteLength(json) < MAX_RECORD_BYTES
    );
  } catch {
    return false;
  }
}

function finishRecord(record: WrTacticalGameV1): WrTacticalGameV1 | undefined {
  return Number.isSafeInteger(record.revision) && fitsRecordBudget(record)
    ? deepFreeze(cloneSerializable(record))
    : undefined;
}

function nextBoundary(
  source: CareerRunV7,
  cursor: WrSimulationCursor,
  rng: RngState,
  hooks: readonly CollectedGameHook[],
  finishPlayerDrive: boolean,
  mechanics: WrTacticalMechanicsV1,
): WrTacticalGameBoundaryV1 | undefined {
  const advanced = advanceWrDriveEvidence(
    source,
    cursor,
    rng,
    mechanics.tuning,
    mechanics.families,
    mechanics.patterns,
    hooks,
    { rulesVersion: 'tactical_game_v1', finishPlayerDrive },
  );
  if (!advanced.ok) return undefined;
  if (advanced.type === 'KEY_SNAP') {
    if (advanced.tacticalContext === undefined) return undefined;
    return {
      type: 'KEY_SNAP',
      game: advanced.game,
      pendingSnap: advanced.pendingSnap,
      context: advanced.tacticalContext,
      rng: advanced.nextRng,
    };
  }
  return {
    type: 'POST_GAME',
    rng: advanced.nextRng,
    completion: deriveWrGameCompletionEvidence(
      source,
      cursor.matchup,
      advanced.score,
      cursor.statLine,
      cursor.keyPlayLog,
      cursor.gameRngDrawCountBefore,
      advanced.nextRng,
      mechanics.tuning,
      mechanics.families,
    ),
  };
}

/** Explicit new-game staging. A migrated historical preview must not call this implicitly. */
export function prepareWrTacticalGameV1(
  source: CareerRunV7,
  mechanics: WrTacticalMechanicsV1,
): WrTacticalGameV1 | undefined {
  if (!fitsRecordBudget(source)) return undefined;
  const kickoff = prepareWrKickoffEvidence(
    source,
    mechanics.tuning,
    mechanics.families,
    mechanics.patterns,
    mechanics.skills,
  );
  return !kickoff.ok
    ? undefined
    : finishRecord({
        model: 'wr_tactical_game_v1',
        source,
        revision: source.revision,
        decisions: [],
        boundary: { type: 'GAME_PREVIEW' },
        lastResolvedPlay: null,
      });
}

/** Start an explicitly prepared current record; zero opportunities go directly to final. */
export function createWrTacticalGameV1(
  source: CareerRunV7,
  mechanics: WrTacticalMechanicsV1,
): WrTacticalGameV1 | undefined {
  if (!fitsRecordBudget(source)) return undefined;
  const kickoff = prepareWrKickoffEvidence(
    source,
    mechanics.tuning,
    mechanics.families,
    mechanics.patterns,
    mechanics.skills,
  );
  if (!kickoff.ok) return undefined;
  const boundary = nextBoundary(
    source,
    kickoff.cursor,
    source.rng,
    kickoff.gameHooks,
    false,
    mechanics,
  );
  return boundary === undefined
    ? undefined
    : finishRecord({
        model: 'wr_tactical_game_v1',
        source,
        revision: source.revision + 1,
        decisions: [],
        boundary,
        lastResolvedPlay: null,
      });
}

function chooseUnchecked(
  record: WrTacticalGameV1,
  decisionId: KeySnapDecisionId,
  mechanics: WrTacticalMechanicsV1,
): WrTacticalGameV1 | undefined {
  if (record.boundary.type !== 'KEY_SNAP' || record.decisions.length >= 12) return undefined;
  const { game, pendingSnap, rng } = record.boundary;
  const source: CareerRunV7 = {
    ...record.source,
    revision: record.revision,
    rng,
    phase: { type: 'KEY_SNAP', game, pendingSnap },
  };
  // This bounded current source was reconstructed from a validated kickoff;
  // never mislabel its new evidence as a valid historical v7 persisted career.
  const resolved = stageWrResolvedSnapBoundaryV1(
    source,
    decisionId,
    mechanics.tuning,
    mechanics.families,
    mechanics.patterns,
    mechanics.skills,
  );
  return !resolved.ok
    ? undefined
    : finishRecord({
        ...record,
        revision: record.revision + 1,
        decisions: [...record.decisions, decisionId],
        boundary: { type: 'SNAP_RESOLVED', result: resolved.boundary },
        lastResolvedPlay: resolved.boundary.play,
      });
}

function advanceUnchecked(
  record: WrTacticalGameV1,
  mechanics: WrTacticalMechanicsV1,
): WrTacticalGameV1 | undefined {
  if (record.boundary.type !== 'SNAP_RESOLVED') return undefined;
  const hooks = collectEquippedGameHooks(record.source.player.skillState, mechanics.skills);
  if (!hooks.ok) return undefined;
  const { result } = record.boundary;
  const boundary = nextBoundary(
    record.source,
    result.continuation,
    result.nextRng,
    hooks.hooks,
    result.finishPlayerDrive,
    mechanics,
  );
  return boundary === undefined
    ? undefined
    : finishRecord({ ...record, revision: record.revision + 1, boundary });
}

/** Full source-to-boundary replay. Supplied current mechanics are validated at kickoff. */
export function isWrTacticalGameV1(
  value: unknown,
  mechanics: WrTacticalMechanicsV1,
): value is WrTacticalGameV1 {
  try {
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value) ||
      !fitsRecordBudget(value)
    )
      return false;
    const record = value as Readonly<Record<string, unknown>>;
    const keys = ['model', 'source', 'revision', 'decisions', 'boundary', 'lastResolvedPlay'];
    if (
      Object.keys(record).length !== keys.length ||
      !keys.every((key) => Object.hasOwn(record, key)) ||
      record['model'] !== 'wr_tactical_game_v1'
    )
      return false;
    const decisions = record['decisions'];
    const boundary = record['boundary'];
    if (
      !Array.isArray(decisions) ||
      decisions.length > 12 ||
      Object.keys(decisions).length !== decisions.length ||
      !Array.from({ length: decisions.length }, (_, index) => index).every(
        (index) => Object.hasOwn(decisions, index) && isKeySnapDecisionId(decisions[index]),
      ) ||
      typeof boundary !== 'object' ||
      boundary === null ||
      !('type' in boundary) ||
      !['GAME_PREVIEW', 'KEY_SNAP', 'SNAP_RESOLVED', 'POST_GAME'].includes(String(boundary.type))
    )
      return false;
    let expected =
      boundary.type === 'GAME_PREVIEW'
        ? prepareWrTacticalGameV1(record['source'] as CareerRunV7, mechanics)
        : createWrTacticalGameV1(record['source'] as CareerRunV7, mechanics);
    if (expected === undefined) return false;
    for (let index = 0; index < decisions.length; index += 1) {
      expected = chooseUnchecked(expected, decisions[index] as KeySnapDecisionId, mechanics);
      if (expected === undefined) return false;
      if (index < decisions.length - 1 || boundary.type !== 'SNAP_RESOLVED') {
        expected = advanceUnchecked(expected, mechanics);
        if (expected === undefined) return false;
      }
    }
    return matchesExactWrEvidence(value, expected);
  } catch {
    return false;
  }
}

export function chooseWrTacticalSnapV1(
  record: WrTacticalGameV1,
  decisionId: KeySnapDecisionId,
  mechanics: WrTacticalMechanicsV1,
): WrTacticalGameV1 | undefined {
  return isWrTacticalGameV1(record, mechanics)
    ? chooseUnchecked(record, decisionId, mechanics)
    : undefined;
}

export function startWrTacticalGameV1(
  record: WrTacticalGameV1,
  mechanics: WrTacticalMechanicsV1,
): WrTacticalGameV1 | undefined {
  return isWrTacticalGameV1(record, mechanics) && record.boundary.type === 'GAME_PREVIEW'
    ? createWrTacticalGameV1(record.source, mechanics)
    : undefined;
}

export function advanceWrTacticalGameV1(
  record: WrTacticalGameV1,
  mechanics: WrTacticalMechanicsV1,
): WrTacticalGameV1 | undefined {
  return isWrTacticalGameV1(record, mechanics) ? advanceUnchecked(record, mechanics) : undefined;
}

export function parseWrTacticalGameV1(
  value: unknown,
  mechanics: WrTacticalMechanicsV1,
): WrTacticalGameV1 | undefined {
  try {
    if (
      typeof value === 'string' &&
      (value.length >= MAX_RECORD_BYTES || utf8ByteLength(value) >= MAX_RECORD_BYTES)
    )
      return undefined;
    const decoded: unknown = typeof value === 'string' ? JSON.parse(value) : value;
    return isWrTacticalGameV1(decoded, mechanics)
      ? deepFreeze(cloneSerializable(decoded))
      : undefined;
  } catch {
    return undefined;
  }
}
