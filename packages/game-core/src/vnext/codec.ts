import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import { utf8ByteLength } from '../player/utf8.js';
import { isRngState } from '../random/rng.js';
import {
  CAREER_VNEXT_MODEL,
  CAREER_VNEXT_REGULAR_SEASON_WEEKS,
  CAREER_VNEXT_VERSION,
  type CareerVNext,
} from './types.js';

export const CAREER_VNEXT_MAX_BYTES = 1_000_000;
const FLOW_TYPES = new Set([
  'RECRUITING',
  'WEEK_PLAN',
  'PRACTICE_REPORT',
  'BREAKTHROUGH',
  'EVENT',
  'INJURY',
  'GAME',
  'POST_GAME',
  'SEASON_END',
]);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function integer(value: unknown, minimum: number, maximum: number): value is number {
  return (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum
  );
}

/**
 * Lean integrity for a single-player offline save: exact model/version, structural invariants and
 * bounds. Commands are the only writers; the storage envelope checksum detects corruption.
 */
export function isCareerVNext(value: unknown): value is CareerVNext {
  if (!record(value)) return false;
  const { athlete, build, recruiting, season, flow, rng, log, condition } = value;
  if (
    value['model'] !== CAREER_VNEXT_MODEL ||
    value['version'] !== CAREER_VNEXT_VERSION ||
    typeof value['careerId'] !== 'string' ||
    typeof value['seed'] !== 'string' ||
    !integer(value['revision'], 0, Number.MAX_SAFE_INTEGER) ||
    !integer(value['contentVersion'], 1, 1_000) ||
    !record(rng) ||
    !isRngState(rng['career']) ||
    !record(athlete) ||
    !record(athlete['profile']) ||
    !record(athlete['profile']['state']) ||
    !integer(athlete['breakthroughGauge'], 0, 160) ||
    !record(build) ||
    !Array.isArray(build['equippedSkillIds']) ||
    build['equippedSkillIds'].length !== 4 ||
    !record(recruiting) ||
    !Array.isArray(recruiting['offers']) ||
    !record(season) ||
    !integer(season['weekIndex'], 0, CAREER_VNEXT_REGULAR_SEASON_WEEKS) ||
    !integer(season['sidelineCredit'], -6, 6) ||
    !record(flow) ||
    !FLOW_TYPES.has(String(flow['type'])) ||
    !record(condition) ||
    !Array.isArray(condition['injuryHistory']) ||
    !Array.isArray(condition['recentEvents']) ||
    !Array.isArray(condition['eventHistory']) ||
    !record(condition['nextGameModifiers']) ||
    !Array.isArray(log) ||
    log.length > CAREER_VNEXT_REGULAR_SEASON_WEEKS * 4
  )
    return false;
  const state = athlete['profile']['state'];
  for (const key of ['body', 'preparation', 'confidence', 'coachTrust'] as const)
    if (!integer(state[key], 0, 100)) return false;
  const committed = recruiting['committedProgramId'];
  const program = value['program'];
  // Committed career and program membership always agree; recruiting is the only pre-program phase.
  if (flow['type'] === 'RECRUITING') return committed === null && program === null;
  return (
    record(program) &&
    typeof committed === 'string' &&
    program['programId'] === committed &&
    record(season['world'])
  );
}

export function serializeCareerVNext(career: CareerVNext): string | null {
  if (!isCareerVNext(career)) return null;
  const json = JSON.stringify(career);
  return utf8ByteLength(json) < CAREER_VNEXT_MAX_BYTES ? json : null;
}

/**
 * v1 -> v2 added the weekly condition (injury, events, next-game modifiers). A v1 career had no
 * injuries or events, so the empty condition is its exact equivalent; logged games were all played
 * at full availability.
 */
function migrateV1(value: unknown): unknown {
  if (!record(value) || value['model'] !== CAREER_VNEXT_MODEL || value['version'] !== 1)
    return value;
  const log = Array.isArray(value['log']) ? value['log'] : [];
  const recap = (entry: unknown) =>
    record(entry) ? { ...entry, availabilityId: 'injury_availability_full' } : entry;
  const flow = value['flow'];
  return {
    ...value,
    version: 2,
    condition: {
      injury: null,
      injuryHistory: [],
      availability: null,
      recentEvents: [],
      eventHistory: [],
      nextGameModifiers: { clueBonus: 0, decisionScoreFlat: 0, exposureReductionPermille: 0 },
    },
    flow:
      record(flow) && flow['type'] === 'POST_GAME'
        ? { ...flow, recap: recap(flow['recap']) }
        : flow,
    log: log.map(recap),
  };
}

export function parseCareerVNext(json: string): CareerVNext | null {
  try {
    if (utf8ByteLength(json) >= CAREER_VNEXT_MAX_BYTES) return null;
    const value: unknown = migrateV1(JSON.parse(json));
    return isCareerVNext(value) ? deepFreeze(cloneSerializable(value)) : null;
  } catch {
    return null;
  }
}
