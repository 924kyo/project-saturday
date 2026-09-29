import { useMemo, useState } from 'react';
import {
  focusDefinitionsVNext,
  planWeekVNext,
  scheduledFixtureVNext,
  type CareerVNext,
  type CareerVNextMechanics,
  type PracticeReportVNext,
  type VNextPositionId,
} from '@project-saturday/game-core';

import { useAppTranslation, type AppTranslate } from '../i18n/i18n';
import {
  CLASS_YEAR_KEYS,
  DEPTH_COMPONENT_KEYS,
  MOVEMENT_KEYS,
  POSITION_ABBR_KEYS,
  ROLE_KEYS,
  attributeNameKey,
  focusText,
  key,
  participantName,
  practiceBand,
  program,
} from './content';
import { Nameplate } from './Nameplate';
import { Crest, Delta, Meter, Panel } from './ui';
import { METER_COLORS } from './theme';

interface FocusView {
  readonly id: string;
  readonly position: boolean;
  readonly body: number;
  readonly preparation: number;
  readonly confidence: number;
  readonly gpa: number;
}

function effects(t: AppTranslate, focus: FocusView): React.JSX.Element {
  const list: [string, number][] = [
    [t('v2.stat.body'), focus.body],
    [t('v2.stat.prep'), focus.preparation],
    [t('v2.stat.conf'), focus.confidence],
    [t('v2.stat.gpa'), Math.round(focus.gpa * 100) / 100],
  ];
  return (
    <span className="s2-effects">
      {list
        .filter(([, value]) => value !== 0)
        .map(([label, value]) => (
          <span
            className={`s2-effect ${value > 0 ? 's2-effect--up' : 's2-effect--down'}`}
            key={label}
          >
            {label} {value > 0 ? '+' : '−'}
            {Math.abs(value)}
          </span>
        ))}
    </span>
  );
}

function Opponent({
  career,
  mechanics,
}: {
  readonly career: CareerVNext;
  readonly mechanics: CareerVNextMechanics;
}) {
  const { t } = useAppTranslation();
  const fixture = scheduledFixtureVNext(career, mechanics);
  if (fixture === null || career.program === null) return null;
  const home = fixture.homeProgramId === career.program.programId;
  const opponent = program(home ? fixture.awayProgramId : fixture.homeProgramId);
  return (
    <span className="s2-row" style={{ alignItems: 'center', gap: 8 }}>
      <Crest identity={opponent} size={30} />
      <strong>
        {t(home ? 'v2.week.vsHome' : 'v2.week.atAway', { opponent: t(key(opponent.shortNameKey)) })}
      </strong>
    </span>
  );
}

function DepthSlice({ career }: { readonly career: CareerVNext }): React.JSX.Element | null {
  const { t } = useAppTranslation();
  if (career.program === null) return null;
  const room = career.program.room;
  const positionId = career.athlete.profile.positionId as VNextPositionId;
  const abbr = t(POSITION_ABBR_KEYS[positionId]);
  const rank = room.projection.rank;
  const rows = room.evaluations.filter(({ rank: r }) => r >= rank - 2 && r <= rank + 1);
  const explanation = room.adjacentExplanation;
  const rivalId =
    explanation.direction === 'ADVANCEMENT_TARGET' ? explanation.neighborParticipantId : null;
  // contributionGapMilli = rival − you: positive means the rival leads. Biggest deficits first.
  const gaps = [...explanation.components].sort(
    (a, b) => b.contributionGapMilli - a.contributionGapMilli,
  );
  const name = (id: string) => participantName(t, room, id, career.athlete.profile.displayName);
  return (
    <Panel id="s2-depth" title={t('v2.depth.title', { position: abbr })}>
      <ol className="s2-depthlist">
        {rows.map((row) => {
          const competitor = room.competitors.find(({ id }) => id === row.participantId);
          const you = row.participantId === room.playerId;
          return (
            <li
              className={`s2-depthrow ${you ? 's2-depthrow--you' : ''} ${row.participantId === rivalId ? 's2-depthrow--rival' : ''}`}
              key={row.participantId}
            >
              <span className="s2-depthrow__rank s2-num">
                {abbr}
                {row.rank}
              </span>
              <span>
                <span className="s2-depthrow__name">
                  {you
                    ? t('v2.depth.you', { name: name(row.participantId) })
                    : name(row.participantId)}
                </span>
                <br />
                <span className="s2-depthrow__tag">
                  {competitor === undefined
                    ? t(ROLE_KEYS[row.roleId])
                    : t('v2.depth.classRole', {
                        year: t(CLASS_YEAR_KEYS[competitor.classYear]),
                        role: t(ROLE_KEYS[row.roleId]),
                      })}
                </span>
              </span>
              {row.participantId === rivalId && (
                <span className="s2-effect s2-effect--down">{t('v2.depth.rival')}</span>
              )}
            </li>
          );
        })}
      </ol>
      {rivalId !== null && (
        <div className="s2-compare">
          <p className="s2-note">{t('v2.depth.compareHelp', { name: name(rivalId) })}</p>
          {gaps.map((gap) => (
            <div className="s2-compare__row" key={gap.componentId}>
              <span>{t(DEPTH_COMPONENT_KEYS[gap.componentId])}</span>
              <strong
                className={
                  gap.contributionGapMilli > 0
                    ? 's2-down'
                    : gap.contributionGapMilli < 0
                      ? 's2-up'
                      : ''
                }
              >
                {t(
                  gap.contributionGapMilli > 0
                    ? 'v2.depth.theyLead'
                    : gap.contributionGapMilli < 0
                      ? 'v2.depth.youLead'
                      : 'v2.depth.even',
                )}
              </strong>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function Report({
  career,
  report,
  blocked,
  onGameDay,
  mechanics,
}: {
  readonly career: CareerVNext;
  readonly report: PracticeReportVNext;
  readonly blocked: boolean;
  readonly onGameDay: () => void;
  readonly mechanics: CareerVNextMechanics;
}) {
  const { t } = useAppTranslation();
  const abbr = t(POSITION_ABBR_KEYS[career.athlete.profile.positionId as VNextPositionId]);
  const { depth } = report;
  const moved = depth.movement;
  const band = practiceBand(report.practiceScore);
  const xp = new Map<string, number>();
  for (const focus of report.focuses)
    for (const entry of focus.attributeXp)
      xp.set(entry.attributeId, (xp.get(entry.attributeId) ?? 0) + entry.appliedXp);
  const topXp = [...xp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const first = report.focuses[0];
  const last = report.focuses[2];
  return (
    <div className="s2-grid-2">
      <Panel id="s2-report" title={t('v2.report.title')}>
        <div className="s2-row" style={{ alignItems: 'center', gap: 18 }}>
          <span aria-label={t('v2.report.gradeLabel', { band })} className="s2-grade" role="img">
            {band}
          </span>
          <div className="s2-stack" style={{ gap: 6 }}>
            <p className="s2-display" style={{ fontSize: 30 }}>
              {t(MOVEMENT_KEYS[moved], { position: abbr, rank: depth.rankAfter })}
            </p>
            {moved !== 'HELD' && (
              <div className="s2-movement s2-num" aria-hidden="true">
                <span>
                  {abbr}
                  {depth.rankBefore}
                </span>
                <span className="s2-movement__arrow">→</span>
                <span
                  className={moved === 'PROMOTED' ? 's2-up' : moved === 'DEMOTED' ? 's2-down' : ''}
                >
                  {abbr}
                  {depth.rankAfter}
                </span>
              </div>
            )}
          </div>
        </div>
        <ul className="s2-bullets" style={{ marginTop: 14 }}>
          <li>
            <span>
              {t('v2.report.trust')} <Delta value={depth.coachTrust.actualDelta} />
              {depth.coachTrust.actualDelta === 0 && t('v2.report.noChange')}
            </span>
          </li>
          {topXp.length > 0 && (
            <li>
              <span>
                {t('v2.report.growth', {
                  list: topXp
                    .map(([id, value]) => `${t(attributeNameKey(id))} +${value}`)
                    .join(' · '),
                })}
              </span>
            </li>
          )}
          {report.sidelineCredit !== 0 && (
            <li>
              <span>
                {t(
                  report.sidelineCredit > 0 ? 'v2.report.sidelinePlus' : 'v2.report.sidelineMinus',
                  {
                    value: Math.abs(report.sidelineCredit),
                  },
                )}
              </span>
            </li>
          )}
          <li>
            <span>
              {t('v2.report.gauge', {
                value: report.gaugeAfter,
                gain: report.gaugeAfter - report.gaugeBefore,
              })}
            </span>
          </li>
        </ul>
      </Panel>
      <div className="s2-stack">
        <Panel id="s2-readiness" title={t('v2.readiness.title')}>
          <div className="s2-meters">
            <Meter
              color={METER_COLORS.body}
              label={t('v2.stat.body')}
              value={first.bodyBefore}
              after={last.bodyAfter}
            />
            <Meter
              color={METER_COLORS.preparation}
              label={t('v2.stat.prep')}
              value={first.preparationBefore}
              after={last.preparationAfter}
            />
            <Meter
              color={METER_COLORS.confidence}
              label={t('v2.stat.conf')}
              value={first.confidenceBefore}
              after={last.confidenceAfter}
            />
            <Meter
              color={METER_COLORS.trust}
              label={t('v2.stat.trust')}
              value={depth.coachTrust.before}
              after={depth.coachTrust.after}
            />
          </div>
        </Panel>
        <DepthSlice career={career} />
      </div>
      <div className="s2-actionbar">
        <div className="s2-actionbar__inner">
          <p className="s2-actionbar__hint">
            <Opponent career={career} mechanics={mechanics} />
          </p>
          <button
            className="s2-btn s2-btn--block"
            disabled={blocked}
            onClick={onGameDay}
            type="button"
          >
            {t('v2.report.toGameDay')} <span className="s2-btn__arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function WeekScreen({
  career,
  mechanics,
  blocked,
  onPlan,
  onGameDay,
}: {
  readonly career: CareerVNext;
  readonly mechanics: CareerVNextMechanics;
  readonly blocked: boolean;
  readonly onPlan: (ids: readonly string[]) => void;
  readonly onGameDay: () => void;
}): React.JSX.Element {
  const { t } = useAppTranslation();
  const [picks, setPicks] = useState<readonly string[]>([]);
  const focuses: readonly FocusView[] = useMemo(
    () =>
      focusDefinitionsVNext(career, mechanics).map((definition) => ({
        id: definition.id,
        position: 'positionId' in definition,
        body: definition.bodyDelta,
        preparation: definition.preparationDelta,
        confidence: definition.confidenceDelta,
        gpa: 'gpaDelta' in definition ? definition.gpaDelta : 0,
      })),
    [career, mechanics],
  );
  // The planning command is pure and deterministic, so its result is an exact preview.
  const projected = useMemo(() => {
    if (picks.length !== 3) return null;
    const result = planWeekVNext(career, picks, mechanics);
    return result.ok && result.career.flow.type === 'PRACTICE_REPORT'
      ? result.career.flow.report
      : null;
  }, [career, mechanics, picks]);

  if (career.flow.type === 'PRACTICE_REPORT')
    return (
      <div className="s2-stack">
        <Nameplate career={career} />
        <Report
          blocked={blocked}
          career={career}
          mechanics={mechanics}
          onGameDay={onGameDay}
          report={career.flow.report}
        />
      </div>
    );

  const state = career.athlete.profile.state;
  const add = (id: string) => picks.length < 3 && setPicks([...picks, id]);
  const removeAt = (index: number) => setPicks(picks.filter((_, i) => i !== index));
  function coachPlan(): void {
    const positionFocuses = focuses.filter(({ position }) => position);
    const plan = [positionFocuses[0]!.id, 'action_film_study'];
    const bodyAfter = state.body + positionFocuses[0]!.body - 3;
    plan.push(bodyAfter < 60 ? 'action_recovery' : positionFocuses[1]!.id);
    setPicks(plan.filter((id) => focuses.some((focus) => focus.id === id)));
  }
  const last = projected?.focuses[2];

  return (
    <div className="s2-stack">
      <Nameplate career={career} />
      <div className="s2-next">
        <p className="s2-eyebrow">{t('v2.week.nextUp')}</p>
        <h2 className="s2-display s2-next__title">{t('v2.week.planTitle')}</h2>
        <Opponent career={career} mechanics={mechanics} />
      </div>
      <div className="s2-grid-2">
        <Panel
          aside={
            <button className="s2-chipbtn" onClick={coachPlan} type="button">
              {t('v2.week.coachPlan')}
            </button>
          }
          id="s2-plan"
          title={t('v2.week.focusTitle')}
        >
          <div className="s2-slots" style={{ marginBottom: 12 }}>
            {[0, 1, 2].map((index) => {
              const id = picks[index];
              return (
                <button
                  aria-label={
                    id === undefined
                      ? t('v2.week.emptySlot', { n: index + 1 })
                      : t('v2.week.removeSlot', { name: t(focusText(id).nameKey) })
                  }
                  className={`s2-slot ${id !== undefined ? 's2-slot--filled' : ''}`}
                  disabled={id === undefined}
                  key={index}
                  onClick={() => removeAt(index)}
                  type="button"
                >
                  <span className="s2-slot__n">{index + 1}</span>
                  <span className="s2-slot__name">
                    {id === undefined ? t('v2.week.pickFocus') : t(focusText(id).nameKey)}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="s2-focusgrid">
            {focuses.map((focus) => {
              const count = picks.filter((id) => id === focus.id).length;
              return (
                <button
                  className={`s2-focus ${focus.position ? 's2-focus--position' : ''}`}
                  disabled={picks.length >= 3}
                  key={focus.id}
                  onClick={() => add(focus.id)}
                  title={t(focusText(focus.id).descriptionKey)}
                  type="button"
                >
                  <span className="s2-focus__kind">
                    {t(focus.position ? 'v2.week.positionWork' : 'v2.week.sharedWork')}
                  </span>
                  <span className="s2-focus__name">{t(focusText(focus.id).nameKey)}</span>
                  {effects(t, focus)}
                  {count > 0 && <span className="s2-focus__count">{count}</span>}
                </button>
              );
            })}
          </div>
        </Panel>
        <div className="s2-stack">
          <Panel
            aside={
              projected !== null ? (
                <span className="s2-effect">
                  {t('v2.week.projectedGrade', { band: practiceBand(projected.practiceScore) })}
                </span>
              ) : undefined
            }
            id="s2-ready"
            title={t('v2.readiness.title')}
          >
            <div className="s2-meters">
              <Meter
                after={last?.bodyAfter}
                color={METER_COLORS.body}
                label={t('v2.stat.body')}
                value={state.body}
              />
              <Meter
                after={last?.preparationAfter}
                color={METER_COLORS.preparation}
                label={t('v2.stat.prep')}
                value={state.preparation}
              />
              <Meter
                after={last?.confidenceAfter}
                color={METER_COLORS.confidence}
                label={t('v2.stat.conf')}
                value={state.confidence}
              />
              <Meter
                color={METER_COLORS.trust}
                label={t('v2.stat.trust')}
                value={state.coachTrust}
              />
            </div>
            {state.body < 35 && (
              <p className="s2-note" style={{ marginTop: 10 }}>
                {t('v2.readiness.lowBody')}
              </p>
            )}
          </Panel>
          <DepthSlice career={career} />
        </div>
      </div>
      <div className="s2-actionbar">
        <div className="s2-actionbar__inner">
          <button
            className="s2-btn s2-btn--block"
            disabled={picks.length !== 3 || blocked}
            onClick={() => onPlan(picks)}
            type="button"
          >
            {picks.length === 3
              ? t('v2.week.lockIn')
              : t('v2.week.pickMore', { count: 3 - picks.length })}
          </button>
        </div>
      </div>
    </div>
  );
}
