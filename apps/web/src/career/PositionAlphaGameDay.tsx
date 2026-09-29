import { useEffect, useMemo, useRef } from 'react';
import {
  ATTRIBUTE_XP_PER_RATING,
  projectAttributeProgress,
  projectPositionAlphaGamePreviewV2,
  resolvePositionInjuryWeekChoice,
  type InjuryChoiceId,
  type PlayerState,
  type PositionAlphaSessionCommandMechanics,
  type PositionAlphaSessionV2,
} from '@project-saturday/game-core';
import {
  qbAlphaContent,
  rbAlphaContent,
  cbAlphaContent,
  injuryContent,
} from '@project-saturday/game-content';
import type { MessageKey, SupportedLocale } from '@project-saturday/game-content/locales';
import { useAppTranslation } from '../i18n/i18n';
import {
  POSITION_ATTRIBUTE_KEYS,
  POSITION_ROLE_KEYS,
  POSITION_STATE_KEYS,
  POSITION_STAT_FIELD_KEYS,
  positionProgramNameKey,
} from './position-labels';

const CATALOGS = {
  position_qb: qbAlphaContent,
  position_rb: rbAlphaContent,
  position_cb: cbAlphaContent,
};
const GROWTH_STATE_FIELDS = ['body', 'confidence', 'coachTrust'] as const;
const RESULT_KEYS = {
  COMPLETION: 'm7Direct.result.completion',
  INCOMPLETION: 'm7Direct.result.incompletion',
  INTERCEPTION: 'm7Direct.result.interception',
  SACK: 'm7Direct.result.sack',
  SCRAMBLE: 'm7Direct.result.scramble',
  THROW_AWAY: 'm7Direct.result.throwAway',
  RUSH: 'm7Direct.result.rush',
  RECEPTION: 'm7Direct.result.reception',
  PROTECTION_WIN: 'm7Direct.result.protectionWin',
  PROTECTION_MISS: 'm7Direct.result.protectionMiss',
  NO_TARGET: 'm7Direct.result.noTarget',
  COVERED: 'm7Direct.result.covered',
  COMPLETION_ALLOWED: 'm7Direct.result.completionAllowed',
  PASS_DEFENDED: 'm7Direct.result.passDefended',
  TACKLE: 'm7Direct.result.tackle',
  MISSED_TACKLE: 'm7Direct.result.missedTackle',
} as const satisfies Record<string, MessageKey>;
const PHASE_KEYS = {
  PRACTICE_REVIEW: 'm7Direct.day.practice',
  ACADEMIC_REVIEW: 'm7Direct.day.academics',
  EVENT_CHOICE: 'm7Direct.day.eventChoice',
  EVENT_RESOLVED: 'm7Direct.day.eventResolved',
  INJURY_CHOICE: 'm7Direct.day.injuryChoice',
  INJURY_RESOLVED: 'm7Direct.day.injuryResolved',
  GAME_PREVIEW: 'm7Direct.day.preview',
  ACTIVE_SNAP: 'm7Direct.day.snap',
  RESOLVED_SNAP: 'm7Direct.day.snapResult',
  POST_GAME: 'm7Direct.day.postGame',
} as const satisfies Record<Exclude<PositionAlphaSessionV2['gameDay']['type'], 'IDLE'>, MessageKey>;
const ACADEMIC_KEYS = {
  ELIGIBLE: 'offField.academics.statuses.eligible.name',
  WARNING: 'offField.academics.statuses.warning.name',
  INELIGIBLE: 'offField.academics.statuses.ineligible.name',
} as const satisfies Record<string, MessageKey>;
const FEEDBACK_KEYS: Readonly<Record<string, MessageKey>> = {
  game_participation_qb_offense: 'm7Direct.day.qbOffense',
  game_participation_qb_signal_review: 'm7Direct.day.qbReview',
  game_participation_rb_offense: 'm7Direct.day.rbOffense',
  game_participation_rb_assignment_review: 'm7Direct.day.rbReview',
  game_participation_cb_coverage: 'm7Direct.day.cbCoverage',
  game_participation_cb_scout_review: 'm7Direct.day.cbReview',
};

export interface PositionAlphaGameDayProps {
  readonly session: PositionAlphaSessionV2;
  readonly mechanics: PositionAlphaSessionCommandMechanics;
  readonly locale: SupportedLocale;
  readonly busy: boolean;
  readonly saveFailed: boolean;
  readonly onAdvance: () => void;
  readonly onEvent: (choiceId: string) => void;
  readonly onInjury: (choiceId: InjuryChoiceId) => void;
  readonly onSnap: (decisionId: string) => void;
  readonly onSettle: () => void;
}

/** One saved phase at a time; presentation never selects a strategy or rolls football. */
export function PositionAlphaGameDay(props: PositionAlphaGameDayProps): React.JSX.Element | null {
  const { session, mechanics, locale } = props;
  const { t } = useAppTranslation(locale);
  const heading = useRef<HTMLHeadingElement>(null);
  const day = session.gameDay;
  const step = day.type === 'IDLE' ? 0 : day.decisionIds.length;
  useEffect(() => {
    heading.current?.focus();
  }, [day.type, step]);
  const preview = useMemo(
    () => projectPositionAlphaGamePreviewV2(session, mechanics),
    [session, mechanics],
  );
  const injuryChoices = useMemo(
    () =>
      day.type !== 'INJURY_CHOICE' || day.injury === null
        ? []
        : injuryContent.choices.map((choice) => ({
            choice,
            evidence:
              resolvePositionInjuryWeekChoice(day.injury!, choice.id, {
                lifecycle: mechanics.lifecycle,
                ...mechanics.injuries,
              })?.availability ?? null,
          })),
    [day, mechanics],
  );
  if (day.type === 'IDLE') return null;
  const blocked = props.busy || props.saveFailed;
  const catalog = CATALOGS[session.player.positionId];
  const game = day.game?.game;
  const pending = day.type === 'ACTIVE_SNAP' && game?.type === 'ACTIVE' ? game.pendingSnap : null;
  const resolved = day.type === 'RESOLVED_SNAP' ? game?.keyPlayLog.at(-1) : undefined;
  const complete = day.type === 'POST_GAME' && game?.type === 'COMPLETE' ? game : null;
  const selectedEventId =
    day.event !== null && 'selectedEventId' in day.event.selection
      ? day.event.selection.selectedEventId
      : null;
  const selectedEvent = catalog.events.find((event) => event.id === selectedEventId);
  const number = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(value);
  const stat = (label: string, value: number) => (
    <p>{t('m7Direct.day.stat', { label, value: number(value) })}</p>
  );
  const stateChanges = (before: PlayerState, after: PlayerState) => (
    <ul>
      {(Object.keys(POSITION_STATE_KEYS) as (keyof typeof POSITION_STATE_KEYS)[]).map((key) => (
        <li key={key}>
          {t('m7Direct.plan.change', {
            label: t(POSITION_STATE_KEYS[key]),
            before: number(before[key]),
            after: number(after[key]),
          })}
        </li>
      ))}
    </ul>
  );
  return (
    <section
      className="panel"
      aria-labelledby="position-game-day-heading"
      data-testid="position-game-day"
      data-phase={day.type}
    >
      <h2 id="position-game-day-heading" ref={heading} tabIndex={-1}>
        {t(PHASE_KEYS[day.type], { count: pending === null ? step : pending.snapIndex + 1 })}
      </h2>
      {day.type === 'PRACTICE_REVIEW' && (
        <>
          <h3>{t('m7Direct.plan.practice', { score: day.preparation.practiceGrade.score })}</h3>
          <p>{t('m7Ui.help.consequences')}</p>
          {stateChanges(session.player.state, day.preparation.player.state)}
          <p>
            {t('m7Direct.plan.change', {
              label: t('m7Ui.team.depth'),
              before: session.room.projection.rank,
              after: day.preparation.room.projection.rank,
            })}
          </p>
          <p>{t(POSITION_ROLE_KEYS[day.preparation.room.projection.roleId])}</p>
          <p>
            {t('m7Direct.plan.opportunities', {
              count: day.preparation.opportunity.projectedOpportunities,
            })}
          </p>
        </>
      )}
      {day.type === 'ACADEMIC_REVIEW' && day.academics?.checkpoint && (
        <>
          <p>{t('career.offField.academics.fictional')}</p>
          <p>
            {t('career.offField.academics.gpa', {
              gpa: number(day.academics.checkpoint.gpaMilli / 1000),
            })}
          </p>
          <p>
            {t('m7Direct.day.status', {
              status: t(ACADEMIC_KEYS[day.academics.checkpoint.statusAfter]),
            })}
          </p>
          <p>
            {t('career.offField.academics.thresholds', {
              eligible: number(day.academics.checkpoint.eligibleGpaMilli / 1000),
              warning: number(day.academics.checkpoint.warningGpaMilli / 1000),
            })}
          </p>
          {day.academics.checkpoint.restrictionGamesAfter > 0 && (
            <p>
              {t('career.offField.academics.restriction', {
                count: day.academics.checkpoint.restrictionGamesAfter,
              })}
            </p>
          )}
        </>
      )}
      {(day.type === 'EVENT_CHOICE' || day.type === 'EVENT_RESOLVED') && selectedEvent && (
        <>
          <h3>{t(selectedEvent.nameKey as MessageKey)}</h3>
          <p>{t(selectedEvent.descriptionKey as MessageKey)}</p>
          {day.type === 'EVENT_CHOICE' ? (
            <div className="choice-grid">
              {selectedEvent.choices.map((choice) => (
                <button
                  className="choice-card"
                  type="button"
                  key={choice.id}
                  aria-labelledby={`${choice.id}-name`}
                  aria-describedby={`${choice.id}-description`}
                  disabled={blocked || !day.event!.choiceIds.includes(choice.id)}
                  onClick={() => props.onEvent(choice.id)}
                >
                  <span className="choice-card__copy">
                    <strong id={`${choice.id}-name`}>{t(choice.nameKey as MessageKey)}</strong>
                    <small id={`${choice.id}-description`}>
                      {t(choice.descriptionKey as MessageKey)}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            stateChanges(day.preparation.player.state, day.event!.afterState)
          )}
        </>
      )}
      {day.injury?.currentInjury && (
        <p>
          {t('m7Direct.day.injuryDuration', {
            injury: t(
              injuryContent.outcomes.find(
                (outcome) => outcome.id === day.injury!.currentInjury!.outcomeId,
              )!.nameKey as MessageKey,
            ),
            weeks: day.injury.currentInjury.remainingWeeks,
          })}
        </p>
      )}
      {day.type === 'INJURY_CHOICE' && (
        <div className="choice-grid">
          {injuryChoices.map(({ choice, evidence }) => (
            <button
              className="choice-card"
              type="button"
              key={choice.id}
              aria-labelledby={`${choice.id}-name`}
              aria-describedby={`${choice.id}-description`}
              disabled={blocked || evidence === null}
              onClick={() => props.onInjury(choice.id)}
            >
              <span className="choice-card__copy">
                <strong id={`${choice.id}-name`}>{t(choice.nameKey as MessageKey)}</strong>
                <small id={`${choice.id}-description`}>
                  {t(choice.descriptionKey as MessageKey)}
                </small>
                {evidence && (
                  <small>
                    {t('m7Direct.day.injuryPlan', {
                      count: evidence.opportunityCap,
                      weeks: evidence.recoveryCreditWeeks,
                    })}
                  </small>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
      {day.type === 'INJURY_RESOLVED' && day.injury?.availability && (
        <>
          <p>
            {t('m7Direct.day.injuryPlan', {
              count: day.injury.availability.opportunityCap,
              weeks: day.injury.availability.recoveryCreditWeeks,
            })}
          </p>
          <p>
            {t('m7Direct.plan.change', {
              label: t('career.player.body'),
              before: day.injury.availability.bodyBefore,
              after: day.injury.availability.bodyAfter,
            })}
          </p>
        </>
      )}
      {day.type === 'GAME_PREVIEW' && preview && (
        <>
          <h3>{t(positionProgramNameKey(preview.playerProgramId))}</h3>
          <p>{t(positionProgramNameKey(preview.opponentProgramId))}</p>
          <p>{t(preview.isHome ? 'career.game.venue.home' : 'career.game.venue.away')}</p>
          <p>{t(POSITION_ROLE_KEYS[preview.roleId])}</p>
          <p>{t('m7Ui.home.rank', { rank: preview.rank })}</p>
          <p>{t('m7Direct.day.participation', { count: preview.opportunityCount })}</p>
          {stat(t('career.player.body'), preview.playerState.body)}
          {stat(t('career.player.preparation'), preview.playerState.preparation)}
          {stat(t('career.player.confidence'), preview.playerState.confidence)}
          {day.nil?.selection?.selectedOfferId && <p>{t('m7Direct.day.newNil')}</p>}
        </>
      )}
      {pending && (
        <>
          <h3>
            {t(
              catalog.patterns.find((pattern) => pattern.id === pending.patternId)!
                .nameKey as MessageKey,
            )}
          </h3>
          <p>
            {t(
              catalog.patterns.find((pattern) => pattern.id === pending.patternId)!
                .descriptionKey as MessageKey,
            )}
          </p>
          <h4>{t('m7Direct.day.clues')}</h4>
          {pending.revealedClueIds.length === 0 ? (
            <p>{t('m7Direct.day.noClue')}</p>
          ) : (
            <ul>
              {pending.revealedClueIds.map((id) => (
                <li key={id}>
                  {t(catalog.clues.find((clue) => clue.id === id)!.descriptionKey as MessageKey)}
                </li>
              ))}
            </ul>
          )}
          <p>{t('m7Direct.day.choiceHelp')}</p>
          <div className="choice-grid">
            {pending.decisionIds.map((id) => {
              const decision = catalog.decisions.find((entry) => entry.id === id)!;
              return (
                <button
                  className="choice-card"
                  type="button"
                  key={id}
                  aria-labelledby={`${id}-name`}
                  aria-describedby={`${id}-description`}
                  disabled={blocked}
                  onClick={() => props.onSnap(id)}
                >
                  <span className="choice-card__copy">
                    <strong id={`${id}-name`}>{t(decision.nameKey as MessageKey)}</strong>
                    <small id={`${id}-description`}>
                      {t(decision.descriptionKey as MessageKey)}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
      {resolved && (
        <>
          <h3>{t(RESULT_KEYS[resolved.playResult])}</h3>
          <p>
            {t(
              catalog.decisions.find((decision) => decision.id === resolved.decisionId)!
                .nameKey as MessageKey,
            )}
          </p>
          <p>{t('m7Direct.day.fit', { fit: resolved.decisionFit })}</p>
          {day.game?.positionId === 'position_qb' && (
            <>
              {stat(
                t('m7Ui.stats.passingYards'),
                day.game.game.keyPlayLog.at(-1)!.passingYardsDelta,
              )}
              {stat(
                t('m7Ui.stats.rushingYards'),
                day.game.game.keyPlayLog.at(-1)!.rushingYardsDelta,
              )}
              {stat(t('m7Ui.stats.fumbles'), day.game.game.keyPlayLog.at(-1)!.fumbleDelta)}
              {stat(
                t('m7Ui.stats.passingTouchdowns'),
                day.game.game.keyPlayLog.at(-1)!.passingTouchdownDelta,
              )}
              {stat(
                t('m7Ui.stats.rushingTouchdowns'),
                day.game.game.keyPlayLog.at(-1)!.rushingTouchdownDelta,
              )}
              {stat(
                t('m7Ui.stats.interceptions'),
                day.game.game.keyPlayLog.at(-1)!.interceptionDelta,
              )}
              {stat(t('m7Ui.stats.sacksTaken'), day.game.game.keyPlayLog.at(-1)!.sackDelta)}
            </>
          )}
          {day.game?.positionId === 'position_rb' && (
            <>
              {stat(t('m7Direct.day.playYards'), day.game.game.keyPlayLog.at(-1)!.yardsDelta)}
              {stat(t('m7Direct.day.touchdowns'), day.game.game.keyPlayLog.at(-1)!.touchdownDelta)}
              {stat(t('m7Ui.stats.fumbles'), day.game.game.keyPlayLog.at(-1)!.fumbleDelta)}
            </>
          )}
          {day.game?.positionId === 'position_cb' && (
            <>
              {stat(t('m7Ui.stats.yardsAllowed'), day.game.game.keyPlayLog.at(-1)!.yardsAllowed)}
              {stat(t('m7Ui.stats.passesDefended'), day.game.game.keyPlayLog.at(-1)!.passDefended)}
              {stat(t('m7Ui.stats.interceptions'), day.game.game.keyPlayLog.at(-1)!.interception)}
              {stat(t('m7Ui.stats.tackles'), day.game.game.keyPlayLog.at(-1)!.tackle)}
              {stat(t('m7Ui.stats.missedTackles'), day.game.game.keyPlayLog.at(-1)!.missedTackle)}
              {stat(
                t('m7Ui.stats.touchdownsAllowed'),
                day.game.game.keyPlayLog.at(-1)!.touchdownAllowed,
              )}
            </>
          )}
        </>
      )}
      {complete && (
        <>
          <h3>
            {t('m7Direct.day.score', {
              program: t(positionProgramNameKey(complete.summary.playerProgramId)),
              opponent: t(positionProgramNameKey(complete.summary.opponentProgramId)),
              us: complete.summary.playerTeamScore,
              them: complete.summary.opponentScore,
            })}
          </h3>
          <p>
            {t('m7Direct.day.grade', {
              grade: complete.summary.gradeScore,
              count: complete.summary.opportunityCount,
            })}
          </p>
          <p>{t(FEEDBACK_KEYS[complete.summary.participationFeedbackId]!)}</p>
          <h4>{t('career.game.postGame.growth')}</h4>
          {GROWTH_STATE_FIELDS.map((key) => (
            <p key={key}>
              {t('m7Direct.plan.change', {
                label: t(POSITION_STATE_KEYS[key]),
                before: complete.growth[`${key}Before`],
                after: complete.growth[`${key}After`],
              })}
            </p>
          ))}
          {complete.growth.attributeXp.length === 0 && (
            <p>{t('career.game.postGame.noAttributeXp')}</p>
          )}
          {complete.growth.attributeXp.map((xp) => (
            <p key={xp.attributeId}>
              {t(
                projectAttributeProgress({ rating: xp.ratingAfter, xp: xp.xpAfter }).nextRating ===
                  null
                  ? 'm7Direct.day.xpCapped'
                  : 'm7Direct.day.xp',
                {
                  attribute: t(POSITION_ATTRIBUTE_KEYS[xp.attributeId]!),
                  xp: xp.awardedXp,
                  ratingBefore: xp.ratingBefore,
                  ratingAfter: xp.ratingAfter,
                  progress: xp.xpAfter,
                  required: ATTRIBUTE_XP_PER_RATING,
                },
              )}
            </p>
          ))}
          <details>
            <summary>{t('m7Direct.day.stats')}</summary>
            {Object.entries(complete.summary.statLine).map(([field, value]) => (
              <p key={field}>
                {t('m7Direct.day.stat', {
                  label: t(POSITION_STAT_FIELD_KEYS[field]!),
                  value: number(value),
                })}
              </p>
            ))}
          </details>
        </>
      )}
      {!['EVENT_CHOICE', 'INJURY_CHOICE', 'ACTIVE_SNAP'].includes(day.type) && (
        <button
          className="primary-action"
          type="button"
          disabled={blocked}
          onClick={() => (day.type === 'POST_GAME' ? props.onSettle() : props.onAdvance())}
        >
          {t(
            day.type === 'POST_GAME'
              ? 'career.game.postGame.continue'
              : day.type === 'GAME_PREVIEW'
                ? 'career.game.preview.start'
                : 'm7Direct.day.continue',
          )}
        </button>
      )}
    </section>
  );
}
