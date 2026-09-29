import type {
  DepthEvaluationComponents,
  DepthEvaluationContributions,
  DepthMovement,
  DepthParticipantId,
  DepthRoleId,
  ProgramId,
  ProgramStrengthBandId,
  ProjectedDepthBandId,
  RecruitingOfferEvidence,
  SnapProjectionEvidence,
} from '@project-saturday/game-core';
import { selectCurrentProgramId } from '@project-saturday/game-core';
import { programContent } from '@project-saturday/game-content/content';
import type { WrCareerSurface } from './wr-view';

export const PROGRAM_UI_CATALOG_FAILURE_REASON = 'program-ui.catalog-mismatch' as const;

type ProgramDefinition = (typeof programContent.programs)[number];

export interface ProgramTraitPresentation {
  readonly descriptionKey: string;
  readonly id: string;
  readonly nameKey: string;
}

export interface ProgramOfferPresentation {
  readonly descriptionKey: string;
  readonly id: ProgramId;
  readonly nameKey: string;
  readonly shortNameKey: string;
  readonly strengthBandId: ProgramStrengthBandId;
  readonly ratings: ProgramDefinition['ratings'];
  readonly traits: readonly ProgramTraitPresentation[];
  readonly interest: number;
  readonly schemeFit: number;
  readonly priority: number;
  readonly projectedDepthBandId: ProjectedDepthBandId;
}

export type ProgramIdentityPresentation = Omit<
  ProgramOfferPresentation,
  'interest' | 'priority' | 'projectedDepthBandId' | 'schemeFit'
>;

export interface ProgramDepthParticipantPresentation {
  readonly participantId: DepthParticipantId;
  readonly isPlayer: boolean;
  readonly rank: number;
  readonly roleId: DepthRoleId;
  readonly components: DepthEvaluationComponents;
  readonly contributions: DepthEvaluationContributions;
  readonly totalScoreMilli: number;
  readonly givenNameKey: string | null;
  readonly familyNameKey: string | null;
  readonly classYear: number | null;
}

export const DEPTH_FACTOR_IDS = [
  'talentFit',
  'coachTrust',
  'practiceForm',
  'schemeFit',
  'experienceReadiness',
] as const;

export type DepthFactorId = (typeof DEPTH_FACTOR_IDS)[number];
export type DepthFactorRelation = 'PLAYER_EDGE' | 'EVEN' | 'COMPETITOR_EDGE';
export type DepthCompetitorContext = 'ADVANCEMENT' | 'ROLE_SECURITY';
export type DepthOpportunitySuggestionId = DepthFactorId | 'sustainEdge';

export interface DepthFactorComparisonPresentation {
  readonly factorId: DepthFactorId;
  readonly relation: DepthFactorRelation;
  readonly playerValue: number;
  readonly competitorValue: number;
  readonly contributionDeficitMilli: number;
}

export interface DepthOpportunityPresentation {
  readonly competitorContext: DepthCompetitorContext;
  readonly competitor: ProgramDepthParticipantPresentation;
  readonly factors: readonly DepthFactorComparisonPresentation[];
  readonly suggestionIds: readonly DepthOpportunitySuggestionId[];
}

export interface LatestPracticeReviewPresentation {
  readonly coachTrustAfter: number;
  readonly coachTrustBefore: number;
  readonly practiceFormAfter: number;
  readonly practiceFormBefore: number;
  readonly practiceGrade: number;
}

export interface ProgramDepthPresentation {
  readonly program: ProgramIdentityPresentation;
  readonly projection: SnapProjectionEvidence;
  readonly playerCoachTrust: number;
  readonly playerPracticeForm: number;
  readonly participants: readonly ProgramDepthParticipantPresentation[];
  readonly opportunity: DepthOpportunityPresentation;
  readonly latestPracticeReview: LatestPracticeReviewPresentation | null;
  readonly latestMovement: {
    readonly movement: DepthMovement;
    readonly rankBefore: number;
    readonly rankAfter: number;
  } | null;
}

const DEPTH_FACTOR_CONTRIBUTION_KEYS = {
  talentFit: 'talentFitMilli',
  coachTrust: 'coachTrustMilli',
  practiceForm: 'practiceFormMilli',
  schemeFit: 'schemeFitMilli',
  experienceReadiness: 'experienceReadinessMilli',
} as const satisfies Readonly<Record<DepthFactorId, keyof DepthEvaluationContributions>>;

function fail(): never {
  throw new Error(PROGRAM_UI_CATALOG_FAILURE_REASON);
}

function traitsForProgram(program: ProgramDefinition): readonly ProgramTraitPresentation[] {
  return Object.freeze(
    program.traitIds.map((traitId) => {
      const trait = programContent.traits.find(({ id }) => id === traitId);
      return trait === undefined
        ? fail()
        : Object.freeze({
            descriptionKey: trait.descriptionKey,
            id: trait.id,
            nameKey: trait.nameKey,
          });
    }),
  );
}

function programIdentityPresentation(programId: ProgramId): ProgramIdentityPresentation {
  const program = programContent.programs.find(({ id }) => id === programId);
  if (program === undefined) return fail();
  return Object.freeze({
    descriptionKey: program.descriptionKey,
    id: program.id,
    nameKey: program.nameKey,
    shortNameKey: program.shortNameKey,
    strengthBandId: program.strengthBandId,
    ratings: program.ratings,
    traits: traitsForProgram(program),
  });
}

function offerPresentation(
  programId: ProgramId,
  evidence: RecruitingOfferEvidence,
): ProgramOfferPresentation {
  const program = programContent.programs.find(({ id }) => id === programId);
  if (program === undefined || evidence.programId !== programId) {
    return fail();
  }
  const identity = programIdentityPresentation(programId);
  return Object.freeze({
    ...identity,
    interest: evidence.interest,
    schemeFit: evidence.schemeFit,
    priority: evidence.priority,
    projectedDepthBandId: evidence.projectedDepthBandId,
  });
}

export function getProgramOfferPresentations(
  career: WrCareerSurface,
): readonly ProgramOfferPresentation[] {
  if (career.recruitingState.type !== 'CHOOSING') {
    return fail();
  }
  return Object.freeze(
    career.recruitingState.offers.map((offer) => offerPresentation(offer.programId, offer)),
  );
}

export function getProgramDepthPresentation(career: WrCareerSurface): ProgramDepthPresentation {
  if (career.recruitingState.type !== 'COMMITTED' || career.programContext === null) {
    return fail();
  }
  const programContext = career.programContext;
  const currentProgramId = selectCurrentProgramId(career);
  if (currentProgramId === null || programContext.programId !== currentProgramId) {
    return fail();
  }
  const participants = programContext.evaluations.map((evaluation) => {
    const isPlayer = evaluation.participantId === career.player.id;
    const competitor = isPlayer
      ? undefined
      : programContext.competitors.find(({ id }) => id === evaluation.participantId);
    if (!isPlayer && competitor === undefined) {
      return fail();
    }
    const givenName =
      competitor === undefined
        ? undefined
        : programContent.rosterGivenNames.find(({ id }) => id === competitor.givenNameId);
    const familyName =
      competitor === undefined
        ? undefined
        : programContent.rosterFamilyNames.find(({ id }) => id === competitor.familyNameId);
    if (competitor !== undefined && (givenName === undefined || familyName === undefined)) {
      return fail();
    }
    return Object.freeze({
      participantId: evaluation.participantId,
      isPlayer,
      rank: evaluation.rank,
      roleId: evaluation.roleId,
      components: evaluation.components,
      contributions: evaluation.contributions,
      totalScoreMilli: evaluation.totalScoreMilli,
      givenNameKey: givenName?.nameKey ?? null,
      familyNameKey: familyName?.nameKey ?? null,
      classYear: competitor?.classYear ?? null,
    });
  });
  const latest = programContext.latestDepthUpdate;
  const playerIndex = participants.findIndex(({ isPlayer }) => isPlayer);
  const competitorIndex = playerIndex > 0 ? playerIndex - 1 : playerIndex + 1;
  const player = participants[playerIndex];
  const competitor = participants[competitorIndex];
  if (player === undefined || competitor === undefined) {
    return fail();
  }
  const factors = Object.freeze(
    DEPTH_FACTOR_IDS.map((factorId) => {
      const playerValue = player.components[factorId];
      const competitorValue = competitor.components[factorId];
      const contributionKey = DEPTH_FACTOR_CONTRIBUTION_KEYS[factorId];
      return Object.freeze({
        factorId,
        relation:
          playerValue > competitorValue
            ? 'PLAYER_EDGE'
            : playerValue < competitorValue
              ? 'COMPETITOR_EDGE'
              : 'EVEN',
        playerValue,
        competitorValue,
        contributionDeficitMilli:
          competitor.contributions[contributionKey] - player.contributions[contributionKey],
      } satisfies DepthFactorComparisonPresentation);
    }),
  );
  const suggestionIds = Object.freeze(
    factors
      .filter(({ contributionDeficitMilli }) => contributionDeficitMilli > 0)
      .toSorted((left, right) => right.contributionDeficitMilli - left.contributionDeficitMilli)
      .slice(0, 2)
      .map(({ factorId }) => factorId),
  );
  return Object.freeze({
    program: programIdentityPresentation(currentProgramId),
    projection: programContext.projection,
    playerCoachTrust: career.player.state.coachTrust,
    playerPracticeForm: programContext.playerPracticeForm,
    participants: Object.freeze(participants),
    opportunity: Object.freeze({
      competitorContext: playerIndex > 0 ? 'ADVANCEMENT' : 'ROLE_SECURITY',
      competitor,
      factors,
      suggestionIds:
        suggestionIds.length === 0 ? Object.freeze(['sustainEdge'] as const) : suggestionIds,
    }),
    latestPracticeReview:
      latest === null
        ? null
        : Object.freeze({
            coachTrustAfter: latest.coachTrustAfter,
            coachTrustBefore: latest.coachTrustBefore,
            practiceFormAfter: latest.practiceFormAfter,
            practiceFormBefore: latest.practiceFormBefore,
            practiceGrade: latest.weeklyPracticeScore,
          }),
    latestMovement:
      latest === null
        ? null
        : Object.freeze({
            movement: latest.movement,
            rankBefore: latest.rankBefore,
            rankAfter: latest.rankAfter,
          }),
  });
}
