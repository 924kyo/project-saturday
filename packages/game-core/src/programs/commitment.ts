import { COACH_TRUST_BOUNDS } from '../player/bounds.js';
import { WR_ARCHETYPE_IDS, isProgramId, type ProgramId } from '../player/ids.js';
import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import type { CareerRun, WrPlayer } from '../player/types.js';
import { validateCareerRun } from '../player/validation.js';
import { isRngState, nextUint32, type RngState } from '../random/rng.js';
import {
  isRosterFamilyNameId,
  isRosterGivenNameId,
  isRotationPolicyId,
  type ProgramCommitCommandFailureReason,
  type ProgramOffenseStyleId,
  type RosterFamilyNameId,
  type RosterGivenNameId,
} from './ids.js';
import { validateOffenseCatalog, validateProgramCatalog } from './recruiting.js';
import { selectDiverseRosterNamePair } from './roster-identity.js';
import {
  DEPTH_COMPONENT_BOUNDS,
  DEPTH_EVALUATION_WEIGHTS_PERMILLE,
  SNAP_SHARE_PERMILLE_BOUNDS,
  WR_ROOM_COMPETITOR_COUNT,
  depthRoleIdForRank,
} from './tuning.js';
import {
  RECRUIT_ABILITY_ATTRIBUTE_IDS,
  type DepthEvaluationComponents,
  type DepthEvaluationEvidence,
  type DepthEvaluationTuple,
  type DepthOrderTuple,
  type ProgramCommitCommandResult,
  type ProgramCareerState,
  type RecruitingOffenseStyleDefinition,
  type RecruitingChoosingState,
  type RecruitingProgramDefinition,
  type RosterNameMechanicsPool,
  type RotationPolicyMechanicsDefinition,
  type SnapProjectionEvidence,
  type WrRoomCompetitor,
  type WrRoomCompetitorTuple,
} from './types.js';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: unknown, keys: readonly string[]): value is UnknownRecord {
  if (!isRecord(value)) {
    return false;
  }
  const ownKeys = Object.keys(value);
  return (
    ownKeys.length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key)) &&
    ownKeys.every((key) => keys.includes(key))
  );
}

function isDenseArray(value: unknown): value is readonly unknown[] {
  if (!Array.isArray(value)) {
    return false;
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      return false;
    }
  }
  return true;
}

function integerIn(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

function failure(
  career: CareerRun,
  reason: ProgramCommitCommandFailureReason,
): ProgramCommitCommandResult {
  return Object.freeze({ career, ok: false, reason });
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readPlayerRating(
  player: WrPlayer,
  attributeId: (typeof RECRUIT_ABILITY_ATTRIBUTE_IDS)[number],
): number {
  switch (attributeId) {
    case 'attribute_speed':
    case 'attribute_burst':
    case 'attribute_agility':
    case 'attribute_strength':
      return player.attributes.physical[attributeId].rating;
    case 'attribute_wr_release':
    case 'attribute_wr_route_running':
    case 'attribute_wr_hands':
    case 'attribute_wr_catch_in_traffic':
      return player.attributes.wr[attributeId].rating;
  }
}

export function validateRotationCatalog(
  value: unknown,
): ReadonlyMap<string, RotationPolicyMechanicsDefinition> | undefined {
  if (!isDenseArray(value) || value.length === 0) {
    return undefined;
  }
  const policies = new Map<string, RotationPolicyMechanicsDefinition>();
  for (const rawPolicy of value) {
    if (
      !hasExactKeys(rawPolicy, ['id', 'rankSnapRanges']) ||
      !isRotationPolicyId(rawPolicy['id']) ||
      policies.has(rawPolicy['id']) ||
      !isDenseArray(rawPolicy['rankSnapRanges']) ||
      rawPolicy['rankSnapRanges'].length !== 8
    ) {
      return undefined;
    }
    let previousMin = Number.POSITIVE_INFINITY;
    let previousMax = Number.POSITIVE_INFINITY;
    for (const [index, rawRange] of rawPolicy['rankSnapRanges'].entries()) {
      if (
        !hasExactKeys(rawRange, ['rank', 'minSnapPermille', 'maxSnapPermille']) ||
        rawRange['rank'] !== index + 1 ||
        !integerIn(
          rawRange['minSnapPermille'],
          SNAP_SHARE_PERMILLE_BOUNDS.min,
          SNAP_SHARE_PERMILLE_BOUNDS.max,
        ) ||
        !integerIn(
          rawRange['maxSnapPermille'],
          SNAP_SHARE_PERMILLE_BOUNDS.min,
          SNAP_SHARE_PERMILLE_BOUNDS.max,
        ) ||
        rawRange['minSnapPermille'] > rawRange['maxSnapPermille'] ||
        rawRange['minSnapPermille'] > previousMin ||
        rawRange['maxSnapPermille'] > previousMax
      ) {
        return undefined;
      }
      previousMin = rawRange['minSnapPermille'];
      previousMax = rawRange['maxSnapPermille'];
    }
    policies.set(rawPolicy['id'], rawPolicy as unknown as RotationPolicyMechanicsDefinition);
  }
  return policies;
}

interface ValidNamePool {
  readonly givenNameIds: readonly RosterGivenNameId[];
  readonly familyNameIds: readonly RosterFamilyNameId[];
}

function validateNamePool(value: unknown): ValidNamePool | undefined {
  if (
    !hasExactKeys(value, ['givenNameIds', 'familyNameIds']) ||
    !isDenseArray(value['givenNameIds']) ||
    !isDenseArray(value['familyNameIds']) ||
    value['givenNameIds'].length === 0 ||
    value['familyNameIds'].length === 0 ||
    value['givenNameIds'].length * value['familyNameIds'].length < WR_ROOM_COMPETITOR_COUNT ||
    !value['givenNameIds'].every(isRosterGivenNameId) ||
    !value['familyNameIds'].every(isRosterFamilyNameId) ||
    new Set(value['givenNameIds']).size !== value['givenNameIds'].length ||
    new Set(value['familyNameIds']).size !== value['familyNameIds'].length
  ) {
    return undefined;
  }
  return {
    givenNameIds: [...value['givenNameIds']].sort(compareCodeUnits),
    familyNameIds: [...value['familyNameIds']].sort(compareCodeUnits),
  };
}

function oneDrawIndex(
  rng: RngState,
  length: number,
): { readonly index: number; readonly rng: RngState } {
  const sample = nextUint32(rng);
  return {
    index: Math.floor((sample.value * length) / 0x1_0000_0000),
    rng: sample.nextRng,
  };
}

function evaluation(
  participantId: DepthEvaluationEvidence['participantId'],
  components: DepthEvaluationComponents,
): Omit<DepthEvaluationEvidence, 'rank' | 'roleId'> {
  const contributions = {
    talentFitMilli: components.talentFit * DEPTH_EVALUATION_WEIGHTS_PERMILLE.talentFit,
    coachTrustMilli: components.coachTrust * DEPTH_EVALUATION_WEIGHTS_PERMILLE.coachTrust,
    practiceFormMilli: components.practiceForm * DEPTH_EVALUATION_WEIGHTS_PERMILLE.practiceForm,
    schemeFitMilli: components.schemeFit * DEPTH_EVALUATION_WEIGHTS_PERMILLE.schemeFit,
    experienceReadinessMilli:
      components.experienceReadiness * DEPTH_EVALUATION_WEIGHTS_PERMILLE.experienceReadiness,
  };
  return {
    participantId,
    components,
    contributions,
    totalScoreMilli: Object.values(contributions).reduce((total, value) => total + value, 0),
  };
}

function projectionForRank(
  rank: number,
  policy: RotationPolicyMechanicsDefinition,
): SnapProjectionEvidence {
  const range = policy.rankSnapRanges[rank - 1];
  if (range === undefined) {
    throw new RangeError('Rotation policy is missing the player rank.');
  }
  return {
    rank,
    roleId: depthRoleIdForRank(rank),
    minSnapPermille: range.minSnapPermille,
    maxSnapPermille: range.maxSnapPermille,
  };
}

function validateSelectedOfferCatalogs(
  career: CareerRun,
  choosingState: RecruitingChoosingState,
  programs: readonly RecruitingProgramDefinition[],
  offenseStyles: ReadonlyMap<string, RecruitingOffenseStyleDefinition>,
): boolean {
  return choosingState.offers.every((offer) => {
    const program = programs.find(({ id }) => id === offer.programId);
    const style = program === undefined ? undefined : offenseStyles.get(program.offenseStyleId);
    return (
      program !== undefined &&
      style !== undefined &&
      offer.interest === program.recruitingInterestByTier[choosingState.recruitTierId] &&
      offer.schemeFit === style.schemeFitByArchetype[career.player.archetypeId] &&
      offer.priority === offer.interest * 2 + offer.schemeFit
    );
  });
}

export interface ProgramRoomGenerationParameters {
  readonly programId: ProgramId;
  readonly offenseStyleId: ProgramOffenseStyleId;
  readonly roomTalentMean: number;
  readonly playerCoachTrust: number;
  readonly playerPracticeForm: number;
  readonly playerExperienceReadiness: number;
}

export interface GeneratedProgramRoomContext {
  readonly context: ProgramCareerState;
  readonly rng: RngState;
  readonly rosterRngDrawCountBefore: number;
  readonly rosterRngDrawCountAfter: number;
}

function generateValidatedProgramRoomContext(
  player: WrPlayer,
  rngBefore: RngState,
  selectedProgram: RecruitingProgramDefinition,
  selectedStyle: RecruitingOffenseStyleDefinition,
  selectedRotation: RotationPolicyMechanicsDefinition,
  names: ValidNamePool,
  parameters: ProgramRoomGenerationParameters,
): GeneratedProgramRoomContext | undefined {
  if (rngBefore.drawCount > Number.MAX_SAFE_INTEGER - WR_ROOM_COMPETITOR_COUNT * 5) {
    return undefined;
  }
  const rosterRngDrawCountBefore = rngBefore.drawCount;
  let rng = rngBefore;
  const usedNamePairs = new Set<string>();
  const givenNameUsage = new Map<RosterGivenNameId, number>();
  const familyNameUsage = new Map<RosterFamilyNameId, number>();
  const competitors: WrRoomCompetitor[] = [];
  for (let index = 0; index < WR_ROOM_COMPETITOR_COUNT; index += 1) {
    const givenDraw = oneDrawIndex(rng, names.givenNameIds.length);
    rng = givenDraw.rng;
    const familyDraw = oneDrawIndex(rng, names.familyNameIds.length);
    rng = familyDraw.rng;
    const archetypeDraw = oneDrawIndex(rng, WR_ARCHETYPE_IDS.length);
    rng = archetypeDraw.rng;
    const classDraw = oneDrawIndex(rng, 4);
    rng = classDraw.rng;
    const talentDraw = oneDrawIndex(rng, selectedProgram.roomProfile.talentSpread * 2 + 1);
    rng = talentDraw.rng;

    const selectedName = selectDiverseRosterNamePair({
      familyNameIds: names.familyNameIds,
      familyStartIndex: familyDraw.index,
      familyUsage: familyNameUsage,
      givenNameIds: names.givenNameIds,
      givenStartIndex: givenDraw.index,
      givenUsage: givenNameUsage,
      usedPairs: usedNamePairs,
    });
    const givenNameId = selectedName?.givenNameId;
    const familyNameId = selectedName?.familyNameId;
    const archetypeId = WR_ARCHETYPE_IDS[archetypeDraw.index];
    if (givenNameId === undefined || familyNameId === undefined || archetypeId === undefined) {
      return undefined;
    }
    usedNamePairs.add(`${givenNameId}|${familyNameId}`);
    givenNameUsage.set(givenNameId, (givenNameUsage.get(givenNameId) ?? 0) + 1);
    familyNameUsage.set(familyNameId, (familyNameUsage.get(familyNameId) ?? 0) + 1);
    const classYear = (classDraw.index + 1) as 1 | 2 | 3 | 4;
    const talentFit = clamp(
      parameters.roomTalentMean - selectedProgram.roomProfile.talentSpread + talentDraw.index,
      DEPTH_COMPONENT_BOUNDS.min,
      DEPTH_COMPONENT_BOUNDS.max,
    );
    competitors.push({
      id: `roster_player_${parameters.programId.slice('program_'.length)}_${String(index + 1).padStart(2, '0')}`,
      givenNameId,
      familyNameId,
      archetypeId,
      classYear,
      talentFit,
      coachTrust: clamp(
        selectedProgram.roomProfile.trustBase + (classYear - 1) * 5,
        COACH_TRUST_BOUNDS.min,
        COACH_TRUST_BOUNDS.max,
      ),
      practiceForm: clamp(
        selectedProgram.roomProfile.practiceFormBase +
          Math.round((talentFit - parameters.roomTalentMean) / 3),
        DEPTH_COMPONENT_BOUNDS.min,
        DEPTH_COMPONENT_BOUNDS.max,
      ),
      schemeFit: selectedStyle.schemeFitByArchetype[archetypeId],
      experienceReadiness: clamp(
        selectedProgram.roomProfile.experienceReadinessBase + (classYear - 2) * 8,
        DEPTH_COMPONENT_BOUNDS.min,
        DEPTH_COMPONENT_BOUNDS.max,
      ),
    });
  }

  const playerTalentFit = Math.round(
    RECRUIT_ABILITY_ATTRIBUTE_IDS.reduce(
      (total, attributeId) =>
        total +
        readPlayerRating(player, attributeId) * selectedStyle.attributeWeightsPermille[attributeId],
      0,
    ) / 1_000,
  );
  const initialEvaluations = [
    evaluation(player.id, {
      talentFit: playerTalentFit,
      coachTrust: parameters.playerCoachTrust,
      practiceForm: parameters.playerPracticeForm,
      schemeFit: selectedStyle.schemeFitByArchetype[player.archetypeId],
      experienceReadiness: parameters.playerExperienceReadiness,
    }),
    ...competitors.map((competitor) =>
      evaluation(competitor.id, {
        talentFit: competitor.talentFit,
        coachTrust: competitor.coachTrust,
        practiceForm: competitor.practiceForm,
        schemeFit: competitor.schemeFit,
        experienceReadiness: competitor.experienceReadiness,
      }),
    ),
  ].sort((left, right) =>
    right.totalScoreMilli === left.totalScoreMilli
      ? compareCodeUnits(left.participantId, right.participantId)
      : right.totalScoreMilli - left.totalScoreMilli,
  );
  const evaluations = initialEvaluations.map((entry, index) => ({
    ...entry,
    rank: index + 1,
    roleId: depthRoleIdForRank(index + 1),
  })) as unknown as DepthEvaluationTuple;
  const depthOrderIds = evaluations.map(
    ({ participantId }) => participantId,
  ) as unknown as DepthOrderTuple;
  const playerEvaluation = evaluations.find(({ participantId }) => participantId === player.id);
  if (playerEvaluation === undefined) return undefined;
  return {
    rng,
    rosterRngDrawCountBefore,
    rosterRngDrawCountAfter: rng.drawCount,
    context: {
      programId: parameters.programId,
      offenseStyleId: parameters.offenseStyleId,
      rotationPolicyId: selectedProgram.rotationPolicyId,
      playerPracticeForm: parameters.playerPracticeForm,
      competitors: competitors as unknown as WrRoomCompetitorTuple,
      depthOrderIds,
      evaluations,
      projection: projectionForRank(playerEvaluation.rank, selectedRotation),
      latestDepthUpdate: null,
    },
  };
}

/** Builds one deterministic WR room without changing the supplied player or career. */
export function generateProgramRoomContext(
  player: WrPlayer,
  rng: RngState,
  programDefinitions: readonly RecruitingProgramDefinition[],
  offenseStyleDefinitions: readonly RecruitingOffenseStyleDefinition[],
  rotationPolicyDefinitions: readonly RotationPolicyMechanicsDefinition[],
  namePool: RosterNameMechanicsPool,
  parameters: ProgramRoomGenerationParameters,
): GeneratedProgramRoomContext | undefined {
  const offenseStyles = validateOffenseCatalog(offenseStyleDefinitions);
  if (offenseStyles === undefined) return undefined;
  const programs = validateProgramCatalog(programDefinitions, offenseStyles);
  const rotations = validateRotationCatalog(rotationPolicyDefinitions);
  const names = validateNamePool(namePool);
  if (
    programs === undefined ||
    rotations === undefined ||
    names === undefined ||
    !isRngState(rng) ||
    !isProgramId(parameters.programId) ||
    !integerIn(parameters.roomTalentMean, 35, 90) ||
    !integerIn(parameters.playerCoachTrust, 0, 100) ||
    !integerIn(parameters.playerPracticeForm, 0, 100) ||
    !integerIn(parameters.playerExperienceReadiness, 0, 100)
  ) {
    return undefined;
  }
  const selectedProgram = programs.find(({ id }) => id === parameters.programId);
  const selectedStyle = offenseStyles.get(parameters.offenseStyleId);
  const selectedRotation =
    selectedProgram === undefined ? undefined : rotations.get(selectedProgram.rotationPolicyId);
  if (
    selectedProgram === undefined ||
    selectedStyle === undefined ||
    selectedRotation === undefined
  ) {
    return undefined;
  }
  return generateValidatedProgramRoomContext(
    player,
    rng,
    selectedProgram,
    selectedStyle,
    selectedRotation,
    names,
    parameters,
  );
}

/** Enrolls in one persisted offer and generates only that program's WR room. */
export function commitProgramChoice(
  career: CareerRun,
  selectedProgramId: string,
  programDefinitions: readonly RecruitingProgramDefinition[],
  offenseStyleDefinitions: readonly RecruitingOffenseStyleDefinition[],
  rotationPolicyDefinitions: readonly RotationPolicyMechanicsDefinition[],
  namePool: RosterNameMechanicsPool,
): ProgramCommitCommandResult {
  if (!validateCareerRun(career).ok) {
    return failure(career, 'program_commit.invalid_career');
  }
  if (career.revision >= Number.MAX_SAFE_INTEGER) {
    return failure(career, 'program_commit.revision_exhausted');
  }
  if (career.phase.type !== 'PLAN_ACTIONS') {
    return failure(career, 'program_commit.invalid_phase');
  }
  if (career.recruitingState.type !== 'CHOOSING') {
    return failure(career, 'program_commit.not_choosing');
  }
  const choosingState = career.recruitingState;
  if (
    !isProgramId(selectedProgramId) ||
    !career.recruitingState.offers.some(({ programId }) => programId === selectedProgramId)
  ) {
    return failure(career, 'program_commit.invalid_program_selection');
  }
  const offenseStyles = validateOffenseCatalog(offenseStyleDefinitions);
  if (offenseStyles === undefined) {
    return failure(career, 'program_commit.invalid_offense_catalog');
  }
  const programs = validateProgramCatalog(programDefinitions, offenseStyles);
  if (
    programs === undefined ||
    !validateSelectedOfferCatalogs(career, choosingState, programs, offenseStyles)
  ) {
    return failure(career, 'program_commit.invalid_program_catalog');
  }
  const rotations = validateRotationCatalog(rotationPolicyDefinitions);
  if (rotations === undefined) {
    return failure(career, 'program_commit.invalid_rotation_catalog');
  }
  const names = validateNamePool(namePool);
  if (names === undefined) {
    return failure(career, 'program_commit.invalid_name_pool');
  }
  const selectedProgram = programs.find(({ id }) => id === selectedProgramId);
  const selectedStyle =
    selectedProgram === undefined ? undefined : offenseStyles.get(selectedProgram.offenseStyleId);
  const selectedRotation =
    selectedProgram === undefined ? undefined : rotations.get(selectedProgram.rotationPolicyId);
  if (selectedProgram === undefined) {
    return failure(career, 'program_commit.invalid_program_catalog');
  }
  if (selectedStyle === undefined) {
    return failure(career, 'program_commit.invalid_offense_catalog');
  }
  if (selectedRotation === undefined) {
    return failure(career, 'program_commit.invalid_rotation_catalog');
  }
  if (career.rng.drawCount > Number.MAX_SAFE_INTEGER - WR_ROOM_COMPETITOR_COUNT * 5) {
    return failure(career, 'program_commit.rng_exhausted');
  }

  const playerPracticeForm = selectedProgram.roomProfile.practiceFormBase;
  const playerCoachTrust = clamp(
    career.player.state.coachTrust + selectedProgram.initialCoachTrustBonus,
    COACH_TRUST_BOUNDS.min,
    COACH_TRUST_BOUNDS.max,
  );
  const generatedRoom = generateValidatedProgramRoomContext(
    career.player,
    career.rng,
    selectedProgram,
    selectedStyle,
    selectedRotation,
    names,
    {
      programId: selectedProgram.id,
      offenseStyleId: selectedProgram.offenseStyleId as ProgramOffenseStyleId,
      roomTalentMean: selectedProgram.roomProfile.talentMean,
      playerCoachTrust,
      playerPracticeForm,
      playerExperienceReadiness: 20,
    },
  );
  if (generatedRoom === undefined) {
    return failure(career, 'program_commit.internal_invariant_failure');
  }
  const cloned = cloneSerializable(career);
  if (cloned.recruitingState.type !== 'CHOOSING') {
    return failure(career, 'program_commit.internal_invariant_failure');
  }
  const nextCareer: CareerRun = {
    ...cloned,
    revision: career.revision + 1,
    rng: generatedRoom.rng,
    programId: selectedProgram.id,
    recruitingState: {
      ...cloned.recruitingState,
      type: 'COMMITTED',
      selectedProgramId: selectedProgram.id,
      selectedAtWeekIndex: career.weekIndex,
      rosterRngDrawCountBefore: generatedRoom.rosterRngDrawCountBefore,
      rosterRngDrawCountAfter: generatedRoom.rosterRngDrawCountAfter,
    },
    player: {
      ...cloned.player,
      state: {
        ...cloned.player.state,
        coachTrust: playerCoachTrust,
      },
    },
    programContext: generatedRoom.context,
  };
  if (!validateCareerRun(nextCareer).ok) {
    return failure(career, 'program_commit.internal_invariant_failure');
  }
  return deepFreeze({ career: nextCareer, ok: true });
}
