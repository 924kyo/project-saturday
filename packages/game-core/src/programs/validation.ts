import {
  BODY_BOUNDS,
  COACH_TRUST_BOUNDS,
  CONFIDENCE_BOUNDS,
  PREPARATION_BOUNDS,
  isIntegerWithinBounds,
} from '../player/bounds.js';
import { isPlayerId, isProgramId, isWrArchetypeId } from '../player/ids.js';
import {
  isDepthRoleId,
  isProgramOffenseStyleId,
  isProjectedDepthBandId,
  isRecruitTierId,
  isRosterFamilyNameId,
  isRosterGivenNameId,
  isRosterPlayerId,
  isRotationPolicyId,
} from './ids.js';
import {
  DEPTH_COMPONENT_BOUNDS,
  DEPTH_EVALUATION_WEIGHTS_PERMILLE,
  DEPTH_HYSTERESIS_THRESHOLD_MILLI,
  DEPTH_SCORE_MILLI_BOUNDS,
  COACH_TRUST_WEEKLY_SCORE_BANDS,
  PRACTICE_BODY_NEUTRAL_POINT,
  PRACTICE_BODY_POINTS_PER_SCORE,
  PRACTICE_CONFIDENCE_NEUTRAL_POINT,
  PRACTICE_CONFIDENCE_POINTS_PER_SCORE,
  PRACTICE_PREPARATION_POINTS_PER_SCORE,
  PRACTICE_PREPARATION_TARGET_BY_ROLE,
  PRACTICE_FORM_PREVIOUS_WEIGHT_PERMILLE,
  PRACTICE_FORM_WEEKLY_WEIGHT_PERMILLE,
  PRACTICE_WEEKLY_SCORE_BASE,
  RECRUIT_BACKGROUND_MODIFIER_BOUNDS,
  RECRUIT_SCORE_BOUNDS,
  RECRUITING_OFFER_COUNT,
  ROSTER_GENERATION_MIN_RNG_DRAWS,
  SNAP_SHARE_PERMILLE_BOUNDS,
  WR_ROOM_COMPETITOR_COUNT,
  WR_ROOM_PARTICIPANT_COUNT,
  depthRoleIdForRank,
  deriveRecruitTierId,
} from './tuning.js';

export type ProgramStateInvariantIssueCode =
  | 'invariant.duplicate_value'
  | 'invariant.invalid_combination'
  | 'invariant.invalid_id'
  | 'invariant.invalid_type'
  | 'invariant.invalid_value'
  | 'invariant.missing_field'
  | 'invariant.noncanonical_order'
  | 'invariant.out_of_bounds'
  | 'invariant.unknown_field';

export interface ProgramStateInvariantIssue {
  readonly code: ProgramStateInvariantIssueCode;
  readonly path: string;
}

export interface ProgramStateValidationInput {
  readonly programId: unknown;
  readonly recruitingState: unknown;
  readonly programContext: unknown;
  readonly playerId: unknown;
  readonly playerCoachTrust: unknown;
  readonly careerWeekIndex: number;
  readonly careerRngDrawCount: number;
  readonly phaseDepthUpdate: unknown;
  readonly weeklyExperienceVersion?: unknown;
  readonly currentProgramIdOverride?: unknown;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function add(
  issues: ProgramStateInvariantIssue[],
  code: ProgramStateInvariantIssueCode,
  path: string,
): void {
  issues.push({ code, path });
}

function strictRecord(
  value: unknown,
  path: string,
  keys: readonly string[],
  issues: ProgramStateInvariantIssue[],
): UnknownRecord | undefined {
  if (!isRecord(value)) {
    add(issues, 'invariant.invalid_type', path);
    return undefined;
  }
  const expected = new Set(keys);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) {
      add(issues, 'invariant.missing_field', `${path}.${key}`);
    }
  }
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) {
      add(issues, 'invariant.unknown_field', `${path}.${key}`);
    }
  }
  return value;
}

function denseArray(
  value: unknown,
  path: string,
  length: number,
  issues: ProgramStateInvariantIssue[],
): readonly unknown[] | undefined {
  if (!Array.isArray(value)) {
    add(issues, 'invariant.invalid_type', path);
    return undefined;
  }
  if (value.length !== length) {
    add(issues, 'invariant.invalid_combination', path);
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      add(issues, 'invariant.missing_field', `${path}.${index}`);
    }
  }
  return value;
}

function safeNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function integerIn(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

const OFFER_KEYS = [
  'programId',
  'interest',
  'schemeFit',
  'priority',
  'projectedDepthBandId',
] as const;
const PROFILE_KEYS = [
  'recruitAbilityScore',
  'backgroundModifier',
  'recruitScore',
  'recruitTierId',
  'offers',
] as const;
const COMMITTED_KEYS = [
  'type',
  ...PROFILE_KEYS,
  'selectedProgramId',
  'selectedAtWeekIndex',
  'rosterRngDrawCountBefore',
  'rosterRngDrawCountAfter',
] as const;

interface RecruitingSummary {
  readonly type: string | undefined;
  readonly selectedProgramId: string | undefined;
  readonly committed: boolean;
}

function validateRecruitingState(
  value: unknown,
  careerWeekIndex: number,
  careerRngDrawCount: number,
  issues: ProgramStateInvariantIssue[],
): RecruitingSummary {
  const path = 'career.recruitingState';
  const type = isRecord(value) ? value['type'] : undefined;
  if (type === 'NOT_STARTED') {
    strictRecord(value, path, ['type'], issues);
    return { type, selectedProgramId: undefined, committed: false };
  }
  if (type !== 'CHOOSING' && type !== 'COMMITTED') {
    strictRecord(value, path, ['type'], issues);
    add(issues, 'invariant.invalid_value', `${path}.type`);
    return {
      type: typeof type === 'string' ? type : undefined,
      selectedProgramId: undefined,
      committed: false,
    };
  }

  const state = strictRecord(
    value,
    path,
    type === 'COMMITTED' ? COMMITTED_KEYS : ['type', ...PROFILE_KEYS],
    issues,
  );
  if (state === undefined) {
    return { type, selectedProgramId: undefined, committed: type === 'COMMITTED' };
  }

  if (
    !integerIn(state['recruitAbilityScore'], RECRUIT_SCORE_BOUNDS.min, RECRUIT_SCORE_BOUNDS.max)
  ) {
    add(issues, 'invariant.out_of_bounds', `${path}.recruitAbilityScore`);
  }
  if (
    !integerIn(
      state['backgroundModifier'],
      RECRUIT_BACKGROUND_MODIFIER_BOUNDS.min,
      RECRUIT_BACKGROUND_MODIFIER_BOUNDS.max,
    )
  ) {
    add(issues, 'invariant.out_of_bounds', `${path}.backgroundModifier`);
  }
  if (!integerIn(state['recruitScore'], RECRUIT_SCORE_BOUNDS.min, RECRUIT_SCORE_BOUNDS.max)) {
    add(issues, 'invariant.out_of_bounds', `${path}.recruitScore`);
  }
  if (
    Number.isInteger(state['recruitAbilityScore']) &&
    Number.isInteger(state['backgroundModifier']) &&
    Number.isInteger(state['recruitScore'])
  ) {
    const expected = Math.min(
      RECRUIT_SCORE_BOUNDS.max,
      Math.max(
        RECRUIT_SCORE_BOUNDS.min,
        (state['recruitAbilityScore'] as number) + (state['backgroundModifier'] as number),
      ),
    );
    if (state['recruitScore'] !== expected) {
      add(issues, 'invariant.invalid_combination', `${path}.recruitScore`);
    }
  }
  if (!isRecruitTierId(state['recruitTierId'])) {
    add(issues, 'invariant.invalid_id', `${path}.recruitTierId`);
  } else if (
    Number.isInteger(state['recruitScore']) &&
    state['recruitTierId'] !== deriveRecruitTierId(state['recruitScore'] as number)
  ) {
    add(issues, 'invariant.invalid_combination', `${path}.recruitTierId`);
  }

  const offers = denseArray(state['offers'], `${path}.offers`, RECRUITING_OFFER_COUNT, issues);
  const seenProgramIds = new Set<string>();
  let previousPriority = Number.POSITIVE_INFINITY;
  let previousProgramId = '';
  if (offers !== undefined) {
    for (const [index, rawOffer] of offers.entries()) {
      const offerPath = `${path}.offers.${index}`;
      const offer = strictRecord(rawOffer, offerPath, OFFER_KEYS, issues);
      if (offer === undefined) {
        continue;
      }
      if (!isProgramId(offer['programId'])) {
        add(issues, 'invariant.invalid_id', `${offerPath}.programId`);
      } else {
        if (seenProgramIds.has(offer['programId'])) {
          add(issues, 'invariant.duplicate_value', `${offerPath}.programId`);
        }
        seenProgramIds.add(offer['programId']);
      }
      for (const field of ['interest', 'schemeFit'] as const) {
        if (!integerIn(offer[field], field === 'interest' ? 1 : 0, 100)) {
          add(issues, 'invariant.out_of_bounds', `${offerPath}.${field}`);
        }
      }
      if (!integerIn(offer['priority'], 0, 300)) {
        add(issues, 'invariant.out_of_bounds', `${offerPath}.priority`);
      } else if (
        Number.isInteger(offer['interest']) &&
        Number.isInteger(offer['schemeFit']) &&
        offer['priority'] !== (offer['interest'] as number) * 2 + (offer['schemeFit'] as number)
      ) {
        add(issues, 'invariant.invalid_combination', `${offerPath}.priority`);
      }
      if (!isProjectedDepthBandId(offer['projectedDepthBandId'])) {
        add(issues, 'invariant.invalid_id', `${offerPath}.projectedDepthBandId`);
      }
      if (typeof offer['priority'] === 'number' && typeof offer['programId'] === 'string') {
        const orderInvalid =
          offer['priority'] > previousPriority ||
          (offer['priority'] === previousPriority &&
            compareCodeUnits(offer['programId'], previousProgramId) < 0);
        if (index > 0 && orderInvalid) {
          add(issues, 'invariant.noncanonical_order', offerPath);
        }
        previousPriority = offer['priority'];
        previousProgramId = offer['programId'];
      }
    }
  }

  if (type === 'COMMITTED') {
    if (!isProgramId(state['selectedProgramId'])) {
      add(issues, 'invariant.invalid_id', `${path}.selectedProgramId`);
    } else if (!seenProgramIds.has(state['selectedProgramId'])) {
      add(issues, 'invariant.invalid_combination', `${path}.selectedProgramId`);
    }
    if (
      !safeNonNegativeInteger(state['selectedAtWeekIndex']) ||
      (state['selectedAtWeekIndex'] as number) > careerWeekIndex
    ) {
      add(issues, 'invariant.out_of_bounds', `${path}.selectedAtWeekIndex`);
    }
    const before = state['rosterRngDrawCountBefore'];
    const after = state['rosterRngDrawCountAfter'];
    if (!safeNonNegativeInteger(before)) {
      add(issues, 'invariant.out_of_bounds', `${path}.rosterRngDrawCountBefore`);
    }
    if (!safeNonNegativeInteger(after)) {
      add(issues, 'invariant.out_of_bounds', `${path}.rosterRngDrawCountAfter`);
    }
    if (
      safeNonNegativeInteger(before) &&
      safeNonNegativeInteger(after) &&
      (after - before < ROSTER_GENERATION_MIN_RNG_DRAWS || after > careerRngDrawCount)
    ) {
      add(issues, 'invariant.invalid_combination', `${path}.rosterRngDrawCountAfter`);
    }
  }

  return {
    type,
    selectedProgramId:
      type === 'COMMITTED' && typeof state['selectedProgramId'] === 'string'
        ? state['selectedProgramId']
        : undefined,
    committed: type === 'COMMITTED',
  };
}

const SNAP_KEYS = ['rank', 'roleId', 'minSnapPermille', 'maxSnapPermille'] as const;

function validateSnapProjection(
  value: unknown,
  path: string,
  issues: ProgramStateInvariantIssue[],
): UnknownRecord | undefined {
  const projection = strictRecord(value, path, SNAP_KEYS, issues);
  if (projection === undefined) {
    return undefined;
  }
  if (!integerIn(projection['rank'], 1, WR_ROOM_PARTICIPANT_COUNT)) {
    add(issues, 'invariant.out_of_bounds', `${path}.rank`);
  }
  if (!isDepthRoleId(projection['roleId'])) {
    add(issues, 'invariant.invalid_id', `${path}.roleId`);
  } else if (
    Number.isInteger(projection['rank']) &&
    projection['roleId'] !== depthRoleIdForRank(projection['rank'] as number)
  ) {
    add(issues, 'invariant.invalid_combination', `${path}.roleId`);
  }
  for (const field of ['minSnapPermille', 'maxSnapPermille'] as const) {
    if (
      !integerIn(projection[field], SNAP_SHARE_PERMILLE_BOUNDS.min, SNAP_SHARE_PERMILLE_BOUNDS.max)
    ) {
      add(issues, 'invariant.out_of_bounds', `${path}.${field}`);
    }
  }
  if (
    Number.isInteger(projection['minSnapPermille']) &&
    Number.isInteger(projection['maxSnapPermille']) &&
    (projection['minSnapPermille'] as number) > (projection['maxSnapPermille'] as number)
  ) {
    add(issues, 'invariant.invalid_combination', path);
  }
  return projection;
}

const DEPTH_UPDATE_KEYS = [
  'weekIndex',
  'practiceFormBefore',
  'weeklyPracticeScore',
  'practiceFormAfter',
  'coachTrustBefore',
  'requestedCoachTrustDelta',
  'actualCoachTrustDelta',
  'coachTrustAfter',
  'rankBefore',
  'rankAfter',
  'roleBefore',
  'roleAfter',
  'snapProjectionBefore',
  'snapProjectionAfter',
  'hysteresisThresholdMilli',
  'movement',
  'neighborParticipantId',
] as const;
const PRACTICE_GRADE_KEYS = [
  'model',
  'baseScore',
  'focusImpact',
  'bodyAfterFocus',
  'bodyContribution',
  'preparationAfterFocus',
  'preparationTarget',
  'preparationContribution',
  'confidenceAfterFocus',
  'confidenceContribution',
] as const;

function sameSnapProjection(left: unknown, right: unknown): boolean {
  return isRecord(left) && isRecord(right) && SNAP_KEYS.every((key) => left[key] === right[key]);
}

function sameDepthUpdate(left: unknown, right: unknown): boolean {
  if (left === null || right === null) {
    return left === right;
  }
  if (!isRecord(left) || !isRecord(right)) {
    return false;
  }
  const leftHasGrade = Object.hasOwn(left, 'practiceGrade');
  const rightHasGrade = Object.hasOwn(right, 'practiceGrade');
  if (leftHasGrade !== rightHasGrade) {
    return false;
  }
  const baseSame = DEPTH_UPDATE_KEYS.every((key) =>
    key === 'snapProjectionBefore' || key === 'snapProjectionAfter'
      ? sameSnapProjection(left[key], right[key])
      : left[key] === right[key],
  );
  if (!baseSame || !leftHasGrade) {
    return baseSame;
  }
  const leftGrade = left['practiceGrade'];
  const rightGrade = right['practiceGrade'];
  return (
    isRecord(leftGrade) &&
    isRecord(rightGrade) &&
    PRACTICE_GRADE_KEYS.every((key) => leftGrade[key] === rightGrade[key])
  );
}

function validateDepthUpdate(
  value: unknown,
  path: string,
  input: Pick<ProgramStateValidationInput, 'careerWeekIndex' | 'playerCoachTrust'>,
  participantIds: ReadonlySet<string> | undefined,
  expectedPracticeForm: number | undefined,
  expectExperience: boolean | undefined,
  issues: ProgramStateInvariantIssue[],
): UnknownRecord | undefined {
  if (value === null) {
    if (expectExperience === true) {
      add(issues, 'invariant.invalid_combination', path);
    }
    return undefined;
  }
  const hasPracticeGrade = isRecord(value) && Object.hasOwn(value, 'practiceGrade');
  if (expectExperience === true && !hasPracticeGrade) {
    add(issues, 'invariant.missing_field', `${path}.practiceGrade`);
  }
  if (expectExperience === false && hasPracticeGrade) {
    add(issues, 'invariant.unknown_field', `${path}.practiceGrade`);
  }
  const update = strictRecord(
    value,
    path,
    hasPracticeGrade ? [...DEPTH_UPDATE_KEYS, 'practiceGrade'] : DEPTH_UPDATE_KEYS,
    issues,
  );
  if (update === undefined) {
    return undefined;
  }
  if (
    !safeNonNegativeInteger(update['weekIndex']) ||
    (update['weekIndex'] as number) > input.careerWeekIndex
  ) {
    add(issues, 'invariant.out_of_bounds', `${path}.weekIndex`);
  }
  for (const field of ['practiceFormBefore', 'weeklyPracticeScore', 'practiceFormAfter'] as const) {
    if (!integerIn(update[field], DEPTH_COMPONENT_BOUNDS.min, DEPTH_COMPONENT_BOUNDS.max)) {
      add(issues, 'invariant.out_of_bounds', `${path}.${field}`);
    }
  }
  if (
    Number.isInteger(update['practiceFormBefore']) &&
    Number.isInteger(update['weeklyPracticeScore']) &&
    update['practiceFormAfter'] !==
      Math.round(
        ((update['practiceFormBefore'] as number) * PRACTICE_FORM_PREVIOUS_WEIGHT_PERMILLE +
          (update['weeklyPracticeScore'] as number) * PRACTICE_FORM_WEEKLY_WEIGHT_PERMILLE) /
          1_000,
      )
  ) {
    add(issues, 'invariant.invalid_combination', `${path}.practiceFormAfter`);
  }
  for (const field of ['coachTrustBefore', 'coachTrustAfter'] as const) {
    if (!isIntegerWithinBounds(update[field], COACH_TRUST_BOUNDS)) {
      add(issues, 'invariant.out_of_bounds', `${path}.${field}`);
    }
  }
  for (const field of ['requestedCoachTrustDelta', 'actualCoachTrustDelta'] as const) {
    if (!integerIn(update[field], -100, 100)) {
      add(issues, 'invariant.out_of_bounds', `${path}.${field}`);
    }
  }
  if (Number.isInteger(update['weeklyPracticeScore'])) {
    const expectedRequestedDelta =
      COACH_TRUST_WEEKLY_SCORE_BANDS.find(
        ({ maxScore }) => (update['weeklyPracticeScore'] as number) <= maxScore,
      )?.delta ?? 0;
    if (update['requestedCoachTrustDelta'] !== expectedRequestedDelta) {
      add(issues, 'invariant.invalid_combination', `${path}.requestedCoachTrustDelta`);
    }
  }
  if (
    Number.isInteger(update['coachTrustBefore']) &&
    Number.isInteger(update['requestedCoachTrustDelta'])
  ) {
    const expectedCoachTrustAfter = Math.min(
      COACH_TRUST_BOUNDS.max,
      Math.max(
        COACH_TRUST_BOUNDS.min,
        (update['coachTrustBefore'] as number) + (update['requestedCoachTrustDelta'] as number),
      ),
    );
    if (update['coachTrustAfter'] !== expectedCoachTrustAfter) {
      add(issues, 'invariant.invalid_combination', `${path}.coachTrustAfter`);
    }
  }
  if (
    Number.isInteger(update['coachTrustBefore']) &&
    Number.isInteger(update['coachTrustAfter']) &&
    update['actualCoachTrustDelta'] !==
      (update['coachTrustAfter'] as number) - (update['coachTrustBefore'] as number)
  ) {
    add(issues, 'invariant.invalid_combination', `${path}.actualCoachTrustDelta`);
  }
  if (expectedPracticeForm !== undefined && update['practiceFormAfter'] !== expectedPracticeForm) {
    add(issues, 'invariant.invalid_combination', `${path}.practiceFormAfter`);
  }
  if (
    Number.isInteger(input.playerCoachTrust) &&
    update['coachTrustAfter'] !== input.playerCoachTrust
  ) {
    add(issues, 'invariant.invalid_combination', `${path}.coachTrustAfter`);
  }
  for (const field of ['rankBefore', 'rankAfter'] as const) {
    if (!integerIn(update[field], 1, WR_ROOM_PARTICIPANT_COUNT)) {
      add(issues, 'invariant.out_of_bounds', `${path}.${field}`);
    }
  }
  if (
    Number.isInteger(update['rankBefore']) &&
    Number.isInteger(update['rankAfter']) &&
    Math.abs((update['rankAfter'] as number) - (update['rankBefore'] as number)) > 1
  ) {
    add(issues, 'invariant.invalid_combination', `${path}.rankAfter`);
  }
  for (const [roleField, rankField] of [
    ['roleBefore', 'rankBefore'],
    ['roleAfter', 'rankAfter'],
  ] as const) {
    if (!isDepthRoleId(update[roleField])) {
      add(issues, 'invariant.invalid_id', `${path}.${roleField}`);
    } else if (
      Number.isInteger(update[rankField]) &&
      update[roleField] !== depthRoleIdForRank(update[rankField] as number)
    ) {
      add(issues, 'invariant.invalid_combination', `${path}.${roleField}`);
    }
  }
  if (hasPracticeGrade) {
    const grade = strictRecord(
      update['practiceGrade'],
      `${path}.practiceGrade`,
      PRACTICE_GRADE_KEYS,
      issues,
    );
    if (grade !== undefined) {
      if (grade['model'] !== 'experience_v1') {
        add(issues, 'invariant.invalid_value', `${path}.practiceGrade.model`);
      }
      if (grade['baseScore'] !== PRACTICE_WEEKLY_SCORE_BASE) {
        add(issues, 'invariant.invalid_combination', `${path}.practiceGrade.baseScore`);
      }
      if (!integerIn(grade['focusImpact'], -75, 75)) {
        add(issues, 'invariant.out_of_bounds', `${path}.practiceGrade.focusImpact`);
      }
      if (!isIntegerWithinBounds(grade['bodyAfterFocus'], BODY_BOUNDS)) {
        add(issues, 'invariant.out_of_bounds', `${path}.practiceGrade.bodyAfterFocus`);
      }
      if (!isIntegerWithinBounds(grade['preparationAfterFocus'], PREPARATION_BOUNDS)) {
        add(issues, 'invariant.out_of_bounds', `${path}.practiceGrade.preparationAfterFocus`);
      }
      if (!isIntegerWithinBounds(grade['confidenceAfterFocus'], CONFIDENCE_BOUNDS)) {
        add(issues, 'invariant.out_of_bounds', `${path}.practiceGrade.confidenceAfterFocus`);
      }
      for (const field of [
        'bodyContribution',
        'preparationContribution',
        'confidenceContribution',
      ] as const) {
        if (!integerIn(grade[field], -100, 100)) {
          add(issues, 'invariant.out_of_bounds', `${path}.practiceGrade.${field}`);
        }
      }
      if (
        Number.isInteger(grade['bodyAfterFocus']) &&
        grade['bodyContribution'] !==
          Math.round(
            ((grade['bodyAfterFocus'] as number) - PRACTICE_BODY_NEUTRAL_POINT) /
              PRACTICE_BODY_POINTS_PER_SCORE,
          )
      ) {
        add(issues, 'invariant.invalid_combination', `${path}.practiceGrade.bodyContribution`);
      }
      const expectedPreparationTarget = isDepthRoleId(update['roleBefore'])
        ? PRACTICE_PREPARATION_TARGET_BY_ROLE[update['roleBefore']]
        : undefined;
      if (
        expectedPreparationTarget === undefined ||
        grade['preparationTarget'] !== expectedPreparationTarget
      ) {
        add(issues, 'invariant.invalid_combination', `${path}.practiceGrade.preparationTarget`);
      }
      if (
        Number.isInteger(grade['preparationAfterFocus']) &&
        Number.isInteger(grade['preparationTarget']) &&
        grade['preparationContribution'] !==
          Math.round(
            ((grade['preparationAfterFocus'] as number) - (grade['preparationTarget'] as number)) /
              PRACTICE_PREPARATION_POINTS_PER_SCORE,
          )
      ) {
        add(
          issues,
          'invariant.invalid_combination',
          `${path}.practiceGrade.preparationContribution`,
        );
      }
      if (
        Number.isInteger(grade['confidenceAfterFocus']) &&
        grade['confidenceContribution'] !==
          Math.round(
            ((grade['confidenceAfterFocus'] as number) - PRACTICE_CONFIDENCE_NEUTRAL_POINT) /
              PRACTICE_CONFIDENCE_POINTS_PER_SCORE,
          )
      ) {
        add(
          issues,
          'invariant.invalid_combination',
          `${path}.practiceGrade.confidenceContribution`,
        );
      }
      if (
        [
          'baseScore',
          'focusImpact',
          'bodyContribution',
          'preparationContribution',
          'confidenceContribution',
        ].every((field) => Number.isInteger(grade[field]))
      ) {
        const expectedScore = Math.min(
          DEPTH_COMPONENT_BOUNDS.max,
          Math.max(
            DEPTH_COMPONENT_BOUNDS.min,
            (grade['baseScore'] as number) +
              (grade['focusImpact'] as number) +
              (grade['bodyContribution'] as number) +
              (grade['preparationContribution'] as number) +
              (grade['confidenceContribution'] as number),
          ),
        );
        if (update['weeklyPracticeScore'] !== expectedScore) {
          add(issues, 'invariant.invalid_combination', `${path}.weeklyPracticeScore`);
        }
      }
    }
  }
  const before = validateSnapProjection(
    update['snapProjectionBefore'],
    `${path}.snapProjectionBefore`,
    issues,
  );
  const after = validateSnapProjection(
    update['snapProjectionAfter'],
    `${path}.snapProjectionAfter`,
    issues,
  );
  if (before !== undefined && before['rank'] !== update['rankBefore']) {
    add(issues, 'invariant.invalid_combination', `${path}.snapProjectionBefore.rank`);
  }
  if (after !== undefined && after['rank'] !== update['rankAfter']) {
    add(issues, 'invariant.invalid_combination', `${path}.snapProjectionAfter.rank`);
  }
  if (update['hysteresisThresholdMilli'] !== DEPTH_HYSTERESIS_THRESHOLD_MILLI) {
    add(issues, 'invariant.invalid_combination', `${path}.hysteresisThresholdMilli`);
  }
  const movement = update['movement'];
  const rankBefore = update['rankBefore'];
  const rankAfter = update['rankAfter'];
  const validMovement =
    (movement === 'HELD' && rankAfter === rankBefore) ||
    (movement === 'PROMOTED' && rankAfter === (rankBefore as number) - 1) ||
    (movement === 'DEMOTED' && rankAfter === (rankBefore as number) + 1);
  if (!validMovement) {
    add(issues, 'invariant.invalid_combination', `${path}.movement`);
  }
  const neighbor = update['neighborParticipantId'];
  if (
    neighbor !== null &&
    (typeof neighbor !== 'string' || participantIds?.has(neighbor) !== true)
  ) {
    add(issues, 'invariant.invalid_id', `${path}.neighborParticipantId`);
  }
  if ((movement === 'PROMOTED' || movement === 'DEMOTED') && neighbor === null) {
    add(issues, 'invariant.invalid_combination', `${path}.neighborParticipantId`);
  }
  return update;
}

const COMPETITOR_KEYS = [
  'id',
  'givenNameId',
  'familyNameId',
  'archetypeId',
  'classYear',
  'talentFit',
  'coachTrust',
  'practiceForm',
  'schemeFit',
  'experienceReadiness',
] as const;
const COMPONENT_KEYS = [
  'talentFit',
  'coachTrust',
  'practiceForm',
  'schemeFit',
  'experienceReadiness',
] as const;
const CONTRIBUTION_KEYS = [
  'talentFitMilli',
  'coachTrustMilli',
  'practiceFormMilli',
  'schemeFitMilli',
  'experienceReadinessMilli',
] as const;
const EVALUATION_KEYS = [
  'participantId',
  'rank',
  'roleId',
  'components',
  'contributions',
  'totalScoreMilli',
] as const;

function validateProgramContext(
  value: unknown,
  input: ProgramStateValidationInput,
  issues: ProgramStateInvariantIssue[],
): { readonly programId?: string; readonly participantIds?: ReadonlySet<string> } {
  const path = 'career.programContext';
  const context = strictRecord(
    value,
    path,
    [
      'programId',
      'offenseStyleId',
      'rotationPolicyId',
      'playerPracticeForm',
      'competitors',
      'depthOrderIds',
      'evaluations',
      'projection',
      'latestDepthUpdate',
    ],
    issues,
  );
  if (context === undefined) {
    return {};
  }
  if (!isProgramId(context['programId'])) {
    add(issues, 'invariant.invalid_id', `${path}.programId`);
  }
  if (!isProgramOffenseStyleId(context['offenseStyleId'])) {
    add(issues, 'invariant.invalid_id', `${path}.offenseStyleId`);
  }
  if (!isRotationPolicyId(context['rotationPolicyId'])) {
    add(issues, 'invariant.invalid_id', `${path}.rotationPolicyId`);
  }
  if (!integerIn(context['playerPracticeForm'], 0, 100)) {
    add(issues, 'invariant.out_of_bounds', `${path}.playerPracticeForm`);
  }

  const competitors = denseArray(
    context['competitors'],
    `${path}.competitors`,
    WR_ROOM_COMPETITOR_COUNT,
    issues,
  );
  const competitorIds = new Set<string>();
  const competitorById = new Map<string, UnknownRecord>();
  const namePairs = new Set<string>();
  let previousCompetitorId = '';
  if (competitors !== undefined) {
    for (const [index, rawCompetitor] of competitors.entries()) {
      const competitorPath = `${path}.competitors.${index}`;
      const competitor = strictRecord(rawCompetitor, competitorPath, COMPETITOR_KEYS, issues);
      if (competitor === undefined) {
        continue;
      }
      if (!isRosterPlayerId(competitor['id'])) {
        add(issues, 'invariant.invalid_id', `${competitorPath}.id`);
      } else {
        if (competitorIds.has(competitor['id']) || competitor['id'] === input.playerId) {
          add(issues, 'invariant.duplicate_value', `${competitorPath}.id`);
        }
        if (index > 0 && compareCodeUnits(competitor['id'], previousCompetitorId) <= 0) {
          add(issues, 'invariant.noncanonical_order', `${competitorPath}.id`);
        }
        competitorIds.add(competitor['id']);
        competitorById.set(competitor['id'], competitor);
        previousCompetitorId = competitor['id'];
      }
      if (!isRosterGivenNameId(competitor['givenNameId'])) {
        add(issues, 'invariant.invalid_id', `${competitorPath}.givenNameId`);
      }
      if (!isRosterFamilyNameId(competitor['familyNameId'])) {
        add(issues, 'invariant.invalid_id', `${competitorPath}.familyNameId`);
      }
      if (
        typeof competitor['givenNameId'] === 'string' &&
        typeof competitor['familyNameId'] === 'string'
      ) {
        const pair = `${competitor['givenNameId']}|${competitor['familyNameId']}`;
        if (namePairs.has(pair)) {
          add(issues, 'invariant.duplicate_value', `${competitorPath}.familyNameId`);
        }
        namePairs.add(pair);
      }
      if (!isWrArchetypeId(competitor['archetypeId'])) {
        add(issues, 'invariant.invalid_id', `${competitorPath}.archetypeId`);
      }
      if (!integerIn(competitor['classYear'], 1, 4)) {
        add(issues, 'invariant.out_of_bounds', `${competitorPath}.classYear`);
      }
      for (const field of [
        'talentFit',
        'practiceForm',
        'schemeFit',
        'experienceReadiness',
      ] as const) {
        if (!integerIn(competitor[field], 0, 100)) {
          add(issues, 'invariant.out_of_bounds', `${competitorPath}.${field}`);
        }
      }
      if (!isIntegerWithinBounds(competitor['coachTrust'], COACH_TRUST_BOUNDS)) {
        add(issues, 'invariant.out_of_bounds', `${competitorPath}.coachTrust`);
      }
    }
  }

  const participantIds = new Set<string>();
  if (isPlayerId(input.playerId)) {
    participantIds.add(input.playerId);
  }
  for (const competitorId of competitorIds) {
    participantIds.add(competitorId);
  }
  const order = denseArray(
    context['depthOrderIds'],
    `${path}.depthOrderIds`,
    WR_ROOM_PARTICIPANT_COUNT,
    issues,
  );
  const orderIds = new Set<string>();
  if (order !== undefined) {
    for (const [index, participantId] of order.entries()) {
      if (typeof participantId !== 'string' || !participantIds.has(participantId)) {
        add(issues, 'invariant.invalid_id', `${path}.depthOrderIds.${index}`);
      } else if (orderIds.has(participantId)) {
        add(issues, 'invariant.duplicate_value', `${path}.depthOrderIds.${index}`);
      }
      if (typeof participantId === 'string') {
        orderIds.add(participantId);
      }
    }
    if (
      participantIds.size !== WR_ROOM_PARTICIPANT_COUNT ||
      orderIds.size !== participantIds.size
    ) {
      add(issues, 'invariant.invalid_combination', `${path}.depthOrderIds`);
    }
  }

  const evaluations = denseArray(
    context['evaluations'],
    `${path}.evaluations`,
    WR_ROOM_PARTICIPANT_COUNT,
    issues,
  );
  const evaluatedIds = new Set<string>();
  let playerRank: number | undefined;
  let playerRole: unknown;
  let previousEvaluationScore = Number.POSITIVE_INFINITY;
  let previousEvaluationParticipantId = '';
  const hasPersistedDepthUpdate = context['latestDepthUpdate'] !== null;
  if (evaluations !== undefined) {
    for (const [index, rawEvaluation] of evaluations.entries()) {
      const evaluationPath = `${path}.evaluations.${index}`;
      const evaluation = strictRecord(rawEvaluation, evaluationPath, EVALUATION_KEYS, issues);
      if (evaluation === undefined) {
        continue;
      }
      const participantId = evaluation['participantId'];
      if (typeof participantId !== 'string' || !participantIds.has(participantId)) {
        add(issues, 'invariant.invalid_id', `${evaluationPath}.participantId`);
      } else {
        if (evaluatedIds.has(participantId)) {
          add(issues, 'invariant.duplicate_value', `${evaluationPath}.participantId`);
        }
        evaluatedIds.add(participantId);
      }
      if (order?.[index] !== participantId) {
        add(issues, 'invariant.invalid_combination', `${evaluationPath}.participantId`);
      }
      const expectedRank = index + 1;
      if (evaluation['rank'] !== expectedRank) {
        add(issues, 'invariant.invalid_combination', `${evaluationPath}.rank`);
      }
      if (!isDepthRoleId(evaluation['roleId'])) {
        add(issues, 'invariant.invalid_id', `${evaluationPath}.roleId`);
      } else if (evaluation['roleId'] !== depthRoleIdForRank(expectedRank)) {
        add(issues, 'invariant.invalid_combination', `${evaluationPath}.roleId`);
      }
      const components = strictRecord(
        evaluation['components'],
        `${evaluationPath}.components`,
        COMPONENT_KEYS,
        issues,
      );
      const contributions = strictRecord(
        evaluation['contributions'],
        `${evaluationPath}.contributions`,
        CONTRIBUTION_KEYS,
        issues,
      );
      let contributionTotal = 0;
      if (components !== undefined && contributions !== undefined) {
        for (const [componentKey, contributionKey] of [
          ['talentFit', 'talentFitMilli'],
          ['coachTrust', 'coachTrustMilli'],
          ['practiceForm', 'practiceFormMilli'],
          ['schemeFit', 'schemeFitMilli'],
          ['experienceReadiness', 'experienceReadinessMilli'],
        ] as const) {
          if (!integerIn(components[componentKey], 0, 100)) {
            add(issues, 'invariant.out_of_bounds', `${evaluationPath}.components.${componentKey}`);
          }
          const expectedContribution =
            (components[componentKey] as number) * DEPTH_EVALUATION_WEIGHTS_PERMILLE[componentKey];
          if (contributions[contributionKey] !== expectedContribution) {
            add(
              issues,
              'invariant.invalid_combination',
              `${evaluationPath}.contributions.${contributionKey}`,
            );
          }
          if (Number.isInteger(contributions[contributionKey])) {
            contributionTotal += contributions[contributionKey] as number;
          }
        }
      }
      if (
        !integerIn(
          evaluation['totalScoreMilli'],
          DEPTH_SCORE_MILLI_BOUNDS.min,
          DEPTH_SCORE_MILLI_BOUNDS.max,
        )
      ) {
        add(issues, 'invariant.out_of_bounds', `${evaluationPath}.totalScoreMilli`);
      } else if (evaluation['totalScoreMilli'] !== contributionTotal) {
        add(issues, 'invariant.invalid_combination', `${evaluationPath}.totalScoreMilli`);
      }
      if (
        typeof participantId === 'string' &&
        integerIn(
          evaluation['totalScoreMilli'],
          DEPTH_SCORE_MILLI_BOUNDS.min,
          DEPTH_SCORE_MILLI_BOUNDS.max,
        )
      ) {
        const score = evaluation['totalScoreMilli'];
        const noncanonical =
          score > previousEvaluationScore ||
          (score === previousEvaluationScore &&
            compareCodeUnits(participantId, previousEvaluationParticipantId) < 0);
        const playerHysteresisInversion =
          hasPersistedDepthUpdate &&
          (participantId === input.playerId || previousEvaluationParticipantId === input.playerId);
        if (index > 0 && noncanonical && !playerHysteresisInversion) {
          add(issues, 'invariant.noncanonical_order', evaluationPath);
        }
        previousEvaluationScore = score;
        previousEvaluationParticipantId = participantId;
      }
      if (participantId === input.playerId) {
        playerRank = expectedRank;
        playerRole = evaluation['roleId'];
        if (
          components !== undefined &&
          (components['coachTrust'] !== input.playerCoachTrust ||
            components['practiceForm'] !== context['playerPracticeForm'])
        ) {
          add(issues, 'invariant.invalid_combination', `${evaluationPath}.components`);
        }
      } else if (typeof participantId === 'string' && components !== undefined) {
        const competitor = competitorById.get(participantId);
        if (
          competitor !== undefined &&
          COMPONENT_KEYS.some(
            (componentKey) => components[componentKey] !== competitor[componentKey],
          )
        ) {
          add(issues, 'invariant.invalid_combination', `${evaluationPath}.components`);
        }
      }
    }
    if (evaluatedIds.size !== participantIds.size) {
      add(issues, 'invariant.invalid_combination', `${path}.evaluations`);
    }
  }

  const projection = validateSnapProjection(context['projection'], `${path}.projection`, issues);
  if (
    projection !== undefined &&
    (projection['rank'] !== playerRank || projection['roleId'] !== playerRole)
  ) {
    add(issues, 'invariant.invalid_combination', `${path}.projection`);
  }
  const latestDepthUpdate = validateDepthUpdate(
    context['latestDepthUpdate'],
    `${path}.latestDepthUpdate`,
    input,
    participantIds,
    Number.isInteger(context['playerPracticeForm'])
      ? (context['playerPracticeForm'] as number)
      : undefined,
    undefined,
    issues,
  );
  if (
    latestDepthUpdate !== undefined &&
    projection !== undefined &&
    (latestDepthUpdate['rankAfter'] !== projection['rank'] ||
      latestDepthUpdate['roleAfter'] !== projection['roleId'])
  ) {
    add(issues, 'invariant.invalid_combination', `${path}.latestDepthUpdate.rankAfter`);
  }

  return typeof context['programId'] === 'string'
    ? { programId: context['programId'], participantIds }
    : { participantIds };
}

export function validateProgramState(
  input: ProgramStateValidationInput,
): readonly ProgramStateInvariantIssue[] {
  const issues: ProgramStateInvariantIssue[] = [];
  const recruiting = validateRecruitingState(
    input.recruitingState,
    input.careerWeekIndex,
    input.careerRngDrawCount,
    issues,
  );

  if (!recruiting.committed) {
    if (input.programId !== null) {
      add(issues, 'invariant.invalid_combination', 'career.programId');
    }
    if (input.programContext !== null) {
      add(issues, 'invariant.invalid_combination', 'career.programContext');
    }
    if (input.phaseDepthUpdate !== undefined && input.phaseDepthUpdate !== null) {
      add(issues, 'invariant.invalid_combination', 'career.phase.depthUpdate');
    }
  } else {
    const expectedCurrentProgramId = isProgramId(input.currentProgramIdOverride)
      ? input.currentProgramIdOverride
      : recruiting.selectedProgramId;
    if (!isProgramId(input.programId)) {
      add(issues, 'invariant.invalid_id', 'career.programId');
    }
    if (input.programContext === null) {
      add(issues, 'invariant.invalid_combination', 'career.programContext');
    } else {
      const context = validateProgramContext(input.programContext, input, issues);
      if (context.programId !== expectedCurrentProgramId || context.programId !== input.programId) {
        add(issues, 'invariant.invalid_combination', 'career.programContext.programId');
      }
      if (input.phaseDepthUpdate !== undefined) {
        validateDepthUpdate(
          input.phaseDepthUpdate,
          'career.phase.depthUpdate',
          input,
          context.participantIds,
          isRecord(input.programContext) &&
            Number.isInteger(input.programContext['playerPracticeForm'])
            ? (input.programContext['playerPracticeForm'] as number)
            : undefined,
          input.weeklyExperienceVersion === 2
            ? true
            : input.weeklyExperienceVersion === 1
              ? false
              : undefined,
          issues,
        );
        if (
          isRecord(input.programContext) &&
          !sameDepthUpdate(input.phaseDepthUpdate, input.programContext['latestDepthUpdate'])
        ) {
          add(issues, 'invariant.invalid_combination', 'career.phase.depthUpdate');
        }
      }
    }
    if (input.programId !== expectedCurrentProgramId) {
      add(issues, 'invariant.invalid_combination', 'career.programId');
    }
  }

  return issues;
}
