import {
  projectCompletedSeasonSummary,
  selectCurrentProgramId,
  type CareerSession,
  type DepthRoleId,
  type EventChoiceId,
  type InjuryChoiceId,
  type MetaProfileV1,
  type ProgramId,
  type SeasonOutcomeId,
  type TransferOptionProjectionV1,
} from '@project-saturday/game-core';
import {
  eventContent,
  injuryContent,
  offFieldContent,
  programContent,
  seasonContent,
} from '@project-saturday/game-content/content';
import type { MessageKey, SupportedLocale } from '@project-saturday/game-content/locales';

import { useAppTranslation, type AppTranslate } from '../i18n/i18n';
import { AthletePortrait } from './AthletePortrait';

const CARD_PORTRAIT_SIZE = 'card' as const;

export interface SeasonOverviewProps {
  readonly locale: SupportedLocale;
  readonly session: CareerSession;
}

export interface SeasonDecisionPanelProps extends SeasonOverviewProps {
  readonly busy: boolean;
  readonly controlsDisabled: boolean;
  readonly meta: MetaProfileV1;
  readonly onBootstrapSeason: () => void;
  readonly onChooseEvent: (choiceId: EventChoiceId) => void;
  readonly onChooseInjury: (choiceId: InjuryChoiceId) => void;
  readonly onCompleteCareer: () => void;
  readonly onDecideOffseason: (programId: ProgramId) => void;
  readonly onEnterSeasonReview: () => void;
  readonly onInitializePostseason: () => void;
  readonly onProjectOffseason: () => void;
  readonly onBootstrapNextSeason: () => void;
  readonly onStartNextCareer: () => void;
}

const STAGE_KEYS = {
  CAMP: 'career.season.stage.camp',
  REGULAR_SEASON: 'career.season.stage.regular',
  POSTSEASON: 'career.season.stage.postseason',
} as const satisfies Record<string, MessageKey>;

const OUTCOME_NAME_KEYS = Object.fromEntries(
  seasonContent.postseason.outcomes.map(({ id, nameKey }) => [id, nameKey]),
) as Readonly<Record<SeasonOutcomeId, string>>;

const DEPTH_ROLE_LABEL_KEYS = {
  depth_role_starter: 'career.program.role.starter',
  depth_role_rotation: 'career.program.role.rotation',
  depth_role_reserve: 'career.program.role.reserve',
  depth_role_developmental: 'career.program.role.developmental',
} as const satisfies Record<DepthRoleId, MessageKey>;

function contentMessage(t: AppTranslate, key: string): string {
  return t(key as MessageKey);
}

function programName(t: AppTranslate, programId: ProgramId): string {
  const program = programContent.programs.find(({ id }) => id === programId);
  return program === undefined ? programId : contentMessage(t, program.nameKey);
}

function outcomeName(t: AppTranslate, outcomeId: SeasonOutcomeId): string {
  return contentMessage(t, OUTCOME_NAME_KEYS[outcomeId]);
}

function formatSnapRange(
  locale: SupportedLocale,
  minSnapPermille: number,
  maxSnapPermille: number,
): string {
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0, style: 'percent' });
  return `${formatter.format(minSnapPermille / 1_000)}–${formatter.format(maxSnapPermille / 1_000)}`;
}

function offseasonOptionContent(
  option: TransferOptionProjectionV1,
  session: CareerSession,
  locale: SupportedLocale,
  t: AppTranslate,
  controlsDisabled: boolean,
  onDecideOffseason: (programId: ProgramId) => void,
): React.JSX.Element {
  const offseason = session.career.offFieldCareerState.offseason;
  if (offseason.status !== 'PROJECTED') throw new Error('Expected projected offseason.');
  const worldProjection = offseason.worldProjection.programs.find(
    ({ programId }) => programId === option.programId,
  );
  const coachChange = offFieldContent.offseason.coachChanges.find(
    ({ id }) => id === worldProjection?.coachChangeId,
  );
  const confidence = offFieldContent.offseason.confidenceTiers.find(
    ({ id }) => id === option.confidenceTierId,
  );
  if (worldProjection === undefined || coachChange === undefined || confidence === undefined) {
    throw new Error(`Missing offseason presentation for ${option.programId}.`);
  }
  const scoreFormatter = new Intl.NumberFormat(locale);
  return (
    <article
      className="offseason-option"
      data-option-kind={option.kind}
      data-testid={`offseason-option-${option.programId}`}
      key={option.programId}
    >
      <div className="offseason-option__heading">
        <span className="phase-pill">
          {t(
            option.kind === 'STAY'
              ? 'career.offField.offseason.stay'
              : 'career.offField.offseason.transfer',
          )}
        </span>
        <h4>{programName(t, option.programId)}</h4>
      </div>
      <dl className="offseason-option__facts">
        <div>
          <dt>{t('career.offField.offseason.role')}</dt>
          <dd>{t(DEPTH_ROLE_LABEL_KEYS[option.projectedRoleId])}</dd>
        </div>
        <div>
          <dt>{t('career.offField.offseason.depth', { rank: option.projectedDepthRank })}</dt>
          <dd>
            {t('career.offField.offseason.snaps', {
              range: formatSnapRange(
                locale,
                option.projectedSnapMinPermille,
                option.projectedSnapMaxPermille,
              ),
            })}
          </dd>
        </div>
      </dl>
      <p className="offseason-option__score">
        {t('career.offField.offseason.score', {
          maximum: scoreFormatter.format(option.projectedScoreMaximum),
          minimum: scoreFormatter.format(option.projectedScoreMinimum),
        })}
      </p>
      <p>
        {t('career.offField.offseason.confidence', {
          confidence: contentMessage(t, confidence.nameKey),
        })}
      </p>
      <p>
        {t('career.offField.offseason.staff', { change: contentMessage(t, coachChange.nameKey) })}
      </p>
      <p>
        {t(
          worldProjection.offenseStyleIdBefore === worldProjection.offenseStyleIdAfter
            ? 'career.offField.offseason.schemeStable'
            : 'career.offField.offseason.schemeChanged',
        )}
      </p>
      <details className="offseason-factors">
        <summary>{t('career.offField.offseason.factors')}</summary>
        <ul>
          {option.factors.map((factor) => {
            const definition = offFieldContent.offseason.projectionFactors.find(
              ({ id }) => id === factor.factorId,
            );
            if (definition === undefined) throw new Error(factor.factorId);
            return (
              <li key={factor.factorId}>
                {t('career.offField.offseason.factorValue', {
                  name: contentMessage(t, definition.nameKey),
                  value: scoreFormatter.format(factor.score),
                })}
              </li>
            );
          })}
        </ul>
      </details>
      <button
        className="primary-action"
        disabled={controlsDisabled}
        type="button"
        onClick={() => onDecideOffseason(option.programId)}
      >
        {t('career.offField.offseason.choose', { program: programName(t, option.programId) })}
      </button>
    </article>
  );
}

function nextOpponentId(session: CareerSession): ProgramId | null {
  const currentProgramId = selectCurrentProgramId(session.career);
  if (session.world.calendar.type !== 'ACTIVE' || currentProgramId === null) {
    return null;
  }
  const calendar = session.world.calendar;
  if (calendar.stage === 'REGULAR_SEASON') {
    const round =
      calendar.definition.regularSeasonRounds[calendar.completedRegularSeasonRoundCount];
    const fixture = round?.fixtures.find(
      ({ awayProgramId, homeProgramId }) =>
        awayProgramId === currentProgramId || homeProgramId === currentProgramId,
    );
    if (fixture === undefined) return null;
    return fixture.homeProgramId === currentProgramId
      ? fixture.awayProgramId
      : fixture.homeProgramId;
  }
  if (calendar.stage === 'POSTSEASON' && calendar.postseason.type === 'ACTIVE') {
    const round = calendar.postseason.rounds[calendar.postseason.currentRoundIndex];
    const fixture = round.fixtures.find(
      ({ awayProgramId, homeProgramId }) =>
        awayProgramId === currentProgramId || homeProgramId === currentProgramId,
    );
    if (fixture === undefined) return null;
    return fixture.homeProgramId === currentProgramId
      ? fixture.awayProgramId
      : fixture.homeProgramId;
  }
  return null;
}

function stageProgress(session: CareerSession, t: AppTranslate): string {
  if (session.world.calendar.type !== 'ACTIVE') return t('career.season.progress.pending');
  const calendar = session.world.calendar;
  if (calendar.stage === 'CAMP') {
    return t('career.season.progress.camp', {
      current: calendar.completedCampRoundCount + 1,
      total: calendar.definition.campRoundIds.length,
    });
  }
  if (calendar.stage === 'REGULAR_SEASON') {
    return t('career.season.progress.regular', {
      current: Math.min(
        calendar.completedRegularSeasonRoundCount + 1,
        calendar.definition.regularSeasonRounds.length,
      ),
      total: calendar.definition.regularSeasonRounds.length,
    });
  }
  if (calendar.postseason.type === 'ACTIVE') {
    return t('career.season.progress.postseason', {
      current: calendar.postseason.currentRoundIndex + 1,
      total: calendar.postseason.rounds.length,
    });
  }
  return t('career.season.progress.complete');
}

function activeRecord(session: CareerSession) {
  const currentProgramId = selectCurrentProgramId(session.career);
  if (session.world.calendar.type !== 'ACTIVE' || currentProgramId === null) return null;
  return (
    session.world.calendar.programRecords.find(({ programId }) => programId === currentProgramId) ??
    null
  );
}

function activeStanding(session: CareerSession) {
  const currentProgramId = selectCurrentProgramId(session.career);
  if (session.world.calendar.type !== 'ACTIVE' || currentProgramId === null) return null;
  return (
    session.world.calendar.standings.find(({ programId }) => programId === currentProgramId) ?? null
  );
}

function riskPermille(session: CareerSession): number | null {
  if (session.career.seasonCareerState.bootstrapStatus !== 'ACTIVE') return null;
  const assessment = session.career.seasonCareerState.injuryState.lastAssessment;
  return assessment?.outcome === 'INJURY' || assessment?.outcome === 'NO_INJURY'
    ? assessment.components.totalRiskPermille
    : null;
}

function currentInjuryName(session: CareerSession, t: AppTranslate): string {
  if (session.career.seasonCareerState.bootstrapStatus !== 'ACTIVE') {
    return t('career.season.availability.full');
  }
  const injury = session.career.seasonCareerState.injuryState.currentInjury;
  if (injury === null) return t('career.season.availability.full');
  const content = injuryContent.outcomes.find(({ id }) => id === injury.outcomeId);
  return content === undefined ? injury.outcomeId : contentMessage(t, content.nameKey);
}

export function SeasonOverview({ locale, session }: SeasonOverviewProps): React.JSX.Element {
  const { t } = useAppTranslation(locale);
  const calendar = session.world.calendar;
  const record = activeRecord(session);
  const standing = activeStanding(session);
  const opponentId = nextOpponentId(session);
  const risk = riskPermille(session);
  return (
    <section className="season-overview" data-testid="season-overview">
      <div className="season-overview__heading">
        <div>
          <p className="step-mark">{t('career.season.label')}</p>
          <h3>{contentMessage(t, seasonContent.nameKey)}</h3>
        </div>
        <span className="phase-pill">
          {calendar.type === 'ACTIVE'
            ? t(STAGE_KEYS[calendar.stage])
            : t('career.season.stage.pending')}
        </span>
      </div>
      <p className="season-overview__progress">{stageProgress(session, t)}</p>
      <dl className="season-score-strip">
        <div>
          <dt>{t('career.season.record')}</dt>
          <dd>
            {record === null
              ? t('career.season.notAvailable')
              : t('career.season.recordValue', {
                  losses: record.losses,
                  ties: record.ties,
                  wins: record.wins,
                })}
          </dd>
        </div>
        <div>
          <dt>{t('career.season.rank')}</dt>
          <dd>
            {standing === null
              ? t('career.season.notAvailable')
              : t('career.season.rankValue', { rank: standing.rank })}
          </dd>
        </div>
        <div>
          <dt>{t('career.season.nextOpponent')}</dt>
          <dd>
            {opponentId === null ? t('career.season.noOpponent') : programName(t, opponentId)}
          </dd>
        </div>
        <div>
          <dt>{t('career.season.availability')}</dt>
          <dd>{currentInjuryName(session, t)}</dd>
        </div>
      </dl>
      {risk !== null && (
        <p className="season-risk" data-testid="season-risk">
          {t('career.season.risk', {
            value: new Intl.NumberFormat(locale, { style: 'percent' }).format(risk / 1000),
          })}
        </p>
      )}
      {calendar.type === 'ACTIVE' && calendar.standings.length > 0 && (
        <details className="season-standings">
          <summary>{t('career.season.standings.open')}</summary>
          <ol>
            {calendar.standings.slice(0, 4).map((entry) => (
              <li key={entry.programId}>
                <span>{programName(t, entry.programId)}</span>
                <strong>
                  {t('career.season.recordValue', {
                    losses: entry.losses,
                    ties: entry.ties,
                    wins: entry.wins,
                  })}
                </strong>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}

function eventEffectLabel(
  effect: (typeof eventContent.events)[number]['choices'][number]['effects'][number],
  locale: SupportedLocale,
  t: AppTranslate,
): string {
  const number = new Intl.NumberFormat(locale, { signDisplay: 'always' });
  if (effect.type === 'event_gpa_delta_milli') {
    return t('career.season.effect', {
      label: t('career.player.gpa'),
      value: number.format(effect.deltaMilli / 1000),
    });
  }
  if (effect.type === 'event_breakthrough_gauge_delta') {
    return t('career.season.effect', {
      label: t('career.skills.gauge.title'),
      value: number.format(effect.points),
    });
  }
  const labelKeys = {
    event_state_body: 'career.player.body',
    event_state_brand: 'career.player.brand',
    event_state_coach_trust: 'career.player.coachTrust',
    event_state_confidence: 'career.player.confidence',
    event_state_preparation: 'career.player.preparation',
  } as const satisfies Record<typeof effect.stateId, MessageKey>;
  return t('career.season.effect', {
    label: t(labelKeys[effect.stateId]),
    value: number.format(effect.delta),
  });
}

function EventChoicePanel({
  controlsDisabled,
  locale,
  onChooseEvent,
  session,
}: SeasonDecisionPanelProps): React.JSX.Element | null {
  const { t } = useAppTranslation(locale);
  if (session.career.phase.type !== 'EVENT_CHOICE') return null;
  const phase = session.career.phase;
  const event = eventContent.events.find(({ id }) => id === phase.pendingEvent.eventId);
  if (event === undefined) throw new Error('Pending event is missing shipped presentation.');
  return (
    <article className="season-decision season-decision--event" data-testid="season-event-choice">
      <p className="step-mark">{t('career.event.phase.choice')}</p>
      <h3>{contentMessage(t, event.nameKey)}</h3>
      <p>{contentMessage(t, event.descriptionKey)}</p>
      <div className="season-choice-grid">
        {event.choices.map((choice) => (
          <button
            className="season-choice"
            data-testid={`season-event-choice-${choice.id}`}
            disabled={controlsDisabled}
            key={choice.id}
            type="button"
            onClick={() => onChooseEvent(choice.id)}
          >
            <strong>{contentMessage(t, choice.nameKey)}</strong>
            <span>{contentMessage(t, choice.descriptionKey)}</span>
            <span className="season-choice__effects">
              {choice.effects
                .map((effect) => eventEffectLabel(effect, locale, t))
                .join(t('career.season.effectSeparator'))}
            </span>
          </button>
        ))}
      </div>
    </article>
  );
}

function InjuryChoicePanel({
  controlsDisabled,
  locale,
  onChooseInjury,
  session,
}: SeasonDecisionPanelProps): React.JSX.Element | null {
  const { t } = useAppTranslation(locale);
  if (session.career.phase.type !== 'INJURY_CHOICE') return null;
  const pending = session.career.phase.pendingInjury;
  const outcome = injuryContent.outcomes.find(({ id }) => id === pending.outcomeId);
  if (outcome === undefined) throw new Error('Pending injury is missing shipped presentation.');
  return (
    <article className="season-decision season-decision--injury" data-testid="season-injury-choice">
      <p className="step-mark">{t('career.injury.phase.choice')}</p>
      <h3>{contentMessage(t, outcome.nameKey)}</h3>
      <p>{contentMessage(t, outcome.descriptionKey)}</p>
      <p className="season-risk">
        {t('career.season.injuryOpportunityCap', { count: outcome.opportunityCap })}
      </p>
      <div className="season-choice-grid">
        {pending.choiceIds.map((choiceId) => {
          const choice = injuryContent.choices.find(({ id }) => id === choiceId);
          if (choice === undefined) throw new Error(choiceId);
          return (
            <button
              className="season-choice"
              data-testid={`season-injury-choice-${choice.id}`}
              disabled={controlsDisabled}
              key={choice.id}
              type="button"
              onClick={() => onChooseInjury(choice.id)}
            >
              <strong>{contentMessage(t, choice.nameKey)}</strong>
              <span>{contentMessage(t, choice.descriptionKey)}</span>
            </button>
          );
        })}
      </div>
    </article>
  );
}

function SeasonReviewPanel({
  onBootstrapNextSeason,
  controlsDisabled,
  locale,
  onCompleteCareer,
  onDecideOffseason,
  onProjectOffseason,
  session,
}: SeasonDecisionPanelProps): React.JSX.Element | null {
  const { t } = useAppTranslation(locale);
  if (session.career.phase.type !== 'SEASON_REVIEW') return null;
  const summary =
    session.career.seasonCareerState.bootstrapStatus === 'COMPLETE'
      ? session.career.seasonCareerState.lastCompletedSeason
      : projectCompletedSeasonSummary(session);
  if (summary === null) throw new Error('Season review is missing its authoritative summary.');
  const offseason = session.career.offFieldCareerState.offseason;
  const offFieldActive = session.career.offFieldCareerState.academics.bootstrapStatus === 'ACTIVE';
  return (
    <article className="season-review" data-testid="season-review">
      <div className="season-review__identity">
        <AthletePortrait
          appearance={session.career.player.appearance}
          label={t('career.player.portraitLabel', { name: session.career.player.displayName })}
          size={CARD_PORTRAIT_SIZE}
        />
        <div>
          <p className="step-mark">{t('career.season.phase.review')}</p>
          <h3>{outcomeName(t, summary.outcomeId)}</h3>
          <p>
            {t('career.season.review.record', {
              losses: summary.programLosses,
              ties: summary.programTies,
              wins: summary.programWins,
            })}
          </p>
        </div>
      </div>
      <dl className="season-review-grid">
        <div>
          <dt>{t('career.season.review.rank')}</dt>
          <dd>{t('career.season.rankValue', { rank: summary.regularSeasonRank })}</dd>
        </div>
        <div>
          <dt>{t('career.season.review.games')}</dt>
          <dd>{summary.gamesPlayed}</dd>
        </div>
        <div>
          <dt>{t('career.season.review.grade')}</dt>
          <dd>{summary.averagePerformanceGrade}</dd>
        </div>
        <div>
          <dt>{t('career.season.review.receiving')}</dt>
          <dd>
            {t('career.season.review.receivingValue', {
              catches: summary.cumulativeStats.receptions,
              touchdowns: summary.cumulativeStats.receivingTouchdowns,
              yards: summary.cumulativeStats.receivingYards,
            })}
          </dd>
        </div>
        <div>
          <dt>{t('career.season.review.role')}</dt>
          <dd>
            {t(
              `career.program.role.${summary.finalRoleId.replace('depth_role_', '')}` as MessageKey,
            )}
          </dd>
        </div>
        <div>
          <dt>{t('career.season.review.injuries')}</dt>
          <dd>
            {t('career.season.review.injuryValue', {
              count: summary.injuryCount,
              weeks: summary.injuryWeeksMissed,
            })}
          </dd>
        </div>
      </dl>
      {summary.bestGame !== null && (
        <p className="season-review__best">
          {t('career.season.review.bestGame', {
            catches: summary.bestGame.statLine.receptions,
            grade: summary.bestGame.performanceGradeScore,
            yards: summary.bestGame.statLine.receivingYards,
          })}
        </p>
      )}
      {!offFieldActive && (
        <button
          className="primary-action"
          disabled={controlsDisabled}
          type="button"
          onClick={onCompleteCareer}
        >
          {t('career.season.review.completeCareer')}
        </button>
      )}
      {offFieldActive && offseason.status === 'NOT_STARTED' && (
        <section aria-live="polite" className="offseason-entry" data-testid="offseason-entry">
          <h4>{t('career.offField.offseason.readyTitle')}</h4>
          <p>{t('career.offField.offseason.readyHelp')}</p>
          <button
            className="primary-action"
            disabled={controlsDisabled}
            type="button"
            onClick={onProjectOffseason}
          >
            {t('career.offField.offseason.project')}
          </button>
        </section>
      )}
      {offseason.status === 'PROJECTED' && (
        <section aria-live="polite" className="offseason-board" data-testid="offseason-board">
          <div>
            <h4>{t('career.offField.offseason.title')}</h4>
            <p>{t('career.offField.offseason.help')}</p>
          </div>
          <div className="offseason-option-grid">
            {[
              offseason.transferProjection.stayOption,
              ...offseason.transferProjection.transferOptions,
            ].map((option) =>
              offseasonOptionContent(
                option,
                session,
                locale,
                t,
                controlsDisabled,
                onDecideOffseason,
              ),
            )}
          </div>
        </section>
      )}
      {offseason.status === 'DECIDED' && (
        <section aria-live="polite" className="offseason-decided" data-testid="offseason-decided">
          <h4>{t('career.offField.offseason.decidedTitle')}</h4>
          <p>{t('career.offField.offseason.decidedHelp')}</p>
          <strong>
            {t('career.offField.offseason.decision', {
              kind: t(
                offseason.lastDecision.kind === 'STAY'
                  ? 'career.offField.offseason.stay'
                  : 'career.offField.offseason.transfer',
              ),
              program: programName(t, offseason.lastDecision.selectedProgramId),
            })}
          </strong>
          <dl className="season-review-grid">
            <div>
              <dt>{t('career.offField.offseason.actualRole')}</dt>
              <dd>{t(DEPTH_ROLE_LABEL_KEYS[offseason.lastDecision.actualRoleId])}</dd>
            </div>
            <div>
              <dt>
                {t('career.offField.offseason.actualDepth', {
                  rank: offseason.lastDecision.actualDepthRank,
                })}
              </dt>
              <dd>
                {t('career.offField.offseason.actualSnaps', {
                  range: formatSnapRange(
                    locale,
                    offseason.lastDecision.actualSnapMinPermille,
                    offseason.lastDecision.actualSnapMaxPermille,
                  ),
                })}
              </dd>
            </div>
            <div>
              <dt>
                {t('career.offField.offseason.actualTrust', {
                  value: offseason.lastDecision.coachTrustAfter,
                })}
              </dt>
              <dd>
                {contentMessage(
                  t,
                  offFieldContent.offseason.coachChanges.find(
                    ({ id }) => id === offseason.lastDecision.coachChangeId,
                  )!.nameKey,
                )}
              </dd>
            </div>
          </dl>
          <button
            className="primary-action"
            disabled={controlsDisabled}
            type="button"
            onClick={onBootstrapNextSeason}
          >
            {t('career.offField.offseason.startNext')}
          </button>
        </section>
      )}
    </article>
  );
}

function AlumniPanel({
  controlsDisabled,
  locale,
  meta,
  onStartNextCareer,
  session,
}: SeasonDecisionPanelProps): React.JSX.Element | null {
  const { t } = useAppTranslation(locale);
  if (session.career.phase.type !== 'CAREER_COMPLETE') return null;
  const currentAlumnus = meta.alumni.find(({ careerId }) => careerId === session.career.id);
  return (
    <article className="alumni-legacy" data-testid="career-complete">
      <p className="step-mark">{t('career.season.phase.complete')}</p>
      <h3>{t('career.season.complete.heading', { name: session.career.player.displayName })}</h3>
      <p>{t('career.season.complete.help')}</p>
      {currentAlumnus !== undefined && (
        <div className="alumni-feature">
          <AthletePortrait
            appearance={currentAlumnus.appearance}
            label={t('career.player.portraitLabel', { name: currentAlumnus.displayName })}
            size={CARD_PORTRAIT_SIZE}
          />
          <div>
            <strong>{outcomeName(t, currentAlumnus.seasonOutcomeId)}</strong>
            <span>{programName(t, currentAlumnus.programIds[0])}</span>
            <span>
              {t('career.season.complete.statLine', {
                catches: currentAlumnus.careerStats.receptions,
                touchdowns: currentAlumnus.careerStats.receivingTouchdowns,
                yards: currentAlumnus.careerStats.receivingYards,
              })}
            </span>
          </div>
        </div>
      )}
      <details className="alumni-history" open>
        <summary>{t('career.season.complete.history', { count: meta.alumni.length })}</summary>
        <ul>
          {meta.alumni.map((alumnus) => (
            <li key={alumnus.alumniId}>
              <strong>{alumnus.displayName}</strong>
              <span>{programName(t, alumnus.programIds[0])}</span>
              <span>{outcomeName(t, alumnus.seasonOutcomeId)}</span>
            </li>
          ))}
        </ul>
      </details>
      <div className="legacy-reward">
        <strong>{t('career.season.complete.legacyTitle')}</strong>
        <span>{t('career.season.complete.legacyHelp')}</span>
      </div>
      <button
        className="primary-action"
        disabled={controlsDisabled}
        type="button"
        onClick={onStartNextCareer}
      >
        {t('career.season.complete.nextCareer')}
      </button>
    </article>
  );
}

export function SeasonDecisionPanel(props: SeasonDecisionPanelProps): React.JSX.Element | null {
  const { t } = useAppTranslation(props.locale);
  const { career } = props.session;
  const pendingBootstrap =
    career.phase.type === 'PLAN_ACTIONS' &&
    career.recruitingState.type === 'COMMITTED' &&
    career.seasonCareerState.bootstrapStatus === 'PENDING';
  if (pendingBootstrap) {
    return (
      <article className="season-decision" data-testid="season-bootstrap">
        <p className="step-mark">{t('career.season.stage.pending')}</p>
        <h3>{t('career.season.bootstrap.title')}</h3>
        <p>{t('career.season.bootstrap.help')}</p>
        <button
          className="primary-action"
          disabled={props.controlsDisabled}
          type="button"
          onClick={props.onBootstrapSeason}
        >
          {t(props.busy ? 'career.game.saving' : 'career.season.bootstrap.action')}
        </button>
      </article>
    );
  }
  if (career.phase.type === 'EVENT_CHOICE') return <EventChoicePanel {...props} />;
  if (career.phase.type === 'INJURY_CHOICE') return <InjuryChoicePanel {...props} />;
  if (career.phase.type === 'SEASON_REVIEW') return <SeasonReviewPanel {...props} />;
  if (career.phase.type === 'CAREER_COMPLETE') return <AlumniPanel {...props} />;
  if (
    career.phase.type === 'PLAN_ACTIONS' &&
    props.session.world.calendar.type === 'ACTIVE' &&
    props.session.world.calendar.stage === 'POSTSEASON'
  ) {
    const postseason = props.session.world.calendar.postseason;
    if (postseason.type === 'PENDING') {
      return (
        <article className="season-decision" data-testid="postseason-initialize">
          <p className="step-mark">{t('career.season.stage.postseason')}</p>
          <h3>{t('career.season.postseason.title')}</h3>
          <p>{t('career.season.postseason.help')}</p>
          <button
            className="primary-action"
            disabled={props.controlsDisabled}
            type="button"
            onClick={props.onInitializePostseason}
          >
            {t(props.busy ? 'career.game.saving' : 'career.season.postseason.action')}
          </button>
        </article>
      );
    }
    if (postseason.type === 'COMPLETE') {
      return (
        <article className="season-decision" data-testid="season-review-entry">
          <p className="step-mark">{t('career.season.progress.complete')}</p>
          <h3>{outcomeName(t, postseason.playerOutcomeId)}</h3>
          <p>{t('career.season.review.ready')}</p>
          <button
            className="primary-action"
            disabled={props.controlsDisabled}
            type="button"
            onClick={props.onEnterSeasonReview}
          >
            {t(props.busy ? 'career.game.saving' : 'career.season.review.open')}
          </button>
        </article>
      );
    }
  }
  return null;
}
