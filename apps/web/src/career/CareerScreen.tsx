import { useEffect, useRef, useState } from 'react';
import type {
  CareerRun,
  SkillId,
  WeeklyActionId,
  WeeklyActionResult,
} from '@project-saturday/game-core';
import { creationContent } from '@project-saturday/game-content/content';
import type { MessageKey, SupportedLocale } from '@project-saturday/game-content/locales';

import { useAppTranslation, type AppTranslate } from '../i18n/i18n';
import {
  ATTRIBUTE_LABEL_KEYS,
  addDraftAction,
  getActionPresentation,
  getAppearanceSummary,
  getAttributeSummary,
  getCareerOverall,
  getCareerWeeklyEntries,
  moveDraftAction,
  removeDraftAction,
} from './career-ui';
import { SkillBreakthroughPanel } from './SkillBreakthroughPanel';
import { SkillInventoryPanel } from './SkillInventoryPanel';
import {
  getPassiveRecoverySkillEffectPresentation,
  getPendingPassiveRecoveryPresentation,
  getWeeklySkillEffectPresentation,
  type AppliedActionSkillEffectPresentation,
  type PassiveRecoverySkillEffectPresentation,
} from './skill-ui';
import { formatHeight, formatSignedNumber, formatWeight } from './units';

export interface CareerScreenProps {
  readonly busy: boolean;
  readonly career: CareerRun;
  readonly locale: SupportedLocale;
  readonly onAdvance: () => void;
  readonly onChooseSkill: (skillId: SkillId) => void;
  readonly onCommit: (draft: readonly WeeklyActionId[]) => void;
  readonly onResolve: () => void;
  readonly onSetSkillSlot: (slotIndex: number, skillId: SkillId | null) => void;
  readonly saveBlocked: boolean;
}

interface WeeklyDraftState {
  readonly actionIds: readonly WeeklyActionId[];
  readonly weekIndex: number;
}

interface FocusSnapshot {
  readonly phase: CareerRun['phase']['type'];
  readonly resultCount: number;
}

interface PhaseCopy {
  readonly pillKey: MessageKey;
  readonly titleKey: MessageKey;
}

function assertNeverPhase(phase: never): never {
  throw new Error(`Unsupported career phase: ${JSON.stringify(phase)}`);
}

function getPhaseCopy(phase: CareerRun['phase']): PhaseCopy {
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
        {result.attributeXp.map((attribute) => (
          <div key={attribute.attributeId}>
            <dt>{t(ATTRIBUTE_LABEL_KEYS[attribute.attributeId])}</dt>
            <dd>
              {attribute.ratingBefore} → {attribute.ratingAfter}
              <span>{t('career.week.result.appliedXp', { count: attribute.appliedXp })}</span>
            </dd>
          </div>
        ))}
        {result.proficiency !== null && (
          <div>
            <dt>{t('career.week.result.proficiency')}</dt>
            <dd>
              {t('career.week.result.proficiencyLevel', {
                after: result.proficiency.levelAfter,
                before: result.proficiency.levelBefore,
              })}
              <span>
                {t('career.week.result.proficiencyUses', {
                  after: result.proficiency.usesAfter,
                  before: result.proficiency.usesBefore,
                })}
              </span>
            </dd>
          </div>
        )}
      </dl>
      {actionSkillEvidence(result, locale, t)}
    </article>
  );
}

export function CareerScreen({
  busy,
  career,
  locale,
  onAdvance,
  onChooseSkill,
  onCommit,
  onResolve,
  onSetSkillSlot,
  saveBlocked,
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
  const resolvedCount =
    career.phase.type === 'RESOLVE_ACTIONS' || career.phase.type === 'WEEK_END'
      ? career.phase.results.length
      : 0;
  const resolvePhase = career.phase.type === 'RESOLVE_ACTIONS' ? career.phase : undefined;
  const remainingCount =
    career.phase.type === 'PLAN_ACTIONS'
      ? 3 - draft.length
      : career.phase.type === 'RESOLVE_ACTIONS'
        ? Math.max(0, 3 - resolvedCount)
        : 0;
  const controlsDisabled = busy || saveBlocked;
  const phaseCopy = getPhaseCopy(career.phase);
  const lastPassiveRecovery = getPassiveRecoverySkillEffectPresentation(
    career.lastPassiveBodyRecovery,
  );
  const pendingPassiveRecovery =
    career.phase.type === 'WEEK_END' ? getPendingPassiveRecoveryPresentation(career) : null;

  function updateDraft(
    update: (current: readonly WeeklyActionId[]) => readonly WeeklyActionId[],
  ): void {
    setDraftState((current) => ({
      actionIds: update(current.weekIndex === career.weekIndex ? current.actionIds : []),
      weekIndex: career.weekIndex,
    }));
  }

  useEffect(() => {
    const previous = focusSnapshotRef.current;
    if (previous === null || previous.phase !== career.phase.type) {
      phaseHeadingRef.current?.focus();
    } else if (resolvedCount > previous.resultCount) {
      latestResultRef.current?.focus();
    }
    focusSnapshotRef.current = {
      phase: career.phase.type,
      resultCount: resolvedCount,
    };
  }, [career.phase.type, resolvedCount]);

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
    <main className="career-layout" data-testid="career-screen">
      <section className="career-hero" aria-labelledby="career-player-name">
        <div
          className="player-avatar"
          aria-hidden="true"
          data-body-type={career.player.appearance.bodyTypeId}
          data-hair-style={career.player.appearance.hairStyleId}
          data-skin-tone={career.player.appearance.skinToneId}
        >
          <span className="player-avatar__head" />
          <span className="player-avatar__body" />
        </div>
        <div className="career-hero__identity">
          <p className="eyebrow" data-testid="career-week">
            {t('career.player.week', { count: career.weekIndex + 1 })}
          </p>
          <h1 id="career-player-name">{career.player.displayName}</h1>
          <p>
            {t('career.position.wr')} · {contentMessage(t, archetype.nameKey)}
          </p>
          <p className="identity-detail">
            {contentMessage(t, background.nameKey)} · {personalityNames.join(' · ')}
          </p>
        </div>
        <div className="overall-badge">
          <span>{t('career.player.overall')}</span>
          <strong>{getCareerOverall(career)}</strong>
        </div>
      </section>

      <section className="career-vitals" aria-label={t('career.player.status')}>
        <article>
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
        <article>
          <span>{t('career.player.gpa')}</span>
          <strong>
            {new Intl.NumberFormat(locale, { minimumFractionDigits: 1 }).format(
              career.player.state.gpa,
            )}
          </strong>
        </article>
        <article>
          <span>{t('career.week.remaining')}</span>
          <strong>{remainingCount}</strong>
        </article>
      </section>

      <section
        className="weekly-flow"
        data-phase={career.phase.type}
        data-testid="weekly-phase"
        aria-labelledby="weekly-heading"
      >
        <div className="section-heading section-heading--row">
          <div>
            <p className="step-mark">{t('career.week.phaseLabel')}</p>
            <h2 id="weekly-heading" ref={phaseHeadingRef} tabIndex={-1}>
              {t(phaseCopy.titleKey)}
            </h2>
          </div>
          <span className="phase-pill">{t(phaseCopy.pillKey)}</span>
        </div>

        {(career.phase.type === 'PLAN_ACTIONS' || career.phase.type === 'SKILL_BREAKTHROUGH') &&
          lastPassiveRecovery !== null &&
          passiveRecoverySummary(lastPassiveRecovery, locale, t, false)}

        {career.phase.type === 'SKILL_BREAKTHROUGH' && (
          <SkillBreakthroughPanel
            controlsDisabled={controlsDisabled}
            locale={locale}
            offer={career.phase.offer}
            saving={busy}
            onChoose={onChooseSkill}
          />
        )}

        {career.phase.type === 'PLAN_ACTIONS' && (
          <div className="planning-flow">
            <p>{t('career.week.plan.help')}</p>
            <ol className="draft-slots" data-testid="action-draft">
              {[0, 1, 2].map((slotIndex) => {
                const actionId = draft[slotIndex];
                const action = actionId === undefined ? undefined : getActionPresentation(actionId);
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
                    {presentation.gpaDelta !== 0 && (
                      <span>
                        {t('career.player.gpa')} {formatSignedNumber(locale, presentation.gpaDelta)}
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
            <div className="week-results">
              {career.phase.results.map((result) => resultCard(result, locale, t))}
            </div>
            {pendingPassiveRecovery !== null &&
              passiveRecoverySummary(pendingPassiveRecovery, locale, t, true)}
            <button
              className="primary-action"
              data-testid="advance-week"
              disabled={controlsDisabled}
              type="button"
              onClick={onAdvance}
            >
              {busy ? t('career.week.saving') : t('career.week.end.advance')}
            </button>
          </div>
        )}
      </section>

      <SkillInventoryPanel
        career={career}
        controlsDisabled={controlsDisabled}
        locale={locale}
        onSetSlot={onSetSkillSlot}
      />

      <section className="player-details" aria-labelledby="player-details-heading">
        <div className="section-heading">
          <p className="step-mark">{t('career.player.profileLabel')}</p>
          <h2 id="player-details-heading">{t('career.player.profile')}</h2>
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
            <dt>{t('career.player.coachTrust')}</dt>
            <dd>{career.player.state.coachTrust}</dd>
          </div>
          <div>
            <dt>{t('career.player.brand')}</dt>
            <dd>{career.player.state.brand}</dd>
          </div>
        </dl>

        <details>
          <summary>{t('career.player.attributes')}</summary>
          <dl className="ratings-grid">
            {attributes.map(({ attributeId, progress }) => (
              <div key={attributeId}>
                <dt>{t(ATTRIBUTE_LABEL_KEYS[attributeId])}</dt>
                <dd>
                  <strong>{progress.rating}</strong>
                  <span>{t('career.player.attributeXp', { count: progress.xp })}</span>
                </dd>
              </div>
            ))}
          </dl>
        </details>

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
    </main>
  );
}
