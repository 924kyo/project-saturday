import { useState } from 'react';
import type {
  DepthMovement,
  DepthRoleId,
  DepthUpdateEvidence,
  ProgramId,
  ProgramStrengthBandId,
  ProjectedDepthBandId,
  RecruitTierId,
} from '@project-saturday/game-core';
import type { MessageKey, SupportedLocale } from '@project-saturday/game-content/locales';

import { useAppTranslation, type AppTranslate } from '../i18n/i18n';
import { formatSignedNumber } from './units';
import {
  getProgramDepthPresentation,
  getProgramOfferPresentations,
  type DepthFactorId,
  type DepthFactorRelation,
  type DepthOpportunitySuggestionId,
  type ProgramDepthParticipantPresentation,
} from './program-ui';
import type { WrCareerSurface } from './wr-view';

const RECRUIT_TIER_KEYS = {
  recruit_tier_national: 'career.program.recruiting.tier.national',
  recruit_tier_priority: 'career.program.recruiting.tier.priority',
  recruit_tier_developmental: 'career.program.recruiting.tier.developmental',
} as const satisfies Record<RecruitTierId, MessageKey>;

const STRENGTH_BAND_KEYS = {
  program_strength_national: 'career.program.strength.national',
  program_strength_contender: 'career.program.strength.contender',
  program_strength_builder: 'career.program.strength.builder',
} as const satisfies Record<ProgramStrengthBandId, MessageKey>;

const PROJECTED_DEPTH_BAND_KEYS = {
  projected_depth_band_starter_competition: 'career.program.projectedDepth.starter',
  projected_depth_band_rotation_path: 'career.program.projectedDepth.rotation',
  projected_depth_band_reserve_path: 'career.program.projectedDepth.reserve',
  projected_depth_band_developmental: 'career.program.projectedDepth.developmental',
} as const satisfies Record<ProjectedDepthBandId, MessageKey>;

const DEPTH_ROLE_KEYS = {
  depth_role_starter: 'career.program.role.starter',
  depth_role_rotation: 'career.program.role.rotation',
  depth_role_reserve: 'career.program.role.reserve',
  depth_role_developmental: 'career.program.role.developmental',
} as const satisfies Record<DepthRoleId, MessageKey>;

const MOVEMENT_TITLE_KEYS = {
  PROMOTED: 'career.program.movement.promoted',
  DEMOTED: 'career.program.movement.demoted',
  HELD: 'career.program.movement.held',
} as const satisfies Record<DepthMovement, MessageKey>;

const DEPTH_FACTOR_KEYS = {
  talentFit: 'career.program.opportunity.factor.talentFit',
  coachTrust: 'career.program.opportunity.factor.coachTrust',
  practiceForm: 'career.program.opportunity.factor.practiceForm',
  schemeFit: 'career.program.opportunity.factor.schemeFit',
  experienceReadiness: 'career.program.opportunity.factor.experienceReadiness',
} as const satisfies Readonly<Record<DepthFactorId, MessageKey>>;

const DEPTH_FACTOR_RELATION_KEYS = {
  PLAYER_EDGE: 'career.program.opportunity.relation.playerEdge',
  EVEN: 'career.program.opportunity.relation.even',
  COMPETITOR_EDGE: 'career.program.opportunity.relation.competitorEdge',
} as const satisfies Readonly<Record<DepthFactorRelation, MessageKey>>;

const DEPTH_SUGGESTION_KEYS = {
  talentFit: 'career.program.opportunity.suggestion.talentFit',
  coachTrust: 'career.program.opportunity.suggestion.coachTrust',
  practiceForm: 'career.program.opportunity.suggestion.practiceForm',
  schemeFit: 'career.program.opportunity.suggestion.schemeFit',
  experienceReadiness: 'career.program.opportunity.suggestion.experienceReadiness',
  sustainEdge: 'career.program.opportunity.suggestion.sustainEdge',
} as const satisfies Readonly<Record<DepthOpportunitySuggestionId, MessageKey>>;

function contentMessage(t: AppTranslate, key: string): string {
  return t(key as MessageKey);
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

function formatParticipantName(
  career: WrCareerSurface,
  participant: ProgramDepthParticipantPresentation,
  t: AppTranslate,
): string {
  return participant.isPlayer
    ? career.player.displayName
    : t('career.program.room.competitorName', {
        family: contentMessage(t, participant.familyNameKey ?? ''),
        given: contentMessage(t, participant.givenNameKey ?? ''),
      });
}

interface RecruitingStartPanelProps {
  readonly busy: boolean;
  readonly controlsDisabled: boolean;
  readonly headingRef: React.RefObject<HTMLHeadingElement | null>;
  readonly locale: SupportedLocale;
  readonly onBegin: () => void;
}

export function RecruitingStartPanel({
  busy,
  controlsDisabled,
  headingRef,
  locale,
  onBegin,
}: RecruitingStartPanelProps): React.JSX.Element {
  const { t } = useAppTranslation(locale);
  return (
    <section
      className="recruiting-flow"
      data-testid="recruiting-start"
      aria-labelledby="recruiting-heading"
    >
      <div className="section-heading">
        <p className="step-mark">{t('career.program.recruiting.eyebrow')}</p>
        <h2 id="recruiting-heading" ref={headingRef} tabIndex={-1}>
          {t('career.program.recruiting.startTitle')}
        </h2>
        <p>{t('career.program.recruiting.startHelp')}</p>
      </div>
      <button
        className="primary-action"
        data-testid="begin-recruiting"
        disabled={controlsDisabled}
        type="button"
        onClick={onBegin}
      >
        {busy ? t('career.program.recruiting.saving') : t('career.program.recruiting.startAction')}
      </button>
    </section>
  );
}

interface ProgramRecruitingPanelProps {
  readonly busy: boolean;
  readonly career: WrCareerSurface;
  readonly controlsDisabled: boolean;
  readonly headingRef: React.RefObject<HTMLHeadingElement | null>;
  readonly locale: SupportedLocale;
  readonly onChoose: (programId: ProgramId) => void;
}

export function ProgramRecruitingPanel({
  busy,
  career,
  controlsDisabled,
  headingRef,
  locale,
  onChoose,
}: ProgramRecruitingPanelProps): React.JSX.Element {
  const { t } = useAppTranslation(locale);
  const [selectedProgramId, setSelectedProgramId] = useState<ProgramId | null>(null);
  if (career.recruitingState.type !== 'CHOOSING') {
    throw new Error('Program recruiting panel requires a choosing career.');
  }
  const offers = getProgramOfferPresentations(career);
  return (
    <section
      className="recruiting-flow"
      data-testid="program-recruiting"
      aria-labelledby="recruiting-heading"
    >
      <div className="section-heading">
        <p className="step-mark">{t('career.program.recruiting.eyebrow')}</p>
        <h2 id="recruiting-heading" ref={headingRef} tabIndex={-1}>
          {t('career.program.recruiting.title')}
        </h2>
        <p>{t('career.program.recruiting.help')}</p>
      </div>
      <div className="recruit-profile" data-testid="recruit-profile">
        <span>{t('career.program.recruiting.profile')}</span>
        <strong>{t(RECRUIT_TIER_KEYS[career.recruitingState.recruitTierId])}</strong>
        <small>
          {t('career.program.recruiting.score', {
            count: career.recruitingState.recruitScore,
          })}
        </small>
      </div>
      <fieldset className="program-offers">
        <legend>{t('career.program.recruiting.legend')}</legend>
        <div className="program-offers__grid">
          {offers.map((offer) => (
            <label
              className="program-offer"
              data-selected={selectedProgramId === offer.id}
              data-program-id={offer.id}
              key={offer.id}
            >
              <input
                checked={selectedProgramId === offer.id}
                disabled={controlsDisabled}
                name="program-offer"
                type="radio"
                value={offer.id}
                onChange={() => setSelectedProgramId(offer.id)}
              />
              <span className="program-offer__content">
                <span className="program-offer__heading">
                  <strong>{contentMessage(t, offer.nameKey)}</strong>
                  <em>{t(STRENGTH_BAND_KEYS[offer.strengthBandId])}</em>
                </span>
                <small>{contentMessage(t, offer.descriptionKey)}</small>
                <dl className="program-offer__facts">
                  <div>
                    <dt>{t('career.program.rating.prestige')}</dt>
                    <dd>{offer.ratings.prestige}</dd>
                  </div>
                  <div>
                    <dt>{t('career.program.rating.development')}</dt>
                    <dd>{offer.ratings.playerDevelopment}</dd>
                  </div>
                  <div>
                    <dt>{t('career.program.rating.academics')}</dt>
                    <dd>{offer.ratings.academics}</dd>
                  </div>
                  <div>
                    <dt>{t('career.program.rating.nil')}</dt>
                    <dd>{offer.ratings.nilPower}</dd>
                  </div>
                  <div>
                    <dt>{t('career.program.recruiting.schemeFit')}</dt>
                    <dd>{offer.schemeFit}</dd>
                  </div>
                  <div>
                    <dt>{t('career.program.recruiting.projectedDepth')}</dt>
                    <dd>{t(PROJECTED_DEPTH_BAND_KEYS[offer.projectedDepthBandId])}</dd>
                  </div>
                </dl>
                <span className="program-offer__traits" aria-label={t('career.program.traits')}>
                  {offer.traits.map((trait) => (
                    <span key={trait.id}>{contentMessage(t, trait.nameKey)}</span>
                  ))}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <button
        className="primary-action"
        data-testid="commit-program"
        disabled={controlsDisabled || selectedProgramId === null}
        type="button"
        onClick={() => selectedProgramId !== null && onChoose(selectedProgramId)}
      >
        {busy ? t('career.program.recruiting.saving') : t('career.program.recruiting.commit')}
      </button>
    </section>
  );
}

interface ProgramDepthPanelProps {
  readonly career: WrCareerSurface;
  readonly locale: SupportedLocale;
}

export function ProgramDepthPanel({ career, locale }: ProgramDepthPanelProps): React.JSX.Element {
  const { t } = useAppTranslation(locale);
  const presentation = getProgramDepthPresentation(career);
  const competitorName = formatParticipantName(career, presentation.opportunity.competitor, t);
  return (
    <section className="program-depth" data-testid="program-depth" aria-labelledby="depth-heading">
      <div className="section-heading section-heading--row">
        <div>
          <p className="step-mark">{contentMessage(t, presentation.program.shortNameKey)}</p>
          <h2 id="depth-heading">{t('career.program.depth.title')}</h2>
        </div>
        <span className="phase-pill">
          {t('career.program.depth.rank', { count: presentation.projection.rank })}
        </span>
      </div>
      <article className="depth-outlook" data-testid="depth-snap-outlook">
        <span>{t('career.program.depth.outlookTitle')}</span>
        <strong>
          {formatSnapRange(
            locale,
            presentation.projection.minSnapPermille,
            presentation.projection.maxSnapPermille,
          )}
        </strong>
        <p>
          {t('career.program.depth.outlookRole', {
            rank: presentation.projection.rank,
            role: t(DEPTH_ROLE_KEYS[presentation.projection.roleId]),
          })}
        </p>
        <small>{t('career.program.depth.outlookHelp')}</small>
      </article>
      <div className="depth-summary depth-summary--signals">
        <article>
          <span>{t('career.player.coachTrust')}</span>
          <strong>{presentation.playerCoachTrust}</strong>
        </article>
        <article>
          <span>{t('career.program.depth.practiceForm')}</span>
          <strong>{presentation.playerPracticeForm}</strong>
        </article>
      </div>
      <section className="depth-explanation" aria-labelledby="depth-explanation-title">
        <h3 id="depth-explanation-title">
          {t('career.program.opportunity.whyTitle', { rank: presentation.projection.rank })}
        </h3>
        <ol className="depth-causal-chain">
          <li>{t('career.program.opportunity.cause.practiceGrade')}</li>
          <li>{t('career.program.opportunity.cause.formTrust')}</li>
          <li>{t('career.program.opportunity.cause.depth')}</li>
          <li>{t('career.program.opportunity.cause.snaps')}</li>
        </ol>
        {presentation.latestPracticeReview !== null && (
          <dl className="depth-latest-review" data-testid="depth-latest-review">
            <div>
              <dt>{t('career.program.movement.weeklyPractice')}</dt>
              <dd>{presentation.latestPracticeReview.practiceGrade}</dd>
            </div>
            <div>
              <dt>{t('career.program.depth.practiceForm')}</dt>
              <dd>
                {presentation.latestPracticeReview.practiceFormBefore} →{' '}
                {presentation.latestPracticeReview.practiceFormAfter}
              </dd>
            </div>
            <div>
              <dt>{t('career.player.coachTrust')}</dt>
              <dd>
                {presentation.latestPracticeReview.coachTrustBefore} →{' '}
                {presentation.latestPracticeReview.coachTrustAfter}
              </dd>
            </div>
          </dl>
        )}
      </section>
      <section
        className="depth-opportunity"
        data-context={presentation.opportunity.competitorContext}
        data-testid="depth-opportunity"
        aria-labelledby="depth-opportunity-title"
      >
        <h3 id="depth-opportunity-title">{t('career.program.opportunity.title')}</h3>
        <p>
          {t(
            presentation.opportunity.competitorContext === 'ADVANCEMENT'
              ? 'career.program.opportunity.advancement'
              : 'career.program.opportunity.roleSecurity',
            {
              name: competitorName,
              rank: presentation.opportunity.competitor.rank,
            },
          )}
        </p>
        <ul className="depth-factor-list">
          {presentation.opportunity.factors.map((factor) => (
            <li key={factor.factorId}>
              <span>{t(DEPTH_FACTOR_KEYS[factor.factorId])}</span>
              <strong data-relation={factor.relation}>
                {t(DEPTH_FACTOR_RELATION_KEYS[factor.relation])}
              </strong>
            </li>
          ))}
        </ul>
        <small>{t('career.program.opportunity.factorHelp')}</small>
      </section>
      <section
        className="depth-suggestions"
        data-testid="depth-suggestions"
        aria-labelledby="depth-suggestions-title"
      >
        <h3 id="depth-suggestions-title">{t('career.program.opportunity.suggestionsTitle')}</h3>
        <ul>
          {presentation.opportunity.suggestionIds.map((suggestionId) => (
            <li key={suggestionId}>{t(DEPTH_SUGGESTION_KEYS[suggestionId])}</li>
          ))}
        </ul>
      </section>
      <details className="receiver-room">
        <summary>
          <span>{t('career.program.room.title')}</span>
          <small>
            {t('career.program.room.count', { count: presentation.participants.length })}
          </small>
        </summary>
        <ol>
          {presentation.participants.map((participant) => {
            const name = formatParticipantName(career, participant, t);
            return (
              <li
                data-player={participant.isPlayer}
                data-testid={`depth-row-${participant.rank}`}
                key={participant.participantId}
              >
                <span className="receiver-room__rank">{participant.rank}</span>
                <span>
                  <strong>
                    {name}
                    {participant.isPlayer && (
                      <span className="receiver-room__you">{t('career.program.room.you')}</span>
                    )}
                  </strong>
                  <small>
                    {participant.classYear === null
                      ? t(DEPTH_ROLE_KEYS[participant.roleId])
                      : t('career.program.room.meta', {
                          classYear: participant.classYear,
                          role: t(DEPTH_ROLE_KEYS[participant.roleId]),
                        })}
                  </small>
                </span>
              </li>
            );
          })}
        </ol>
      </details>
    </section>
  );
}

interface DepthMovementNoticeProps {
  readonly evidence: DepthUpdateEvidence;
  readonly locale: SupportedLocale;
}

export function DepthMovementNotice({
  evidence,
  locale,
}: DepthMovementNoticeProps): React.JSX.Element {
  const { t } = useAppTranslation(locale);
  return (
    <aside
      className="depth-movement"
      data-movement={evidence.movement}
      data-testid="depth-movement"
      role="status"
    >
      <strong>{t(MOVEMENT_TITLE_KEYS[evidence.movement])}</strong>
      <p>
        {t('career.program.movement.rank', {
          after: evidence.rankAfter,
          before: evidence.rankBefore,
        })}
      </p>
      <dl>
        <div>
          <dt>{t('career.program.movement.weeklyPractice')}</dt>
          <dd>{evidence.weeklyPracticeScore}</dd>
        </div>
        <div>
          <dt>{t('career.program.depth.practiceForm')}</dt>
          <dd>
            {evidence.practiceFormBefore} → {evidence.practiceFormAfter}
          </dd>
        </div>
        <div>
          <dt>{t('career.player.coachTrust')}</dt>
          <dd>
            {evidence.coachTrustBefore} → {evidence.coachTrustAfter}{' '}
            <span>({formatSignedNumber(locale, evidence.actualCoachTrustDelta, 0)})</span>
          </dd>
        </div>
        <div>
          <dt>{t('career.program.depth.snaps')}</dt>
          <dd>
            {formatSnapRange(
              locale,
              evidence.snapProjectionAfter.minSnapPermille,
              evidence.snapProjectionAfter.maxSnapPermille,
            )}
          </dd>
        </div>
      </dl>
      {'practiceGrade' in evidence && (
        <details className="practice-grade-breakdown" data-testid="practice-grade-breakdown">
          <summary>{t('career.program.movement.gradeBreakdown')}</summary>
          <p>{t('career.program.movement.gradeFormula')}</p>
          <dl>
            <div>
              <dt>{t('career.program.movement.gradeBase')}</dt>
              <dd>{evidence.practiceGrade.baseScore}</dd>
            </div>
            <div>
              <dt>{t('career.program.movement.gradeFocus')}</dt>
              <dd>{formatSignedNumber(locale, evidence.practiceGrade.focusImpact, 0)}</dd>
            </div>
            <div>
              <dt>{t('career.player.body')}</dt>
              <dd>
                {evidence.practiceGrade.bodyAfterFocus}{' '}
                <span>
                  ({formatSignedNumber(locale, evidence.practiceGrade.bodyContribution, 0)})
                </span>
              </dd>
            </div>
            <div>
              <dt>{t('career.player.preparation')}</dt>
              <dd>
                {evidence.practiceGrade.preparationAfterFocus} /{' '}
                {evidence.practiceGrade.preparationTarget}{' '}
                <span>
                  ({formatSignedNumber(locale, evidence.practiceGrade.preparationContribution, 0)})
                </span>
              </dd>
            </div>
            <div>
              <dt>{t('career.player.confidence')}</dt>
              <dd>
                {evidence.practiceGrade.confidenceAfterFocus}{' '}
                <span>
                  ({formatSignedNumber(locale, evidence.practiceGrade.confidenceContribution, 0)})
                </span>
              </dd>
            </div>
          </dl>
        </details>
      )}
      {evidence.movement === 'HELD' && evidence.neighborParticipantId !== null && (
        <small>{t('career.program.movement.heldReason')}</small>
      )}
    </aside>
  );
}
