import { expect, type Locator, type Page } from '@playwright/test';

import { readIndexedDbValue } from './indexed-db';

export type AppLocale = 'en-US' | 'ko-KR';
export type CareerPhaseType =
  | 'PLAN_ACTIONS'
  | 'RESOLVE_ACTIONS'
  | 'SKILL_BREAKTHROUGH'
  | 'WEEK_END'
  | 'EVENT_CHOICE'
  | 'INJURY_CHOICE'
  | 'GAME_PREVIEW'
  | 'KEY_SNAP'
  | 'POST_GAME'
  | 'SEASON_REVIEW'
  | 'CAREER_COMPLETE';

export interface PersistedRngState {
  readonly algorithm: 'xoshiro128ss-v1';
  readonly drawCount: number;
  readonly state: readonly [number, number, number, number];
}

export type PersistedAppliedWeeklySkillEffect =
  | {
      readonly effectIndex: number;
      readonly multiplierPermille: number;
      readonly skillId: string;
      readonly slotIndex: 0 | 1 | 2 | 3;
      readonly type: 'action_body_cost_multiplier' | 'action_xp_multiplier';
    }
  | {
      readonly delta: number;
      readonly effectIndex: number;
      readonly skillId: string;
      readonly slotIndex: 0 | 1 | 2 | 3;
      readonly type: 'action_body_delta_flat';
    }
  | {
      readonly deltaMilli: number;
      readonly effectIndex: number;
      readonly skillId: string;
      readonly slotIndex: 0 | 1 | 2 | 3;
      readonly type: 'action_gpa_delta_milli';
    }
  | {
      readonly delta: number;
      readonly effectIndex: number;
      readonly skillId: string;
      readonly slotIndex: 0 | 1 | 2 | 3;
      readonly type:
        | 'action_confidence_delta_flat'
        | 'action_practice_impact_flat'
        | 'action_preparation_delta_flat';
    };

export interface PersistedWeeklySkillEffectAggregates {
  readonly bodyCostMultiplierPermille: number;
  readonly bodyDeltaFlat: number;
  readonly gpaDeltaMilli: number;
  readonly confidenceDeltaFlat: number;
  readonly practiceImpactFlat: number;
  readonly preparationDeltaFlat: number;
  readonly xpMultiplierPermille: number;
}

export interface PersistedWeeklyActionResult {
  readonly actionId: string;
  readonly actionIndex: number;
  readonly actualBodyDelta: number;
  readonly appliedSkillEffects: readonly PersistedAppliedWeeklySkillEffect[];
  readonly attributeXp: readonly {
    readonly appliedXp: number;
    readonly attributeId: string;
    readonly awardedXp: number;
    readonly baseXp: number;
  }[];
  readonly baseBodyDelta: number;
  readonly bodyAfter: number;
  readonly bodyBefore: number;
  readonly practiceImpact: number;
  readonly requestedBodyDelta: number;
  readonly skillEffectAggregates: PersistedWeeklySkillEffectAggregates;
  readonly weekIndex: number;
}

export interface PersistedSkillBreakthroughOffer {
  readonly offerIndex: number;
  readonly offeredSkillIds: readonly [string, string, string];
  readonly rngDrawCountAfter: number;
  readonly rngDrawCountBefore: number;
  readonly weekIndex: number;
  readonly trigger?: PersistedSkillBreakthroughProgress;
}

export interface PersistedSkillBreakthroughProgress {
  readonly model: 'gauge_v1';
  readonly pointsEarned: number;
  readonly progressAfter: number;
  readonly progressBefore: number;
  readonly sources: readonly {
    readonly points: number;
    readonly sourceId: string;
  }[];
  readonly threshold: number;
  readonly triggeredOffer: boolean;
  readonly weekIndex: number;
}

export interface PersistedRecruitingOffer {
  readonly interest: number;
  readonly priority: number;
  readonly programId: string;
  readonly projectedDepthBandId: string;
  readonly schemeFit: number;
}

export type PersistedRecruitingState =
  | { readonly type: 'NOT_STARTED' }
  | {
      readonly backgroundModifier: number;
      readonly offers: readonly PersistedRecruitingOffer[];
      readonly recruitAbilityScore: number;
      readonly recruitScore: number;
      readonly recruitTierId: string;
      readonly type: 'CHOOSING';
    }
  | {
      readonly backgroundModifier: number;
      readonly offers: readonly PersistedRecruitingOffer[];
      readonly recruitAbilityScore: number;
      readonly recruitScore: number;
      readonly recruitTierId: string;
      readonly rosterRngDrawCountAfter: number;
      readonly rosterRngDrawCountBefore: number;
      readonly selectedAtWeekIndex: number;
      readonly selectedProgramId: string;
      readonly type: 'COMMITTED';
    };

export interface PersistedDepthUpdate {
  readonly actualCoachTrustDelta: number;
  readonly coachTrustAfter: number;
  readonly coachTrustBefore: number;
  readonly hysteresisThresholdMilli: number;
  readonly movement: 'DEMOTED' | 'HELD' | 'PROMOTED';
  readonly neighborParticipantId: string | null;
  readonly practiceFormAfter: number;
  readonly practiceFormBefore: number;
  readonly rankAfter: number;
  readonly rankBefore: number;
  readonly requestedCoachTrustDelta: number;
  readonly roleAfter: string;
  readonly roleBefore: string;
  readonly snapProjectionAfter: PersistedSnapProjection;
  readonly snapProjectionBefore: PersistedSnapProjection;
  readonly weekIndex: number;
  readonly weeklyPracticeScore: number;
}

export interface PersistedSnapProjection {
  readonly maxSnapPermille: number;
  readonly minSnapPermille: number;
  readonly rank: number;
  readonly roleId: string;
}

export interface PersistedProgramContext {
  readonly competitors: readonly (Readonly<Record<string, unknown>> & {
    readonly id: string;
  })[];
  readonly depthOrderIds: readonly string[];
  readonly latestDepthUpdate: PersistedDepthUpdate | null;
  readonly offenseStyleId: string;
  readonly playerPracticeForm: number;
  readonly programId: string;
  readonly projection: PersistedSnapProjection;
  readonly rotationPolicyId: string;
}

export interface PersistedGameStatLine {
  readonly drops: number;
  readonly receptions: number;
  readonly receivingTouchdowns: number;
  readonly receivingYards: number;
  readonly targets: number;
  readonly turnovers: number;
}

export interface PersistedCompletedGameSummary {
  readonly gameId: string;
  readonly gameRngDrawCountAfter: number;
  readonly gameRngDrawCountBefore: number;
  readonly isHome: boolean;
  readonly keySnapCount: number;
  readonly opponentProgramId: string;
  readonly participationFeedbackId: string;
  readonly performanceGradeBandId: string;
  readonly performanceGradeScore: number;
  readonly playerProgramId: string;
  readonly resultId: string;
  readonly score: {
    readonly opponent: number;
    readonly playerTeam: number;
  };
  readonly statLine: PersistedGameStatLine;
  readonly weekIndex: number;
}

export interface PersistedGameMatchup {
  readonly completedWeek: Readonly<Record<string, unknown>>;
  readonly gameId: string;
  readonly isHome: boolean;
  readonly opponentProgramId: string;
  readonly opportunityBudget: number;
  readonly playerProgramId: string;
  readonly pregameProjection: PersistedSnapProjection;
  readonly weekIndex: number;
}

export interface PersistedKeySnapPlay {
  readonly decisionId: string;
  readonly familyId: string;
  readonly keySnapId: string;
  readonly patternId: string;
  readonly receivingYardsDelta: number;
  readonly resultId: string;
}

export type PersistedCareerPhase =
  | { readonly type: 'PLAN_ACTIONS' }
  | {
      readonly actionIds: readonly [string, string, string];
      readonly nextActionIndex: 0 | 1 | 2;
      readonly results: readonly PersistedWeeklyActionResult[];
      readonly type: 'RESOLVE_ACTIONS';
    }
  | {
      readonly offer: PersistedSkillBreakthroughOffer;
      readonly type: 'SKILL_BREAKTHROUGH';
    }
  | {
      readonly depthUpdate: PersistedDepthUpdate | null;
      readonly results: readonly [
        PersistedWeeklyActionResult,
        PersistedWeeklyActionResult,
        PersistedWeeklyActionResult,
      ];
      readonly type: 'WEEK_END';
    }
  | {
      readonly pendingEvent: {
        readonly choiceIds: readonly string[];
        readonly eventId: string;
      };
      readonly type: 'EVENT_CHOICE';
    }
  | {
      readonly pendingInjury: {
        readonly choiceIds: readonly string[];
        readonly outcomeId: string;
      };
      readonly type: 'INJURY_CHOICE';
    }
  | {
      readonly matchup: PersistedGameMatchup;
      readonly type: 'GAME_PREVIEW';
    }
  | {
      readonly game: {
        readonly keyPlayLog: readonly PersistedKeySnapPlay[];
        readonly matchup: PersistedGameMatchup;
        readonly opportunitiesPresented: number;
        readonly score: {
          readonly opponent: number;
          readonly playerTeam: number;
        };
        readonly statLine: PersistedGameStatLine;
      };
      readonly pendingSnap: {
        readonly decisionIds: readonly [string, string, string];
        readonly familyId: string;
        readonly informationTierId: string;
        readonly keySnapId: string;
        readonly patternId: string;
        readonly revealedClueIds: readonly string[];
      };
      readonly type: 'KEY_SNAP';
    }
  | {
      readonly growth: Readonly<Record<string, unknown>> & {
        readonly attributeXp: readonly Readonly<Record<string, unknown>>[];
      };
      readonly keyPlayLog: readonly PersistedKeySnapPlay[];
      readonly summary: PersistedCompletedGameSummary;
      readonly type: 'POST_GAME';
    }
  | {
      readonly type: 'SEASON_REVIEW';
    }
  | {
      readonly type: 'CAREER_COMPLETE';
    };

export interface PersistedSkillAcquisition extends PersistedSkillBreakthroughOffer {
  readonly selectedSkillId: string;
}

export interface PersistedPassiveBodyRecovery {
  readonly actualBodyDelta: number;
  readonly appliedSkillEffects: readonly {
    readonly delta: number;
    readonly effectIndex: number;
    readonly skillId: string;
    readonly slotIndex: 0 | 1 | 2 | 3;
    readonly type: 'passive_body_recovery_flat';
  }[];
  readonly baseBodyDelta: number;
  readonly bodyAfter: number;
  readonly bodyBefore: number;
  readonly requestedBodyDelta: number;
  readonly weekIndex: number;
}

export interface PersistedCareer {
  readonly careerSeed: string;
  readonly gameCareerState: {
    readonly cumulativeGradeScore: number;
    readonly cumulativeStats: Readonly<Record<string, number>>;
    readonly gamesPlayed: number;
    readonly lastGame: PersistedCompletedGameSummary | null;
    readonly losses: number;
    readonly ties: number;
    readonly wins: number;
  };
  readonly id: string;
  readonly lastPassiveBodyRecovery: PersistedPassiveBodyRecovery | null;
  readonly offFieldCareerState?: PersistedOffFieldCareerState;
  readonly phase: PersistedCareerPhase;
  readonly programContext: PersistedProgramContext | null;
  readonly programId: string | null;
  readonly player: {
    readonly appearance: Readonly<Record<string, string | null>>;
    readonly archetypeId: string;
    readonly attributes: unknown;
    readonly displayName: string;
    readonly heightCm: number;
    readonly id: string;
    readonly personalityTraitIds: readonly string[];
    readonly recruitingBackgroundId: string;
    readonly state: {
      readonly body: number;
      readonly brand: number;
      readonly coachTrust: number;
      readonly confidence: number;
      readonly gpa: number;
      readonly preparation: number;
    };
    readonly skillState: {
      readonly acquisitions: readonly PersistedSkillAcquisition[];
      readonly breakthroughGauge: {
        readonly lastProgress: PersistedSkillBreakthroughProgress | null;
        readonly model: 'gauge_v1';
        readonly progress: number;
        readonly threshold: number;
      };
      readonly equippedSkillIds: readonly [
        string | null,
        string | null,
        string | null,
        string | null,
      ];
    };
    readonly trainingProficiencyUses: Readonly<Record<string, number>>;
    readonly weightKg: number;
  };
  readonly recentWeeklyActionIds: readonly string[];
  readonly recruitingState: PersistedRecruitingState;
  readonly revision: number;
  readonly rng: PersistedRngState;
  readonly schemaVersion: 5 | 6 | 7;
  readonly seasonCareerState: {
    readonly activeSeasonId: string | null;
    readonly bootstrapStatus: 'PENDING' | 'ACTIVE' | 'COMPLETE';
    readonly lastCompletedSeason: Readonly<Record<string, unknown>> | null;
    readonly model: 'season_v1';
    readonly seasonsCompleted: number;
  };
  readonly weekIndex: number;
}

export type PersistedCareerInPhase<PhaseType extends CareerPhaseType> = PersistedCareer & {
  readonly phase: Extract<PersistedCareerPhase, { readonly type: PhaseType }>;
};

export interface PersistedCareerSession {
  readonly schemaVersion: 5 | 6 | 7;
  readonly career: PersistedCareer;
  readonly world: {
    readonly schemaVersion: 1;
    readonly model: 'season_v1';
    readonly careerId: string;
    readonly worldSeed: string;
    readonly rng: PersistedRngState;
    readonly revision: number;
    readonly calendar:
      | { readonly type: 'PENDING' }
      | {
          readonly completedCampRoundCount: number;
          readonly completedRegularSeasonRoundCount: number;
          readonly postseason: { readonly type: string };
          readonly stage: 'CAMP' | 'REGULAR_SEASON' | 'POSTSEASON';
          readonly type: 'ACTIVE';
        };
    readonly completedSeasonHistory?: readonly Readonly<Record<string, unknown>>[];
  };
}

interface SaveEnvelope {
  readonly saveVersion: 5 | 6 | 7;
  readonly payload: PersistedCareerSession;
}

export interface PersistedAcademicState {
  readonly bootstrapStatus: 'PENDING' | 'ACTIVE';
  readonly checkpointHistory: readonly {
    readonly checkpointId: string;
    readonly gpaMilli: number;
    readonly statusAfter: 'ELIGIBLE' | 'WARNING' | 'INELIGIBLE';
    readonly weekIndex: number;
  }[];
  readonly eligibilityStatus: 'PENDING' | 'ELIGIBLE' | 'WARNING' | 'INELIGIBLE';
  readonly restrictionGamesRemaining?: number;
  readonly termIndex: number;
}

export interface PersistedRelationshipState {
  readonly bootstrapStatus: 'PENDING' | 'ACTIVE';
  readonly history: readonly Readonly<Record<string, unknown>>[];
  readonly tracks: readonly {
    readonly actorId: string;
    readonly value: number;
  }[];
}

export interface PersistedNilState {
  readonly activeObligation: null | {
    readonly acceptedWeekIndex: number;
    readonly lastResolvedWeekIndex: number | null;
    readonly obligationId: string;
    readonly offerId: string;
    readonly remainingWeeks: number;
  };
  readonly bootstrapStatus?: 'ACTIVE';
  readonly fictionalFundsUsd: number;
  readonly history: readonly (
    | {
        readonly decisionId: 'ACCEPT' | 'DECLINE';
        readonly model: 'nil_offer_decision_v1';
        readonly offer: { readonly offerId: string };
        readonly weekIndex: number;
      }
    | {
        readonly model: 'nil_offer_expiration_v1';
        readonly offer: { readonly offerId: string };
        readonly weekIndex: number;
      }
    | {
        readonly model: 'nil_obligation_resolution_v1';
        readonly offerId: string;
        readonly resolutionId: 'FULFILL' | 'DEFAULT';
        readonly weekIndex: number;
      }
  )[];
  readonly pendingOffers: readonly {
    readonly expiresAfterWeekIndex: number;
    readonly offerId: string;
    readonly offeredWeekIndex: number;
  }[];
}

export type PersistedOffseasonState =
  | {
      readonly completedDecisionCount: 0;
      readonly lastDecision: null;
      readonly status: 'NOT_STARTED';
    }
  | {
      readonly completedDecisionCount: 0;
      readonly lastDecision: null;
      readonly status: 'PROJECTED';
      readonly transferProjection: {
        readonly stayOption: PersistedTransferOption;
        readonly transferOptions: readonly [
          PersistedTransferOption,
          PersistedTransferOption,
          PersistedTransferOption,
        ];
      };
    }
  | {
      readonly completedDecisionCount: 1;
      readonly lastDecision: {
        readonly actualDepthRank: number;
        readonly actualRoleId: string;
        readonly kind: 'STAY' | 'TRANSFER';
        readonly previousProgramId: string;
        readonly selectedProgramId: string;
      };
      readonly status: 'DECIDED';
    };

export interface PersistedTransferOption {
  readonly kind: 'STAY' | 'TRANSFER';
  readonly programId: string;
  readonly projectedDepthRank: number;
  readonly projectedRoleId: string;
  readonly projectedSnapMaxPermille: number;
  readonly projectedSnapMinPermille: number;
}

export interface PersistedOffFieldCareerState {
  readonly academics: PersistedAcademicState;
  readonly model: 'off_field_v1';
  readonly nil: PersistedNilState;
  readonly offseason: PersistedOffseasonState;
  readonly programHistory: readonly {
    readonly endSeasonIndex: number | null;
    readonly programId: string;
    readonly startSeasonIndex: number;
  }[];
  readonly relationships: PersistedRelationshipState;
}

export const REPRESENTATIVE_APPEARANCE = Object.freeze({
  bodyTypeId: 'body_type_broad',
  faceId: 'face_angular',
  glovesId: 'gloves_accent',
  hairStyleId: 'hair_style_braids',
  skinToneId: 'skin_tone_deep',
});

export const REPRESENTATIVE_IDENTITY = Object.freeze({
  archetypeId: 'archetype_wr_route_technician',
  personalityTraitIds: ['personality_competitive', 'personality_leader'] as const,
  recruitingBackgroundId: 'background_late_bloomer',
});

export async function readActiveCareer(page: Page): Promise<PersistedCareer | undefined> {
  return (await readActiveSession(page))?.career;
}

export async function readActiveSession(page: Page): Promise<PersistedCareerSession | undefined> {
  const envelope = await readIndexedDbValue<SaveEnvelope>(page, 'currentCareer', 'active');
  return envelope?.payload;
}

export async function waitForPersistedCareer<PhaseType extends CareerPhaseType>(
  page: Page,
  expected: {
    readonly actionIds?: readonly string[];
    readonly nextActionIndex?: number;
    readonly phase: PhaseType;
    readonly resultActionIds?: readonly string[];
    readonly revision: number;
    readonly weekIndex: number;
  },
): Promise<PersistedCareerInPhase<PhaseType>> {
  await expect
    .poll(async () => {
      const career = await readActiveCareer(page);
      return career === undefined
        ? undefined
        : {
            actionIds: career.phase.type === 'RESOLVE_ACTIONS' ? career.phase.actionIds : undefined,
            nextActionIndex:
              career.phase.type === 'RESOLVE_ACTIONS' ? career.phase.nextActionIndex : undefined,
            phase: career.phase.type,
            resultActionIds:
              career.phase.type === 'RESOLVE_ACTIONS' || career.phase.type === 'WEEK_END'
                ? career.phase.results.map(({ actionId }) => actionId)
                : undefined,
            revision: career.revision,
            weekIndex: career.weekIndex,
          };
    })
    .toEqual({
      actionIds: expected.actionIds,
      nextActionIndex: expected.nextActionIndex,
      phase: expected.phase,
      resultActionIds: expected.resultActionIds,
      revision: expected.revision,
      weekIndex: expected.weekIndex,
    });

  const career = await readActiveCareer(page);
  if (career === undefined) {
    throw new Error('active_career_missing_after_poll');
  }
  return career as PersistedCareerInPhase<PhaseType>;
}

export async function waitForCareerRevision(
  page: Page,
  revision: number,
): Promise<PersistedCareer> {
  await expect.poll(async () => (await readActiveCareer(page))?.revision).toBe(revision);
  const career = await readActiveCareer(page);
  if (career === undefined) {
    throw new Error('active_career_missing_after_revision_poll');
  }
  return career;
}

export async function waitForCareerChange(
  page: Page,
  previousRevision: number,
): Promise<PersistedCareer> {
  await expect
    .poll(async () => (await readActiveCareer(page))?.revision)
    .toBeGreaterThan(previousRevision);
  const career = await readActiveCareer(page);
  if (career === undefined) {
    throw new Error('active_career_missing_after_change_poll');
  }
  return career;
}

export async function completeGameAndAdvanceWeek(
  page: Page,
  weekEnd: PersistedCareerInPhase<'WEEK_END'>,
): Promise<PersistedCareer> {
  let current = await continueShippedSeasonBoundary(page, weekEnd);
  if (current.phase.type === 'PLAN_ACTIONS' || current.phase.type === 'SKILL_BREAKTHROUGH') {
    return current;
  }
  expect(current.phase.type).toBe('GAME_PREVIEW');
  if (current.phase.type !== 'GAME_PREVIEW') {
    throw new Error('season_boundary_did_not_reach_game_or_next_week');
  }

  await page.getByTestId('start-game').click();
  current = await waitForCareerRevision(page, current.revision + 1);

  let resolvedSnapCount = 0;
  while (current.phase.type === 'KEY_SNAP') {
    expect(current.phase.pendingSnap.decisionIds).toHaveLength(3);
    await expect(page.locator('[data-testid^="game-decision-"]')).toHaveCount(3);
    const decisionId = current.phase.pendingSnap.decisionIds[0];
    await page.getByTestId(`game-decision-${decisionId}`).click();
    current = await waitForCareerRevision(page, current.revision + 1);
    resolvedSnapCount += 1;
    if (resolvedSnapCount > 12) {
      throw new Error('game_key_snap_limit_exceeded');
    }
  }

  expect(current.phase.type).toBe('POST_GAME');
  if (current.phase.type !== 'POST_GAME') {
    throw new Error('post_game_phase_missing');
  }
  expect(current.phase.keyPlayLog).toHaveLength(resolvedSnapCount);
  expect(current.phase.summary.keySnapCount).toBe(resolvedSnapCount);

  await page.getByTestId('advance-week').click();
  return waitForCareerChange(page, current.revision);
}

export async function continueShippedSeasonBoundary(
  page: Page,
  weekEnd: PersistedCareerInPhase<'WEEK_END'>,
): Promise<PersistedCareer> {
  await page.getByTestId('advance-week').click();
  let current = await waitForCareerChange(page, weekEnd.revision);
  for (let decisionCount = 0; decisionCount < 3; decisionCount += 1) {
    if (current.phase.type === 'EVENT_CHOICE') {
      const choiceId = current.phase.pendingEvent.choiceIds[0];
      if (choiceId === undefined) throw new Error('season_event_choice_missing');
      await page.getByTestId(`season-event-choice-${choiceId}`).click();
      current = await waitForCareerChange(page, current.revision);
      continue;
    }
    if (current.phase.type === 'INJURY_CHOICE') {
      const choiceId = current.phase.pendingInjury.choiceIds[0];
      if (choiceId === undefined) throw new Error('season_injury_choice_missing');
      await page.getByTestId(`season-injury-choice-${choiceId}`).click();
      current = await waitForCareerChange(page, current.revision);
      continue;
    }
    break;
  }

  if (current.phase.type === 'PLAN_ACTIONS' || current.phase.type === 'SKILL_BREAKTHROUGH') {
    return current;
  }
  return current;
}

export async function finishShippedDevelopmentWeek(
  page: Page,
  startingCareer: PersistedCareer,
  actionIds: readonly [string, string, string],
): Promise<PersistedCareerInPhase<'WEEK_END'>> {
  await draftActions(page, actionIds);
  await page.getByTestId('action-commit').click();
  let current = await waitForCareerRevision(page, startingCareer.revision + 1);
  expect(current.phase.type).toBe('RESOLVE_ACTIONS');
  for (let actionIndex = 0; actionIndex < actionIds.length; actionIndex += 1) {
    await page.getByTestId('resolve-next').click();
    current = await waitForCareerRevision(page, current.revision + 1);
  }
  expect(current.phase.type).toBe('WEEK_END');
  return current as PersistedCareerInPhase<'WEEK_END'>;
}

export async function chooseFirstPendingBreakthrough(
  page: Page,
  career: PersistedCareer,
): Promise<PersistedCareer> {
  if (career.phase.type !== 'SKILL_BREAKTHROUGH') return career;
  const skillId = career.phase.offer.offeredSkillIds[0];
  await page.getByTestId(`skill-offer-${skillId}`).check();
  await page.getByTestId('skill-choose-confirm').click();
  return waitForCareerRevision(page, career.revision + 1);
}

async function selectAppearanceOption(page: Page, optionId: string): Promise<void> {
  const select = page
    .getByTestId('creation-form')
    .locator(`select:has(option[value="${optionId}"])`);
  await expect(select).toHaveCount(1);
  await select.selectOption(optionId);
}

export async function fillRepresentativeCreation(
  page: Page,
  locale: AppLocale,
  displayName: string,
): Promise<void> {
  await expect(page.getByTestId('creation-form')).toBeVisible();
  await page.getByTestId('creation-name').fill(displayName);

  await page
    .locator(`input[name="archetype"][value="${REPRESENTATIVE_IDENTITY.archetypeId}"]`)
    .check();
  await page
    .locator(`input[name="background"][value="${REPRESENTATIVE_IDENTITY.recruitingBackgroundId}"]`)
    .check();
  for (const personalityId of REPRESENTATIVE_IDENTITY.personalityTraitIds) {
    await page.locator(`input[name="personality"][value="${personalityId}"]`).check();
  }

  for (const optionId of Object.values(REPRESENTATIVE_APPEARANCE)) {
    await selectAppearanceOption(page, optionId);
  }

  if (locale === 'en-US') {
    await page.getByTestId('creation-height-feet').fill('6');
    await page.getByTestId('creation-height-inches').fill('3');
    await page.getByTestId('creation-weight-lb').fill('210');
  } else {
    await page.getByTestId('creation-height-cm').fill('191');
    await page.getByTestId('creation-weight-kg').fill('95');
  }
}

export async function createRepresentativeCareer(
  page: Page,
  locale: AppLocale,
  displayName: string,
): Promise<PersistedCareer> {
  const choosing = await createRepresentativeRecruit(page, locale, displayName);
  return commitOfferedProgram(page, choosing);
}

export async function createRepresentativeRecruit(
  page: Page,
  locale: AppLocale,
  displayName: string,
): Promise<PersistedCareer> {
  await fillRepresentativeCreation(page, locale, displayName);
  await page.getByTestId('creation-submit').click();
  await expect(page.getByTestId('career-screen')).toBeVisible();
  return waitForPersistedCareer(page, {
    phase: 'PLAN_ACTIONS',
    revision: 1,
    weekIndex: 0,
  });
}

export async function commitOfferedProgram(
  page: Page,
  choosing: PersistedCareer,
  offerIndex = 0,
): Promise<PersistedCareer> {
  if (choosing.recruitingState.type !== 'CHOOSING') {
    throw new Error('Expected persisted recruiting offers.');
  }
  const offer = choosing.recruitingState.offers[offerIndex];
  if (offer === undefined) {
    throw new Error(`Expected program offer at index ${offerIndex}.`);
  }
  const radio = page.locator(`input[name="program-offer"][value="${offer.programId}"]`);
  await radio.check();
  await page.getByTestId('commit-program').click();
  const committed = await waitForPersistedCareer(page, {
    phase: 'PLAN_ACTIONS',
    revision: choosing.revision + 3,
    weekIndex: choosing.weekIndex,
  });
  expect(committed.programId).toBe(offer.programId);
  return committed;
}

export async function draftActions(page: Page, actionIds: readonly string[]): Promise<void> {
  for (const actionId of actionIds) {
    await page.getByTestId(`action-choice-${actionId}`).click();
  }
  for (const [index, actionId] of actionIds.entries()) {
    await expect(page.getByTestId(`draft-slot-${index}`)).toHaveAttribute(
      'data-action-id',
      actionId,
    );
  }
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
}

export async function expectTouchTarget(locator: Locator, minimumSize = 44): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) {
    return;
  }
  expect(box.width).toBeGreaterThanOrEqual(minimumSize);
  expect(box.height).toBeGreaterThanOrEqual(minimumSize);
}

export async function expectHorizontallyWithinViewport(
  page: Page,
  locator: Locator,
): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (box === null || viewport === null) {
    return;
  }
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 0.5);
}
