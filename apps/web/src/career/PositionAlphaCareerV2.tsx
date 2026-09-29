import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ATTRIBUTE_XP_PER_RATING,
  projectAttributeProgress,
  projectPositionAlphaNilChoicesV2,
  projectPositionAlphaPlanningV2,
  selectCurrentProgramId,
  selectPositionAlphaWeekContextV2,
  type PositionAlphaNilActionV2,
  type SkillId,
} from '@project-saturday/game-core';
import { creationContent, programContent } from '@project-saturday/game-content';
import type { MessageKey } from '@project-saturday/game-content/locales';
import { useAppTranslation } from '../i18n/i18n';
import { AthletePortrait } from './AthletePortrait';
import { ProgressMeter } from './ProgressMeter';
import { PositionAlphaFocusPlanner } from './PositionAlphaFocusPlanner';
import { PositionAlphaSkills } from './PositionAlphaSkills';
import { PositionAlphaOffField } from './PositionAlphaOffField';
import { PositionAlphaPendingEvent } from './PositionAlphaPendingEvent';
import { PositionAlphaGameDay, type PositionAlphaGameDayProps } from './PositionAlphaGameDay';
import {
  PositionAlphaSeasonFlow,
  type PositionAlphaSeasonFlowProps,
} from './PositionAlphaSeasonFlow';
import {
  POSITION_ATTRIBUTE_KEYS,
  POSITION_CAREER_STAT_KEYS,
  POSITION_ROLE_KEYS,
  POSITION_STATE_KEYS,
  positionProgramNameKey,
} from './position-labels';

const PURPOSE_KEYS = {
  HOME: 'm7Ui.nav.home',
  WEEK: 'm7Ui.nav.week',
  TEAM: 'm7Ui.nav.team',
  SKILLS: 'm7Ui.nav.skills',
  PLAYER: 'm7Ui.nav.player',
} as const satisfies Record<string, MessageKey>;
type Purpose = keyof typeof PURPOSE_KEYS;
const PURPOSES = Object.keys(PURPOSE_KEYS) as Purpose[];
const STATE_IDS = ['body', 'preparation', 'confidence'] as const;
const PORTRAIT_SIZE = 'profile' as const;
const POSITION_KEYS = {
  position_qb: 'm7Alpha.positions.qb.name',
  position_rb: 'm7Alpha.positions.rb.name',
  position_cb: 'm7Alpha.positions.cb.name',
} as const;
const FACTOR_KEYS = {
  talentFit: 'career.program.opportunity.factor.talentFit',
  coachTrust: 'career.program.opportunity.factor.coachTrust',
  practiceForm: 'career.program.opportunity.factor.practiceForm',
  schemeFit: 'career.program.opportunity.factor.schemeFit',
  experienceReadiness: 'career.program.opportunity.factor.experienceReadiness',
} as const;

export interface PositionAlphaCareerV2Props
  extends PositionAlphaGameDayProps, PositionAlphaSeasonFlowProps {
  readonly onFocusPlan: (actionIds: readonly string[]) => void;
  readonly onChooseSkill: (skillId: SkillId) => void;
  readonly onEquipSkill: (skillId: SkillId | null, slotIndex: number) => void;
  readonly onNil: (action: PositionAlphaNilActionV2) => void;
  readonly onRetrySave: () => void;
}

/** Purpose navigation composes the one authoritative current session; it never advances it. */
export function PositionAlphaCareerV2(props: PositionAlphaCareerV2Props): React.JSX.Element {
  const { session, mechanics, locale, busy, saveFailed } = props;
  const { t } = useAppTranslation(locale);
  const [purpose, setPurpose] = useState<Purpose>('HOME');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [purpose]);
  const planning = useMemo(
    () => projectPositionAlphaPlanningV2(session, [], mechanics),
    [session, mechanics],
  );
  const nil = useMemo(
    () => projectPositionAlphaNilChoicesV2(session, mechanics),
    [session, mechanics],
  );
  const state = nil?.current.playerState ?? session.player.state;
  const currentProgramId = selectCurrentProgramId(session);
  if (currentProgramId === null) throw new Error('Current position career requires a program.');
  const calendar = selectPositionAlphaWeekContextV2(session, mechanics);
  const opponentId =
    calendar?.fixture == null
      ? null
      : calendar.fixture.homeProgramId === currentProgramId
        ? calendar.fixture.awayProgramId
        : calendar.fixture.homeProgramId;
  const latest = session.postseasonHistory.at(-1) ?? session.weekHistory.at(-1);
  const offered = session.skills.offeredSkillIds !== null;
  const pendingEvent = session.events.pending !== null;
  const idle = session.gameDay.type === 'IDLE';
  const adjacent = session.room.adjacentExplanation;
  const history = [...session.weekHistory, ...session.postseasonHistory];
  const background = creationContent.recruitingBackgrounds.find(
    ({ id }) => id === session.player.recruitingBackgroundId,
  )!;
  const skillPanel = (
    <PositionAlphaSkills {...props} onChoose={props.onChooseSkill} onEquip={props.onEquipSkill} />
  );
  const number = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(value);
  const height = new Intl.NumberFormat(locale, { style: 'unit', unit: 'centimeter' }).format(
    session.player.heightCm,
  );
  const weight = new Intl.NumberFormat(locale, { style: 'unit', unit: 'kilogram' }).format(
    session.player.weightKg,
  );
  const competitorName = (participantId: string) => {
    if (participantId === session.player.id) return session.player.displayName;
    const athlete = session.room.competitors.find(({ id }) => id === participantId)!;
    const given = programContent.rosterGivenNames.find(({ id }) => id === athlete.givenNameId)!;
    const family = programContent.rosterFamilyNames.find(({ id }) => id === athlete.familyNameId)!;
    return t('career.program.room.competitorName', {
      given: t(given.nameKey as MessageKey),
      family: t(family.nameKey as MessageKey),
    });
  };
  return (
    <main className="career-layout position-alpha-shell" data-testid="position-alpha-career">
      <header className="career-hero">
        <div className="athlete-portrait-host">
          <AthletePortrait
            appearance={session.player.appearance}
            label={t('career.player.portraitLabel', { name: session.player.displayName })}
            size={PORTRAIT_SIZE}
          />
        </div>
        <div>
          <p className="eyebrow">{t(POSITION_KEYS[session.player.positionId])}</p>
          <h1>{session.player.displayName}</h1>
          <p>{t(positionProgramNameKey(currentProgramId))}</p>
        </div>
      </header>
      {saveFailed && (
        <aside className="save-warning" role="alert" data-testid="position-alpha-save-failure">
          <p>{t('m7Ui.save.failed')}</p>
          <button
            className="button button--primary"
            type="button"
            disabled={busy}
            onClick={() => props.onRetrySave()}
          >
            {t('career.save.retry')}
          </button>
        </aside>
      )}
      <nav className="career-navigation" aria-label={t('m7Ui.nav.label')}>
        {PURPOSES.map((item) => (
          <button
            aria-current={purpose === item ? 'page' : undefined}
            className="career-navigation__item"
            key={item}
            type="button"
            onClick={() => setPurpose(item)}
          >
            {t(PURPOSE_KEYS[item])}
          </button>
        ))}
      </nav>
      <section className="purpose-panel" aria-labelledby="position-current-purpose">
        <h2 id="position-current-purpose" ref={heading} tabIndex={-1}>
          {t(PURPOSE_KEYS[purpose])}
        </h2>
        {(purpose === 'HOME' || purpose === 'WEEK') && calendar !== null && (
          <aside className="career-card" data-testid="position-week-context">
            <p>
              {t('m7Direct.shell.calendar', {
                season: calendar.seasonIndex + 1,
                week: calendar.weekIndex + 1,
              })}
            </p>
            {opponentId !== null ? (
              <>
                <p>
                  {t('m7Direct.shell.opponent', {
                    opponent: t(positionProgramNameKey(opponentId)),
                  })}
                </p>
                <p>
                  {t(
                    calendar.fixture!.homeProgramId === currentProgramId
                      ? 'career.game.venue.home'
                      : 'career.game.venue.away',
                  )}
                </p>
              </>
            ) : (
              <p>{t('m7Direct.shell.worldRound')}</p>
            )}
          </aside>
        )}
        {purpose === 'HOME' && (
          <>
            {!idle && <p>{t('m7Direct.shell.settledState')}</p>}
            <div className="gauge-grid">
              {STATE_IDS.map((field) => (
                <ProgressMeter
                  key={field}
                  label={t(POSITION_STATE_KEYS[field])}
                  value={state[field]}
                  maximum={100}
                  valueText={number(state[field])}
                />
              ))}
            </div>
            <article className="career-card">
              <h3>{t('m7Ui.home.role')}</h3>
              <p>{t(POSITION_ROLE_KEYS[session.room.projection.roleId])}</p>
              <p>{t('m7Ui.home.rank', { rank: session.room.projection.rank })}</p>
              <p>
                {t('m7Ui.home.opportunities', {
                  minimum: session.room.projection.interactiveSnapMinimum,
                  maximum: session.room.projection.interactiveSnapMaximum,
                })}
              </p>
              <p>{t('m7Ui.help.consequences')}</p>
            </article>
            <button className="primary-action" type="button" onClick={() => setPurpose('WEEK')}>
              {t('m7Direct.shell.openWeek')}
            </button>
            {latest && (
              <article className="latest-result">
                <h3>{t('m7Ui.home.lastWeek')}</h3>
                <p>
                  {t('m7Ui.home.score', {
                    opponent: t(positionProgramNameKey(latest.opponentProgramId)),
                    us: latest.playerTeamScore,
                    them: latest.opponentScore,
                  })}
                </p>
                {'practiceGrade' in latest && (
                  <p>
                    {t('m7Ui.home.grades', {
                      practice: latest.practiceGrade.score,
                      game: latest.gameGrade,
                    })}
                  </p>
                )}
              </article>
            )}
          </>
        )}
        {purpose === 'WEEK' && (
          <>
            {!idle ? (
              <PositionAlphaGameDay {...props} />
            ) : offered ? (
              skillPanel
            ) : pendingEvent ? (
              <PositionAlphaPendingEvent {...props} onChoose={props.onEvent} />
            ) : (
              <>
                {nil !== null && <PositionAlphaOffField {...props} onChoose={props.onNil} />}
                {planning !== null && (
                  <PositionAlphaFocusPlanner
                    {...props}
                    key={`${session.lifecycle.careerId}/${session.lifecycle.activeSeasonIndex}/${session.phase.type}/${'weekIndex' in session.phase ? session.phase.weekIndex : ''}`}
                    onCommit={props.onFocusPlan}
                  />
                )}
                <PositionAlphaSeasonFlow {...props} />
              </>
            )}
          </>
        )}
        {purpose === 'SKILLS' && skillPanel}
        {purpose === 'TEAM' && (
          <>
            <h3>{t(positionProgramNameKey(currentProgramId))}</h3>
            <p>{t('m7Direct.shell.roomHelp')}</p>
            <div className="career-card-grid">
              <article className="career-card">
                <h3>{t('m7Ui.team.trust')}</h3>
                <p>{number(state.coachTrust)}</p>
                <p>{t('m7Ui.team.trustHelp')}</p>
              </article>
              <article className="career-card">
                <h3>{t('m7Ui.team.depth')}</h3>
                <p>{t('m7Ui.home.rank', { rank: session.room.projection.rank })}</p>
                <p>{t('m7Ui.team.depthHelp')}</p>
              </article>
            </div>
            {adjacent !== null && (
              <article className="career-card">
                <h3>
                  {t('m7Direct.shell.competition', {
                    name: competitorName(adjacent.neighborParticipantId),
                  })}
                </h3>
                {adjacent.leadingPlayerDeficit !== null && (
                  <p>
                    {t('m7Direct.shell.deficit', {
                      factor: t(FACTOR_KEYS[adjacent.leadingPlayerDeficit.componentId]),
                    })}
                  </p>
                )}
                {adjacent.components.map((factor) => (
                  <p key={factor.componentId}>
                    {t('m7Direct.shell.comparison', {
                      factor: t(FACTOR_KEYS[factor.componentId]),
                      player: number(factor.playerValue),
                      neighbor: number(factor.neighborValue),
                    })}
                  </p>
                ))}
              </article>
            )}
            <ol className="receiver-room">
              {session.room.evaluations.map((evaluation) => (
                <li
                  key={evaluation.participantId}
                  data-player={evaluation.participantId === session.player.id}
                >
                  <strong>{competitorName(evaluation.participantId)}</strong>
                  <span>{t(POSITION_ROLE_KEYS[evaluation.roleId])}</span>
                  <details>
                    <summary>
                      {t('m7Ui.team.score', { score: number(evaluation.totalScoreMilli / 1000) })}
                    </summary>
                    <dl className="summary-list">
                      {(Object.keys(FACTOR_KEYS) as (keyof typeof FACTOR_KEYS)[]).map((factor) => (
                        <div key={factor}>
                          <dt>{t(FACTOR_KEYS[factor])}</dt>
                          <dd>{number(evaluation.components[factor])}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                </li>
              ))}
            </ol>
          </>
        )}
        {purpose === 'PLAYER' && (
          <>
            <article className="career-card">
              <h3>{t('m7Direct.shell.identity')}</h3>
              <p>{t(background.nameKey as MessageKey)}</p>
              {session.player.personalityTraitIds.map((id) => (
                <p key={id}>
                  {t(
                    creationContent.personalityTraits.find((trait) => trait.id === id)!
                      .nameKey as MessageKey,
                  )}
                </p>
              ))}
              <dl className="summary-list">
                <div>
                  <dt>{t('career.player.height')}</dt>
                  <dd>{height}</dd>
                </div>
                <div>
                  <dt>{t('career.player.weight')}</dt>
                  <dd>{weight}</dd>
                </div>
              </dl>
            </article>
            <p>{t('m7Ui.player.overall', { overall: session.player.overall })}</p>
            <div className="attribute-grid">
              {Object.entries(session.player.attributes).map(([id, progress]) => {
                const projection = projectAttributeProgress(progress);
                return (
                  <article className="attribute-card" key={id}>
                    <h3>{t(POSITION_ATTRIBUTE_KEYS[id]!)}</h3>
                    <p>{t('m7Ui.player.rating', { rating: progress.rating })}</p>
                    <ProgressMeter
                      label={t('m7Ui.player.xp')}
                      value={projection.progressPermille}
                      maximum={1000}
                      valueText={
                        projection.nextRating === null
                          ? t('m7Ui.player.maxRating')
                          : t('m7Ui.player.nextRating', {
                              next: projection.nextRating,
                              remaining: projection.xpToNextRating,
                              required: ATTRIBUTE_XP_PER_RATING,
                            })
                      }
                    />
                  </article>
                );
              })}
            </div>
            {history.length > 0 && (
              <details>
                <summary>{t('m7Direct.shell.history')}</summary>
                {history.map((week, index) => (
                  <article className="career-card" key={index}>
                    <h3>
                      {t('m7Ui.home.score', {
                        opponent: t(positionProgramNameKey(week.opponentProgramId)),
                        us: week.playerTeamScore,
                        them: week.opponentScore,
                      })}
                    </h3>
                    <dl className="summary-list">
                      {week.stats.entries.map((entry) => (
                        <div key={entry.statId}>
                          <dt>{t(POSITION_CAREER_STAT_KEYS[entry.statId]!)}</dt>
                          <dd>{number(entry.value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                ))}
              </details>
            )}
          </>
        )}
      </section>
    </main>
  );
}
