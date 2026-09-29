import { useEffect, useRef, useState } from 'react';
import type {
  DepthRoleId,
  EventChoiceId,
  InjuryChoiceId,
  KeySnapDecisionId,
  MetaProfileV1,
  NilObligationResolutionId,
  NilOfferDecisionId,
  NilOfferId,
  ProgramId,
  SkillId,
  WeeklyActionId,
  WeeklyActionResult,
} from '@project-saturday/game-core';
import { deriveNextWeekPreparation } from '@project-saturday/game-core';
import { creationContent } from '@project-saturday/game-content/content';
import type { MessageKey, SupportedLocale } from '@project-saturday/game-content/locales';

import { useAppTranslation, type AppTranslate } from '../i18n/i18n';
import { OnboardingGuide } from '../onboarding/OnboardingUi';
import {
  SKILLS_ONBOARDING_TOPIC,
  TEAM_ONBOARDING_TOPIC,
  WEEK_ONBOARDING_TOPIC,
  isOnboardingComplete,
  type OnboardingSettings,
  type OnboardingTopic,
} from '../onboarding/onboarding';
import { AthletePortrait } from './AthletePortrait';
import {
  ATTRIBUTE_LABEL_KEYS,
  addDraftAction,
  getActionPresentation,
  getAppearanceSummary,
  getArchetypeEmphasisAttributeIds,
  getAttributeProgressPresentation,
  getAttributeSummary,
  getCareerOverall,
  getCareerWeeklyEntries,
  getTrainingProficiencyProgress,
  getTrainingProficiencySummary,
  moveDraftAction,
  removeDraftAction,
} from './career-ui';
import { SkillBreakthroughPanel } from './SkillBreakthroughPanel';
import { SkillBreakthroughProgressPanel } from './SkillBreakthroughProgressPanel';
import { CareerNavigation, type CareerDestination } from './CareerNavigation';
import { ProgressMeter } from './ProgressMeter';
import { GameFlow } from './GameFlow';
import { OffFieldDecisionPanel, OffFieldOverview } from './OffFieldPanels';
import { SkillInventoryPanel } from './SkillInventoryPanel';
import { hasBlockingOffFieldDecision, hasBlockingSeasonDecision } from './season-presentation';
import { SeasonDecisionPanel, SeasonOverview } from './SeasonFlow';
import {
  DepthMovementNotice,
  ProgramDepthPanel,
  ProgramRecruitingPanel,
  RecruitingStartPanel,
} from './ProgramPanels';
import {
  getPassiveRecoverySkillEffectPresentation,
  getPendingPassiveRecoveryPresentation,
  getWeeklySkillEffectPresentation,
  type AppliedActionSkillEffectPresentation,
  type PassiveRecoverySkillEffectPresentation,
} from './skill-ui';
import { formatHeight, formatSignedNumber, formatWeight } from './units';
import type { WrCareerSurface, WrSessionSurface } from './wr-view';

export interface CareerScreenProps {
  readonly busy: boolean;
  readonly career: WrCareerSurface;
  readonly session: WrSessionSurface;
  readonly meta: MetaProfileV1;
  readonly locale: SupportedLocale;
  readonly onboardingSettings: OnboardingSettings;
  readonly onAdvance: () => void;
  readonly onBeginRecruiting: () => void;
  readonly onChooseProgram: (programId: ProgramId) => void;
  readonly onChooseGameDecision: (decisionId: KeySnapDecisionId) => void;
  /** Current-rules WR only; historical v7 careers never enter SNAP_RESOLVED. */
  readonly onContinueSnap?: () => void;
  readonly onChooseEvent: (choiceId: EventChoiceId) => void;
  readonly onChooseInjury: (choiceId: InjuryChoiceId) => void;
  readonly onChooseSkill: (skillId: SkillId) => void;
  readonly onCommit: (draft: readonly WeeklyActionId[]) => void;
  readonly onCompleteOnboarding: (topic: OnboardingTopic) => void;
  readonly onCompleteCareer: () => void;
  readonly onDecideNilOffer: (offerId: NilOfferId, decisionId: NilOfferDecisionId) => void;
  readonly onDecideOffseason: (programId: ProgramId) => void;
  readonly onEnterSeasonReview: () => void;
  readonly onInitializePostseason: () => void;
  readonly onBootstrapNextSeason: () => void;
  readonly onBootstrapSeason: () => void;
  readonly onPrepareGame: () => void;
  readonly onProjectOffseason: () => void;
  readonly onResolve: () => void;
  readonly onResolveNilObligation: (resolutionId: NilObligationResolutionId) => void;
  readonly onSetSkillSlot: (slotIndex: number, skillId: SkillId | null) => void;
  readonly onSkipAllOnboarding: () => void;
  readonly onStartGame: () => void;
  readonly onStartNextCareer: () => void;
  readonly saveBlocked: boolean;
  readonly seasonFlowEnabled: boolean;
}

interface WeeklyDraftState {
  readonly actionIds: readonly WeeklyActionId[];
  readonly weekIndex: number;
}

interface FocusSnapshot {
  readonly gameOpportunityCount: number;
  readonly surface: string;
  readonly resultCount: number;
}

interface PhaseCopy {
  readonly pillKey: MessageKey;
  readonly titleKey: MessageKey;
}

const CARD_PORTRAIT_SIZE = 'card' as const;
const PROFILE_PORTRAIT_SIZE = 'profile' as const;
const WEEKLY_STATE_LABEL_KEYS = {
  body: 'career.player.body',
  preparation: 'career.player.preparation',
  confidence: 'career.player.confidence',
} as const satisfies Record<'body' | 'confidence' | 'preparation', MessageKey>;
const WEEKLY_STATE_IDS = {
  body: 'body',
  preparation: 'preparation',
  confidence: 'confidence',
} as const;
const DEPTH_ROLE_LABEL_KEYS = {
  depth_role_starter: 'career.program.role.starter',
  depth_role_rotation: 'career.program.role.rotation',
  depth_role_reserve: 'career.program.role.reserve',
  depth_role_developmental: 'career.program.role.developmental',
} as const satisfies Record<DepthRoleId, MessageKey>;

interface NavigationSelection {
  readonly destination: CareerDestination;
  readonly surface: string;
}

function recommendedDestination(
  career: WrCareerSurface,
  recruitingDecision: boolean,
): CareerDestination {
  if (recruitingDecision) {
    return 'team';
  }
  return career.phase.type === 'SKILL_BREAKTHROUGH' ? 'skills' : 'week';
}

function nestedDecisionSurface(career: WrCareerSurface): string | null {
  if (career.phase.type === 'SEASON_REVIEW') {
    return `SEASON_REVIEW:${career.offFieldCareerState.offseason.status}`;
  }
  if (career.phase.type !== 'PLAN_ACTIONS') return null;
  const nil = career.offFieldCareerState.nil;
  if (!('bootstrapStatus' in nil) || nil.bootstrapStatus !== 'ACTIVE') return null;
  if (
    nil.activeObligation !== null &&
    nil.activeObligation.lastResolvedWeekIndex !== career.weekIndex
  ) {
    return 'PLAN_ACTIONS:NIL_OBLIGATION';
  }
  return nil.pendingOffers.length > 0 ? 'PLAN_ACTIONS:NIL_OFFER' : null;
}

function assertNeverPhase(phase: never): never {
  throw new Error(`Unsupported career phase: ${JSON.stringify(phase)}`);
}

function getPhaseCopy(phase: WrCareerSurface['phase']): PhaseCopy {
  switch (phase.type) {
    case 'PLAN_ACTIONS':
      return { pillKey: 'career.week.phase.plan', titleKey: 'career.week.plan.title' };
    case 'RESOLVE_ACTIONS':
      return { pillKey: 'career.week.phase.resolve', titleKey: 'career.week.resolve.title' };
    case 'WEEK_END':
      return { pillKey: 'career.week.phase.end', titleKey: 'career.week.end.title' };
    case 'SKILL_BREAKTHROUGH':
      return {
        pillKey: 'career.week.phase.breakthrough',
        titleKey: 'career.week.breakthrough.title',
      };
    case 'GAME_PREVIEW':
      return { pillKey: 'career.game.phase.preview', titleKey: 'career.game.preview.title' };
    case 'KEY_SNAP':
      return { pillKey: 'career.game.phase.keySnap', titleKey: 'career.game.keySnap.title' };
    case 'SNAP_RESOLVED':
      return { pillKey: 'career.game.phase.resolved', titleKey: 'career.game.resolved.title' };
    case 'POST_GAME':
      return { pillKey: 'career.game.phase.postGame', titleKey: 'career.game.postGame.title' };
    case 'EVENT_CHOICE':
      return { pillKey: 'career.event.phase.choice', titleKey: 'career.event.choice.title' };
    case 'INJURY_CHOICE':
      return { pillKey: 'career.injury.phase.choice', titleKey: 'career.injury.choice.title' };
    case 'SEASON_REVIEW':
      return { pillKey: 'career.season.phase.review', titleKey: 'career.season.review.title' };
    case 'CAREER_COMPLETE':
      return { pillKey: 'career.season.phase.complete', titleKey: 'career.season.complete.title' };
    default:
      return assertNeverPhase(phase);
  }
}

function contentMessage(t: AppTranslate, key: string): string {
  return t(key as MessageKey);
}

function formatSignedPercent(locale: SupportedLocale, multiplierPermille: number): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    signDisplay: 'always',
    style: 'percent',
  }).format((multiplierPermille - 1000) / 1000);
}

function formatXpMultiplier(locale: SupportedLocale, multiplierPermille: number): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    style: 'percent',
  }).format(multiplierPermille / 1000);
}

function formatSnapRange(
  locale: SupportedLocale,
  minSnapPermille: number,
  maxSnapPermille: number,
): string {
  const formatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    style: 'percent',
  });
  return `${formatter.format(minSnapPermille / 1000)}–${formatter.format(maxSnapPermille / 1000)}`;
}

function skillEffectMessage(
  effect: AppliedActionSkillEffectPresentation,
  locale: SupportedLocale,
  t: AppTranslate,
): string {
  const skill = t(effect.skill.nameKey);
  switch (effect.evidence.type) {
    case 'action_xp_multiplier':
      return t('career.skills.effects.xp', {
        skill,
        value: formatSignedPercent(locale, effect.evidence.multiplierPermille),
      });
    case 'action_body_cost_multiplier':
      return t('career.skills.effects.bodyCost', {
        skill,
        value: formatSignedPercent(locale, effect.evidence.multiplierPermille),
      });
    case 'action_body_delta_flat':
      return t('career.skills.effects.body', {
        skill,
        value: formatSignedNumber(locale, effect.evidence.delta, 0),
      });
    case 'action_gpa_delta_milli':
      return t('career.skills.effects.gpa', {
        skill,
        value: formatSignedNumber(locale, effect.evidence.deltaMilli / 1000),
      });
    case 'action_preparation_delta_flat':
      return t('career.skills.effects.preparation', {
        skill,
        value: formatSignedNumber(locale, effect.evidence.delta, 0),
      });
    case 'action_confidence_delta_flat':
      return t('career.skills.effects.confidence', {
        skill,
        value: formatSignedNumber(locale, effect.evidence.delta, 0),
      });
    case 'action_practice_impact_flat':
      return t('career.skills.effects.practice', {
        skill,
        value: formatSignedNumber(locale, effect.evidence.delta, 0),
      });
  }
}

function actionSkillEvidence(
  result: WeeklyActionResult,
  locale: SupportedLocale,
  t: AppTranslate,
): React.JSX.Element | null {
  const presentation = getWeeklySkillEffectPresentation(result);
  if (presentation.appliedEffects.length === 0) {
    return null;
  }

  return (
    <section className="skill-evidence" aria-label={t('career.skills.effects.applied')}>
      <h5>{t('career.skills.effects.applied')}</h5>
      <ul>
        {presentation.appliedEffects.map((effect) => (
          <li
            data-effect-type={effect.evidence.type}
            data-testid={`skill-evidence-${effect.evidence.skillId}-${effect.evidence.effectIndex}`}
            key={`${effect.evidence.slotIndex}-${effect.evidence.effectIndex}`}
          >
            {skillEffectMessage(effect, locale, t)}
          </li>
        ))}
      </ul>
    </section>
  );
}

function passiveRecoverySummary(
  presentation: PassiveRecoverySkillEffectPresentation,
  locale: SupportedLocale,
  t: AppTranslate,
  isPreview: boolean,
): React.JSX.Element {
  const mode = isPreview ? 'preview' : 'applied';
  return (
    <aside className="passive-recovery" data-testid={`passive-recovery-${mode}`} role="status">
      <strong>
        {t(isPreview ? 'career.skills.passive.preview' : 'career.skills.passive.applied')}
      </strong>
      <p>
        {t('career.skills.passive.bodyChange', {
          after: presentation.bodyAfter,
          before: presentation.bodyBefore,
          delta: formatSignedNumber(locale, presentation.actualBodyDelta, 0),
        })}
      </p>
      {presentation.appliedEffects.length > 0 && (
        <ul>
          {presentation.appliedEffects.map(({ evidence, skill }) => (
            <li
              data-testid={`skill-evidence-${evidence.skillId}-${evidence.effectIndex}`}
              key={`${evidence.slotIndex}-${evidence.effectIndex}`}
            >
              {t('career.skills.effects.passiveBody', {
                skill: t(skill.nameKey),
                value: formatSignedNumber(locale, evidence.delta, 0),
              })}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

function resultCard(
  result: WeeklyActionResult,
  locale: SupportedLocale,
  t: AppTranslate,
): React.JSX.Element {
  const action = getActionPresentation(result.actionId);
  const proficiencyProgress =
    result.proficiency === null
      ? null
      : getTrainingProficiencyProgress(
          result.actionId,
          result.proficiency.proficiencyId,
          result.proficiency.usesAfter,
        );

  return (
    <article
      className="result-card"
      data-action-id={result.actionId}
      key={`${result.weekIndex}-${result.actionIndex}`}
    >
      <div className="result-card__header">
        <p>{t('career.week.result.actionNumber', { count: result.actionIndex + 1 })}</p>
        <h4>{contentMessage(t, action.nameKey)}</h4>
      </div>
      <dl className="result-list">
        {result.actualBodyDelta !== 0 && (
          <div>
            <dt>{t('career.player.body')}</dt>
            <dd>
              {result.bodyBefore} → {result.bodyAfter}{' '}
              <span>({formatSignedNumber(locale, result.actualBodyDelta, 0)})</span>
            </dd>
          </div>
        )}
        {'preparationAfter' in result && result.actualPreparationDelta !== 0 && (
          <div>
            <dt>{t('career.player.preparation')}</dt>
            <dd>
              {result.preparationBefore} → {result.preparationAfter}{' '}
              <span>{formatSignedNumber(locale, result.actualPreparationDelta, 0)}</span>
            </dd>
          </div>
        )}
        {'confidenceAfter' in result && result.actualConfidenceDelta !== 0 && (
          <div>
            <dt>{t('career.player.confidence')}</dt>
            <dd>
              {result.confidenceBefore} → {result.confidenceAfter}{' '}
              <span>{formatSignedNumber(locale, result.actualConfidenceDelta, 0)}</span>
            </dd>
          </div>
        )}
        {result.actualGpaDelta !== 0 && (
          <div>
            <dt>{t('career.player.gpa')}</dt>
            <dd>
              {new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(result.gpaBefore)}{' '}
              →{' '}
              {new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(result.gpaAfter)}{' '}
              <span>({formatSignedNumber(locale, result.actualGpaDelta)})</span>
            </dd>
          </div>
        )}
      </dl>
      {result.attributeXp.length > 0 && (
        <div className="result-progress-list">
          {result.attributeXp.map((attribute) => {
            const attributeName = t(ATTRIBUTE_LABEL_KEYS[attribute.attributeId]);
            const progress = getAttributeProgressPresentation({
              rating: attribute.ratingAfter,
              xp: attribute.xpAfter,
            });
            return (
              <article
                className="rating-progress-card rating-progress-card--result"
                data-testid={`result-progress-${attribute.attributeId}`}
                key={attribute.attributeId}
              >
                <header>
                  <div>
                    <span>{attributeName}</span>
                    {attribute.ratingAfter > attribute.ratingBefore && (
                      <small>
                        {t('career.progress.ratingGain', {
                          count: attribute.ratingAfter - attribute.ratingBefore,
                        })}
                      </small>
                    )}
                  </div>
                  <strong>{attribute.ratingAfter}</strong>
                </header>
                <ProgressMeter
                  label={t('career.progress.aria', {
                    current: progress.currentXp,
                    name: attributeName,
                    required: progress.requiredXp,
                  })}
                  maximum={progress.requiredXp}
                  value={progress.currentXp}
                  valueText={t('career.progress.xp', {
                    current: progress.currentXp,
                    required: progress.requiredXp,
                  })}
                />
                <div className="progress-copy">
                  <span>
                    {t('career.progress.xp', {
                      current: progress.currentXp,
                      required: progress.requiredXp,
                    })}
                  </span>
                  <strong>
                    {progress.nextRating === null
                      ? t('career.progress.maxRating')
                      : t('career.progress.toNextRating', {
                          count: progress.remainingXp,
                          rating: progress.nextRating,
                        })}
                  </strong>
                </div>
                <p className="progress-earned">
                  {t('career.week.result.appliedXp', { count: attribute.appliedXp })}
                </p>
                <details className="result-breakdown">
                  <summary>{t('career.week.result.breakdown')}</summary>
                  <p>
                    {t('career.week.result.xpBreakdown', {
                      applied: attribute.appliedXp,
                      awarded: attribute.awardedXp,
                      base: attribute.baseXp,
                    })}
                  </p>
                  <p>
                    {t('career.week.result.bodyEfficiency', {
                      value: formatXpMultiplier(locale, result.bodyXpEfficiencyPermille),
                    })}
                  </p>
                </details>
              </article>
            );
          })}
        </div>
      )}
      {proficiencyProgress !== null && (
        <article
          className="proficiency-progress proficiency-progress--result"
          data-testid={`result-proficiency-${proficiencyProgress.proficiencyId}`}
        >
          <header>
            <span>{t('career.week.result.proficiency')}</span>
            <strong>
              {t('career.player.proficiency.level', { count: proficiencyProgress.level })}
            </strong>
          </header>
          <p>
            {t('career.player.proficiency.currentBenefit', {
              value: formatXpMultiplier(locale, proficiencyProgress.currentMultiplierPermille),
            })}
          </p>
          <ProgressMeter
            label={t('career.player.proficiency.progressAria', {
              action: contentMessage(t, action.nameKey),
              uses: proficiencyProgress.uses,
            })}
            maximum={1000}
            value={proficiencyProgress.progressPermille}
            valueText={
              proficiencyProgress.nextThreshold === null
                ? t('career.player.proficiency.max')
                : t('career.player.proficiency.nextThreshold', {
                    count: proficiencyProgress.nextThreshold,
                    remaining: proficiencyProgress.remainingUses,
                    uses: proficiencyProgress.uses,
                  })
            }
          />
          {proficiencyProgress.nextThreshold === null ? (
            <p className="progress-copy">{t('career.player.proficiency.max')}</p>
          ) : (
            <div className="proficiency-progress__next">
              <span>
                {t('career.player.proficiency.nextThreshold', {
                  count: proficiencyProgress.nextThreshold,
                  remaining: proficiencyProgress.remainingUses,
                  uses: proficiencyProgress.uses,
                })}
              </span>
              <strong>
                {t('career.player.proficiency.nextBenefit', {
                  level: proficiencyProgress.nextLevel,
                  value: formatXpMultiplier(
                    locale,
                    proficiencyProgress.nextMultiplierPermille ??
                      proficiencyProgress.currentMultiplierPermille,
                  ),
                })}
              </strong>
            </div>
          )}
        </article>
      )}
      {actionSkillEvidence(result, locale, t)}
    </article>
  );
}

export function CareerScreen({
  busy,
  career,
  session,
  meta,
  locale,
  onboardingSettings,
  onAdvance,
  onBeginRecruiting,
  onChooseProgram,
  onChooseGameDecision,
  onContinueSnap,
  onChooseEvent,
  onChooseInjury,
  onChooseSkill,
  onCommit,
  onCompleteOnboarding,
  onCompleteCareer,
  onDecideNilOffer,
  onDecideOffseason,
  onEnterSeasonReview,
  onInitializePostseason,
  onBootstrapNextSeason,
  onBootstrapSeason,
  onPrepareGame,
  onProjectOffseason,
  onResolve,
  onResolveNilObligation,
  onSetSkillSlot,
  onSkipAllOnboarding,
  onStartGame,
  onStartNextCareer,
  saveBlocked,
  seasonFlowEnabled,
}: CareerScreenProps): React.JSX.Element {
  const { t } = useAppTranslation(locale);
  const [draftState, setDraftState] = useState<WeeklyDraftState>({
    actionIds: [],
    weekIndex: career.weekIndex,
  });
  const phaseHeadingRef = useRef<HTMLHeadingElement>(null);
  const latestResultRef = useRef<HTMLElement>(null);
  const focusSnapshotRef = useRef<FocusSnapshot | null>(null);
  const failedSaveObservedRef = useRef(false);
  const previousSaveBlockedRef = useRef(saveBlocked);
  const draft = draftState.weekIndex === career.weekIndex ? draftState.actionIds : ([] as const);
  const entries = getCareerWeeklyEntries(career);
  const archetype = creationContent.wrArchetypes.find(({ id }) => id === career.player.archetypeId);
  const background = creationContent.recruitingBackgrounds.find(
    ({ id }) => id === career.player.recruitingBackgroundId,
  );
  const personalities = career.player.personalityTraitIds.map((traitId) =>
    creationContent.personalityTraits.find(({ id }) => id === traitId),
  );
  const appearance = getAppearanceSummary(career.player.appearance);
  const attributes = getAttributeSummary(career);
  const archetypeEmphasisAttributeIds = getArchetypeEmphasisAttributeIds(career);
  const archetypeEmphasisNames = new Intl.ListFormat(locale, {
    style: 'long',
    type: 'conjunction',
  }).format(
    archetypeEmphasisAttributeIds.map((attributeId) => t(ATTRIBUTE_LABEL_KEYS[attributeId])),
  );
  const proficiencySummary = getTrainingProficiencySummary(career);
  const resolvedCount =
    career.phase.type === 'RESOLVE_ACTIONS' || career.phase.type === 'WEEK_END'
      ? career.phase.results.length
      : 0;
  const gameOpportunityCount =
    career.phase.type === 'KEY_SNAP' ? career.phase.game.opportunitiesPresented : 0;
  const resolvePhase = career.phase.type === 'RESOLVE_ACTIONS' ? career.phase : undefined;
  const remainingCount =
    career.phase.type === 'PLAN_ACTIONS'
      ? 3 - draft.length
      : career.phase.type === 'RESOLVE_ACTIONS'
        ? Math.max(0, 3 - resolvedCount)
        : 0;
  const controlsDisabled = busy || saveBlocked;
  const recruitingDecision =
    career.recruitingState.type === 'CHOOSING' ||
    (career.recruitingState.type === 'NOT_STARTED' && career.phase.type === 'PLAN_ACTIONS');
  const surface =
    career.recruitingState.type === 'CHOOSING'
      ? 'PROGRAM_CHOICE'
      : career.recruitingState.type === 'NOT_STARTED' && career.phase.type === 'PLAN_ACTIONS'
        ? 'RECRUITING_START'
        : (nestedDecisionSurface(career) ?? career.phase.type);
  const nextDestination = recommendedDestination(career, recruitingDecision);
  const [navigationSelection, setNavigationSelection] = useState<NavigationSelection>(() => ({
    destination: nextDestination,
    surface,
  }));
  const activeDestination =
    navigationSelection.surface === surface ? navigationSelection.destination : nextDestination;
  const onboardingTopic: OnboardingTopic | null =
    activeDestination === 'team'
      ? TEAM_ONBOARDING_TOPIC
      : !recruitingDecision && activeDestination === 'week'
        ? WEEK_ONBOARDING_TOPIC
        : !recruitingDecision && activeDestination === 'skills'
          ? SKILLS_ONBOARDING_TOPIC
          : null;
  const phaseCopy = getPhaseCopy(career.phase);
  const lastPassiveRecovery = getPassiveRecoverySkillEffectPresentation(
    career.lastPassiveBodyRecovery,
  );
  const pendingPassiveRecovery =
    career.phase.type === 'WEEK_END' || career.phase.type === 'POST_GAME'
      ? getPendingPassiveRecoveryPresentation(career)
      : null;
  const blockingSeasonDecision = seasonFlowEnabled && hasBlockingSeasonDecision(session);
  const blockingOffFieldDecision = seasonFlowEnabled && hasBlockingOffFieldDecision(session);

  function updateDraft(
    update: (current: readonly WeeklyActionId[]) => readonly WeeklyActionId[],
  ): void {
    setDraftState((current) => ({
      actionIds: update(current.weekIndex === career.weekIndex ? current.actionIds : []),
      weekIndex: career.weekIndex,
    }));
  }

  function navigate(destination: CareerDestination): void {
    setNavigationSelection({ destination, surface });
  }

  useEffect(() => {
    const previous = focusSnapshotRef.current;
    if (previous === null || previous.surface !== surface) {
      phaseHeadingRef.current?.focus();
    } else if (resolvedCount > previous.resultCount) {
      latestResultRef.current?.focus();
    } else if (gameOpportunityCount > previous.gameOpportunityCount) {
      phaseHeadingRef.current?.focus();
    }
    focusSnapshotRef.current = {
      gameOpportunityCount,
      surface,
      resultCount: resolvedCount,
    };
  }, [gameOpportunityCount, resolvedCount, surface]);

  useEffect(() => {
    if (saveBlocked && !busy) {
      failedSaveObservedRef.current = true;
    }
    if (previousSaveBlockedRef.current && !saveBlocked && failedSaveObservedRef.current) {
      failedSaveObservedRef.current = false;
      phaseHeadingRef.current?.focus();
    }
    previousSaveBlockedRef.current = saveBlocked;
  }, [busy, saveBlocked]);

  if (
    archetype === undefined ||
    background === undefined ||
    personalities.some((personality) => personality === undefined)
  ) {
    throw new Error('Career identity is missing shipped content.');
  }
  const personalityNames = personalities.map((personality) => {
    if (personality === undefined) {
      throw new Error('Career personality is missing shipped content.');
    }
    return contentMessage(t, personality.nameKey);
  });

  return (
    <main
      className="career-layout"
      data-destination={activeDestination}
      data-testid="career-screen"
    >
      <CareerNavigation
        activeDestination={activeDestination}
        locale={locale}
        onNavigate={navigate}
      />

      <section className="career-context" aria-labelledby="career-player-name">
        <div>
          <p className="eyebrow" data-testid="career-week">
            {t('career.player.week', { count: career.weekIndex + 1 })}
          </p>
          <h1 id="career-player-name">{career.player.displayName}</h1>
        </div>
        <div className="overall-badge">
          <span>{t('career.player.overall')}</span>
          <strong>{getCareerOverall(career)}</strong>
        </div>
      </section>

      {onboardingTopic !== null && !isOnboardingComplete(onboardingSettings, onboardingTopic) && (
        <OnboardingGuide
          locale={locale}
          topic={onboardingTopic}
          onComplete={onCompleteOnboarding}
          onSkipAll={onSkipAllOnboarding}
        />
      )}

      {activeDestination === 'home' && (
        <div className="career-destination career-home" data-testid="destination-home">
          <div className="destination-heading">
            <p className="step-mark">{t('career.player.week', { count: career.weekIndex + 1 })}</p>
            <h2>{t('career.home.title')}</h2>
            <p>{t('career.home.help')}</p>
          </div>
          {seasonFlowEnabled && <SeasonOverview locale={locale} session={session} />}
          <section className="career-hero" aria-labelledby="career-home-player-name">
            <div className="athlete-portrait-host" data-testid="athletePortraitHome">
              <AthletePortrait
                appearance={career.player.appearance}
                label={t('career.player.portraitLabel', { name: career.player.displayName })}
                size={CARD_PORTRAIT_SIZE}
              />
            </div>
            <div className="career-hero__identity">
              <p className="eyebrow">{t('career.position.wr')}</p>
              <h3 id="career-home-player-name">{career.player.displayName}</h3>
              <p>
                {t('career.position.wr')} · {contentMessage(t, archetype.nameKey)}
              </p>
              <p className="identity-detail">
                {contentMessage(t, background.nameKey)} · {personalityNames.join(' · ')}
              </p>
            </div>
          </section>

          {career.programContext !== null && (
            <section
              className="career-role-strip"
              data-testid="home-role-strip"
              aria-label={t('career.program.depth.outlookTitle')}
            >
              <div className="career-role-strip__snaps">
                <span>{t('career.program.depth.snaps')}</span>
                <strong>
                  {formatSnapRange(
                    locale,
                    career.programContext.projection.minSnapPermille,
                    career.programContext.projection.maxSnapPermille,
                  )}
                </strong>
              </div>
              <dl>
                <div>
                  <dt>{t('career.program.depth.role')}</dt>
                  <dd>
                    {t('career.program.depth.outlookRole', {
                      rank: career.programContext.projection.rank,
                      role: t(DEPTH_ROLE_LABEL_KEYS[career.programContext.projection.roleId]),
                    })}
                  </dd>
                </div>
                <div>
                  <dt>{t('career.player.coachTrust')}</dt>
                  <dd>{career.player.state.coachTrust}</dd>
                </div>
                <div>
                  <dt>{t('career.program.depth.practiceForm')}</dt>
                  <dd>{career.programContext.playerPracticeForm}</dd>
                </div>
              </dl>
            </section>
          )}

          {!recruitingDecision && (
            <section className="career-vitals" aria-label={t('career.player.status')}>
              <article data-state="body">
                <span>{t('career.player.body')}</span>
                <strong>{career.player.state.body}</strong>
                <div
                  className="meter"
                  role="meter"
                  aria-label={t('career.player.body')}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={career.player.state.body}
                >
                  <span style={{ width: `${career.player.state.body}%` }} />
                </div>
              </article>
              <article data-state="preparation">
                <span>{t('career.player.preparation')}</span>
                <strong>{career.player.state.preparation}</strong>
                <div
                  className="meter"
                  role="meter"
                  aria-label={t('career.player.preparation')}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={career.player.state.preparation}
                >
                  <span style={{ width: `${career.player.state.preparation}%` }} />
                </div>
              </article>
              <article data-state="confidence">
                <span>{t('career.player.confidence')}</span>
                <strong>{career.player.state.confidence}</strong>
                <div
                  className="meter"
                  role="meter"
                  aria-label={t('career.player.confidence')}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={career.player.state.confidence}
                >
                  <span style={{ width: `${career.player.state.confidence}%` }} />
                </div>
              </article>
              <article data-state="academics">
                <span>{t('career.player.gpa')}</span>
                <strong>
                  {new Intl.NumberFormat(locale, { minimumFractionDigits: 1 }).format(
                    career.player.state.gpa,
                  )}
                </strong>
              </article>
              <article data-state="actions">
                <span>{t('career.week.remaining')}</span>
                <strong>{remainingCount}</strong>
              </article>
            </section>
          )}

          {seasonFlowEnabled && !recruitingDecision && (
            <OffFieldOverview locale={locale} session={session} />
          )}

          <section className="next-action" aria-labelledby="next-action-heading">
            <div>
              <p className="step-mark">{t('career.home.next')}</p>
              <h3 id="next-action-heading">{t(phaseCopy.titleKey)}</h3>
            </div>
            <button
              className="primary-action"
              data-testid="home-next-action"
              type="button"
              onClick={() => navigate(nextDestination)}
            >
              {t(
                nextDestination === 'team'
                  ? 'career.home.next.team'
                  : nextDestination === 'skills'
                    ? 'career.home.next.skills'
                    : 'career.home.next.week',
              )}
            </button>
          </section>
        </div>
      )}

      {activeDestination === 'team' &&
        career.recruitingState.type === 'NOT_STARTED' &&
        career.phase.type === 'PLAN_ACTIONS' && (
          <RecruitingStartPanel
            busy={busy}
            controlsDisabled={controlsDisabled}
            headingRef={phaseHeadingRef}
            locale={locale}
            onBegin={onBeginRecruiting}
          />
        )}

      {activeDestination === 'team' && career.recruitingState.type === 'CHOOSING' && (
        <ProgramRecruitingPanel
          busy={busy}
          career={career}
          controlsDisabled={controlsDisabled}
          headingRef={phaseHeadingRef}
          locale={locale}
          onChoose={onChooseProgram}
        />
      )}

      {activeDestination === 'team' && career.recruitingState.type === 'COMMITTED' && (
        <>
          <ProgramDepthPanel career={career} locale={locale} />
          {seasonFlowEnabled && <OffFieldOverview detailed locale={locale} session={session} />}
        </>
      )}

      {!recruitingDecision &&
        (activeDestination === 'week' ||
          (activeDestination === 'skills' && career.phase.type === 'SKILL_BREAKTHROUGH')) && (
          <section
            className="weekly-flow"
            data-phase={career.phase.type}
            data-testid="weekly-phase"
            aria-labelledby="weekly-heading"
          >
            <div className="section-heading section-heading--row">
              <div>
                <p className="step-mark">
                  {t('career.week.phaseLabel')} ·{' '}
                  <span>{t('career.player.week', { count: career.weekIndex + 1 })}</span>
                </p>
                <h2 id="weekly-heading" ref={phaseHeadingRef} tabIndex={-1}>
                  {t(phaseCopy.titleKey)}
                </h2>
              </div>
              <span className="phase-pill">{t(phaseCopy.pillKey)}</span>
            </div>

            {seasonFlowEnabled && (
              <>
                <SeasonOverview locale={locale} session={session} />
                {!blockingOffFieldDecision && (
                  <SeasonDecisionPanel
                    busy={busy}
                    controlsDisabled={controlsDisabled}
                    locale={locale}
                    meta={meta}
                    session={session}
                    onBootstrapNextSeason={onBootstrapNextSeason}
                    onBootstrapSeason={onBootstrapSeason}
                    onChooseEvent={onChooseEvent}
                    onChooseInjury={onChooseInjury}
                    onCompleteCareer={onCompleteCareer}
                    onDecideOffseason={onDecideOffseason}
                    onEnterSeasonReview={onEnterSeasonReview}
                    onInitializePostseason={onInitializePostseason}
                    onProjectOffseason={onProjectOffseason}
                    onStartNextCareer={onStartNextCareer}
                  />
                )}
                {career.phase.type === 'PLAN_ACTIONS' && (
                  <OffFieldDecisionPanel
                    controlsDisabled={controlsDisabled}
                    locale={locale}
                    session={session}
                    onDecideNilOffer={onDecideNilOffer}
                    onResolveNilObligation={onResolveNilObligation}
                  />
                )}
              </>
            )}

            {(career.phase.type === 'PLAN_ACTIONS' || career.phase.type === 'SKILL_BREAKTHROUGH') &&
              lastPassiveRecovery !== null &&
              passiveRecoverySummary(lastPassiveRecovery, locale, t, false)}

            {career.phase.type === 'SKILL_BREAKTHROUGH' && (
              <>
                <SkillBreakthroughProgressPanel
                  gauge={career.player.skillState.breakthroughGauge}
                  locale={locale}
                  offer={career.phase.offer}
                />
                <SkillBreakthroughPanel
                  controlsDisabled={controlsDisabled}
                  locale={locale}
                  offer={career.phase.offer}
                  saving={busy}
                  onChoose={onChooseSkill}
                />
              </>
            )}

            {(career.phase.type === 'GAME_PREVIEW' ||
              career.phase.type === 'KEY_SNAP' ||
              career.phase.type === 'SNAP_RESOLVED' ||
              career.phase.type === 'POST_GAME') && (
              <GameFlow
                career={career}
                controlsDisabled={controlsDisabled}
                locale={locale}
                onChooseDecision={onChooseGameDecision}
                onContinueSnap={onContinueSnap}
                onStartGame={onStartGame}
              />
            )}

            {career.phase.type === 'POST_GAME' && (
              <div className="post-game-advance">
                {pendingPassiveRecovery !== null &&
                  passiveRecoverySummary(pendingPassiveRecovery, locale, t, true)}
                {career.weeklyExperienceVersion === 2 && (
                  <p className="week-rollover-note" data-testid="preparation-rollover-preview">
                    {t('career.week.end.preparationRollover', {
                      after: deriveNextWeekPreparation(career.player.state.preparation),
                      before: career.player.state.preparation,
                    })}
                  </p>
                )}
                <button
                  className="primary-action"
                  data-testid="advance-week"
                  disabled={controlsDisabled}
                  type="button"
                  onClick={onAdvance}
                >
                  {t(controlsDisabled ? 'career.game.saving' : 'career.game.postGame.continue')}
                </button>
              </div>
            )}

            {career.phase.type === 'PLAN_ACTIONS' &&
              !blockingSeasonDecision &&
              !blockingOffFieldDecision && (
                <div className="planning-flow">
                  <p>{t('career.week.plan.help')}</p>
                  <section
                    className="career-vitals weekly-vitals"
                    aria-label={t('career.week.strategyStatus')}
                    data-testid="weekly-strategy-status"
                  >
                    {(
                      [
                        [
                          WEEKLY_STATE_IDS.body,
                          WEEKLY_STATE_LABEL_KEYS.body,
                          career.player.state.body,
                        ],
                        [
                          WEEKLY_STATE_IDS.preparation,
                          WEEKLY_STATE_LABEL_KEYS.preparation,
                          career.player.state.preparation,
                        ],
                        [
                          WEEKLY_STATE_IDS.confidence,
                          WEEKLY_STATE_LABEL_KEYS.confidence,
                          career.player.state.confidence,
                        ],
                      ] as const
                    ).map(([stateId, labelKey, value]) => (
                      <article data-state={stateId} key={labelKey}>
                        <span>{t(labelKey)}</span>
                        <strong>{value}</strong>
                        <div
                          className="meter"
                          role="meter"
                          aria-label={t(labelKey)}
                          aria-valuemax={100}
                          aria-valuemin={0}
                          aria-valuenow={value}
                        >
                          <span style={{ width: `${value}%` }} />
                        </div>
                      </article>
                    ))}
                  </section>
                  <ol className="draft-slots" data-testid="action-draft">
                    {[0, 1, 2].map((slotIndex) => {
                      const actionId = draft[slotIndex];
                      const action =
                        actionId === undefined ? undefined : getActionPresentation(actionId);
                      return (
                        <li
                          key={slotIndex}
                          data-action-id={actionId}
                          data-testid={`draft-slot-${slotIndex}`}
                        >
                          <span className="draft-slot__number">{slotIndex + 1}</span>
                          <strong>
                            {action === undefined
                              ? t('career.week.draft.empty')
                              : contentMessage(t, action.nameKey)}
                          </strong>
                          {actionId !== undefined && (
                            <div className="draft-slot__controls">
                              <button
                                aria-label={t('career.week.draft.moveUp')}
                                disabled={controlsDisabled || slotIndex === 0}
                                type="button"
                                onClick={() =>
                                  updateDraft((current) =>
                                    moveDraftAction(current, slotIndex, slotIndex - 1),
                                  )
                                }
                              >
                                ↑
                              </button>
                              <button
                                aria-label={t('career.week.draft.moveDown')}
                                disabled={controlsDisabled || slotIndex === draft.length - 1}
                                type="button"
                                onClick={() =>
                                  updateDraft((current) =>
                                    moveDraftAction(current, slotIndex, slotIndex + 1),
                                  )
                                }
                              >
                                ↓
                              </button>
                              <button
                                aria-label={t('career.week.draft.remove', {
                                  action:
                                    action === undefined
                                      ? t('career.week.draft.empty')
                                      : contentMessage(t, action.nameKey),
                                })}
                                disabled={controlsDisabled}
                                type="button"
                                onClick={() =>
                                  updateDraft((current) => removeDraftAction(current, slotIndex))
                                }
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>

                  <div className="action-list">
                    {entries.map(({ presentation }) => (
                      <article
                        className="action-card"
                        key={presentation.id}
                        data-action-id={presentation.id}
                      >
                        <div>
                          <h3>{contentMessage(t, presentation.nameKey)}</h3>
                          <p>{contentMessage(t, presentation.descriptionKey)}</p>
                        </div>
                        <div className="action-card__effects" aria-label={t('career.week.preview')}>
                          <small>{t('career.week.preview')}</small>
                          {presentation.bodyDelta !== 0 && (
                            <span>
                              {t('career.player.body')}{' '}
                              {formatSignedNumber(locale, presentation.bodyDelta, 0)}
                            </span>
                          )}
                          {presentation.preparationDelta !== 0 && (
                            <span>
                              {t('career.player.preparation')}{' '}
                              {formatSignedNumber(locale, presentation.preparationDelta, 0)}
                            </span>
                          )}
                          {presentation.confidenceDelta !== 0 && (
                            <span>
                              {t('career.player.confidence')}{' '}
                              {formatSignedNumber(locale, presentation.confidenceDelta, 0)}
                            </span>
                          )}
                          {presentation.gpaDelta !== 0 && (
                            <span>
                              {t('career.player.gpa')}{' '}
                              {formatSignedNumber(locale, presentation.gpaDelta)}
                            </span>
                          )}
                          {career.recruitingState.type === 'COMMITTED' &&
                            presentation.practiceImpact !== 0 && (
                              <span>
                                {t('career.week.practiceImpact')}{' '}
                                {formatSignedNumber(locale, presentation.practiceImpact, 0)}
                              </span>
                            )}
                        </div>
                        <button
                          className="secondary-action"
                          data-action-id={presentation.id}
                          data-testid={`action-choice-${presentation.id}`}
                          disabled={controlsDisabled || draft.length >= 3}
                          type="button"
                          onClick={() =>
                            updateDraft((current) => addDraftAction(current, presentation.id))
                          }
                        >
                          {t('career.week.addAction')}
                        </button>
                      </article>
                    ))}
                  </div>

                  <button
                    className="primary-action"
                    data-testid="action-commit"
                    disabled={controlsDisabled || draft.length !== 3}
                    type="button"
                    onClick={() => onCommit(draft)}
                  >
                    {busy ? t('career.week.saving') : t('career.week.commit')}
                  </button>
                </div>
              )}

            {resolvePhase !== undefined && (
              <div className="resolution-flow">
                <ol className="resolution-queue">
                  {resolvePhase.actionIds.map((actionId, index) => {
                    const action = getActionPresentation(actionId);
                    const status =
                      index < resolvePhase.nextActionIndex
                        ? t('career.week.queue.complete')
                        : index === resolvePhase.nextActionIndex
                          ? t('career.week.queue.current')
                          : t('career.week.queue.waiting');
                    return (
                      <li key={`${actionId}-${index}`} data-action-id={actionId}>
                        <span>{index + 1}</span>
                        <strong>{contentMessage(t, action.nameKey)}</strong>
                        <em>{status}</em>
                      </li>
                    );
                  })}
                </ol>
                {resolvePhase.results.at(-1) !== undefined && (
                  <section
                    ref={latestResultRef}
                    aria-atomic={true}
                    aria-labelledby="latest-result-heading"
                    aria-live="polite"
                    className="latest-result"
                    data-testid="latest-result"
                    role="status"
                    tabIndex={-1}
                  >
                    <h3 id="latest-result-heading">{t('career.week.result.latest')}</h3>
                    {resultCard(resolvePhase.results.at(-1) as WeeklyActionResult, locale, t)}
                  </section>
                )}
                <button
                  className="primary-action"
                  data-testid="resolve-next"
                  disabled={controlsDisabled}
                  type="button"
                  onClick={onResolve}
                >
                  {busy ? t('career.week.saving') : t('career.week.resolve.next')}
                </button>
              </div>
            )}

            {career.phase.type === 'WEEK_END' && (
              <div className="week-end-flow">
                <p>{t('career.week.end.help')}</p>
                {career.phase.depthUpdate !== null && (
                  <DepthMovementNotice evidence={career.phase.depthUpdate} locale={locale} />
                )}
                <div className="week-results">
                  {career.phase.results.map((result) => resultCard(result, locale, t))}
                </div>
                {career.recruitingState.type !== 'COMMITTED' &&
                  pendingPassiveRecovery !== null &&
                  passiveRecoverySummary(pendingPassiveRecovery, locale, t, true)}
                {career.recruitingState.type !== 'COMMITTED' &&
                  career.weeklyExperienceVersion === 2 && (
                    <p className="week-rollover-note" data-testid="preparation-rollover-preview">
                      {t('career.week.end.preparationRollover', {
                        after: deriveNextWeekPreparation(career.player.state.preparation),
                        before: career.player.state.preparation,
                      })}
                    </p>
                  )}
                <button
                  className="primary-action"
                  data-testid="advance-week"
                  disabled={controlsDisabled}
                  type="button"
                  onClick={career.recruitingState.type === 'COMMITTED' ? onPrepareGame : onAdvance}
                >
                  {busy
                    ? t('career.game.saving')
                    : t(
                        career.recruitingState.type === 'COMMITTED'
                          ? career.seasonCareerState.bootstrapStatus === 'ACTIVE'
                            ? 'career.season.weekBoundary.action'
                            : 'career.game.preview.open'
                          : 'career.week.end.advance',
                      )}
                </button>
              </div>
            )}
          </section>
        )}

      {!recruitingDecision &&
        activeDestination === 'skills' &&
        career.phase.type !== 'SKILL_BREAKTHROUGH' && (
          <section
            className="career-destination skills-destination"
            data-testid="destination-skills"
          >
            <div className="destination-heading">
              <p className="step-mark">{t('career.navigation.skills')}</p>
              <h2>{t('career.skills.pageTitle')}</h2>
              <p>{t('career.skills.pageHelp')}</p>
            </div>
            <SkillBreakthroughProgressPanel
              gauge={career.player.skillState.breakthroughGauge}
              locale={locale}
            />
            <SkillInventoryPanel
              career={career}
              controlsDisabled={controlsDisabled}
              locale={locale}
              onSetSlot={onSetSkillSlot}
            />
            {career.player.skillState.acquisitions.length === 0 && (
              <p className="empty-destination" data-testid="skills-empty">
                {t('career.skills.empty')}
              </p>
            )}
          </section>
        )}

      {!recruitingDecision && activeDestination === 'player' && (
        <section className="player-details" aria-labelledby="player-details-heading">
          <div className="section-heading">
            <p className="step-mark">{t('career.player.profileLabel')}</p>
            <h2 id="player-details-heading">{t('career.player.profile')}</h2>
          </div>
          <div className="athlete-portrait-host" data-testid="athletePortraitPlayer">
            <AthletePortrait
              appearance={career.player.appearance}
              label={t('career.player.portraitLabel', { name: career.player.displayName })}
              size={PROFILE_PORTRAIT_SIZE}
            />
          </div>
          <dl className="identity-list">
            <div>
              <dt>{t('career.player.height')}</dt>
              <dd>{formatHeight(locale, career.player.heightCm)}</dd>
            </div>
            <div>
              <dt>{t('career.player.weight')}</dt>
              <dd>{formatWeight(locale, career.player.weightKg)}</dd>
            </div>
            <div>
              <dt>{t('career.player.confidence')}</dt>
              <dd>{career.player.state.confidence}</dd>
            </div>
            <div>
              <dt>{t('career.player.preparation')}</dt>
              <dd>{career.player.state.preparation}</dd>
            </div>
            <div>
              <dt>{t('career.player.coachTrust')}</dt>
              <dd>{career.player.state.coachTrust}</dd>
            </div>
            <div>
              <dt>{t('career.player.brand')}</dt>
              <dd>{career.player.state.brand}</dd>
            </div>
          </dl>

          <section className="player-progression" aria-labelledby="player-progression-heading">
            <div className="section-heading">
              <p className="step-mark">{t('career.player.progression.label')}</p>
              <h3 id="player-progression-heading">{t('career.player.progression.title')}</h3>
              <p>
                {t('career.player.progression.help', {
                  archetype: contentMessage(t, archetype.nameKey),
                  attributes: archetypeEmphasisNames,
                })}
              </p>
            </div>
            <div className="ratings-grid" data-testid="attribute-progress-grid">
              {attributes.map(({ attributeId, progress }) => {
                const presentation = getAttributeProgressPresentation(progress);
                const attributeName = t(ATTRIBUTE_LABEL_KEYS[attributeId]);
                const emphasized = archetypeEmphasisAttributeIds.includes(attributeId);
                return (
                  <article
                    className="rating-progress-card"
                    data-emphasized={emphasized}
                    data-testid={`attribute-progress-${attributeId}`}
                    key={attributeId}
                  >
                    <header>
                      <div>
                        <span>{attributeName}</span>
                        {emphasized && <small>{t('career.player.progression.key')}</small>}
                      </div>
                      <strong>{progress.rating}</strong>
                    </header>
                    <ProgressMeter
                      label={t('career.progress.aria', {
                        current: presentation.currentXp,
                        name: attributeName,
                        required: presentation.requiredXp,
                      })}
                      maximum={presentation.requiredXp}
                      value={presentation.currentXp}
                      valueText={t('career.progress.xp', {
                        current: presentation.currentXp,
                        required: presentation.requiredXp,
                      })}
                    />
                    <div className="progress-copy">
                      <span>
                        {t('career.progress.xp', {
                          current: presentation.currentXp,
                          required: presentation.requiredXp,
                        })}
                      </span>
                      <strong>
                        {presentation.nextRating === null
                          ? t('career.progress.maxRating')
                          : t('career.progress.toNextRating', {
                              count: presentation.remainingXp,
                              rating: presentation.nextRating,
                            })}
                      </strong>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="player-proficiencies" aria-labelledby="player-proficiencies-heading">
            <div className="section-heading">
              <p className="step-mark">{t('career.player.proficiency.label')}</p>
              <h3 id="player-proficiencies-heading">{t('career.player.proficiency.title')}</h3>
              <p>{t('career.player.proficiency.help')}</p>
            </div>
            <div className="proficiency-list" data-testid="proficiency-progress-list">
              {proficiencySummary.map((proficiency) => {
                const action = getActionPresentation(proficiency.actionId);
                const actionName = contentMessage(t, action.nameKey);
                return (
                  <article
                    className="proficiency-progress"
                    data-testid={`proficiency-progress-${proficiency.proficiencyId}`}
                    key={proficiency.proficiencyId}
                  >
                    <header>
                      <span>{actionName}</span>
                      <strong>
                        {t('career.player.proficiency.level', { count: proficiency.level })}
                      </strong>
                    </header>
                    <p>
                      {t('career.player.proficiency.currentBenefit', {
                        value: formatXpMultiplier(locale, proficiency.currentMultiplierPermille),
                      })}
                    </p>
                    <ProgressMeter
                      label={t('career.player.proficiency.progressAria', {
                        action: actionName,
                        uses: proficiency.uses,
                      })}
                      maximum={1000}
                      value={proficiency.progressPermille}
                      valueText={
                        proficiency.nextThreshold === null
                          ? t('career.player.proficiency.max')
                          : t('career.player.proficiency.nextThreshold', {
                              count: proficiency.nextThreshold,
                              remaining: proficiency.remainingUses,
                              uses: proficiency.uses,
                            })
                      }
                    />
                    {proficiency.nextThreshold === null ? (
                      <p className="progress-copy">{t('career.player.proficiency.max')}</p>
                    ) : (
                      <div className="proficiency-progress__next">
                        <span>
                          {t('career.player.proficiency.nextThreshold', {
                            count: proficiency.nextThreshold,
                            remaining: proficiency.remainingUses,
                            uses: proficiency.uses,
                          })}
                        </span>
                        <strong>
                          {t('career.player.proficiency.nextBenefit', {
                            level: proficiency.nextLevel,
                            value: formatXpMultiplier(
                              locale,
                              proficiency.nextMultiplierPermille ??
                                proficiency.currentMultiplierPermille,
                            ),
                          })}
                        </strong>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <details>
            <summary>{t('career.player.appearance')}</summary>
            <dl className="appearance-grid">
              {appearance.map((row) => (
                <div key={row.field}>
                  <dt>{contentMessage(t, row.labelKey)}</dt>
                  <dd>{contentMessage(t, row.nameKey)}</dd>
                </div>
              ))}
            </dl>
          </details>
        </section>
      )}
    </main>
  );
}
