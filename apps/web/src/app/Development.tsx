import { useMemo, useState } from 'react';
import {
  backgroundProfileVNext,
  campFocusIdsVNext,
  chooseCampVNext,
  deriveBodyXpEfficiencyPermille,
  INFORMATION_RULES,
  overallWeightsVNext,
  type InformationPositionId,
  depthOutlookVNext,
  draftWeakestFactorVNext,
  focusDefinitionsVNext,
  informationOutlookVNext,
  nextPointsVNext,
  offseasonProgramXpVNext,
  potentialPermilleVNext,
  previewWeekPlanVNext,
  recommendedCampVNext,
  VNEXT_BREAKTHROUGH_THRESHOLD,
  VNEXT_DEVELOPMENT_CALENDAR,
  VNEXT_OFFSEASON_PROGRAMS,
  type CampReportVNext,
  type CareerVNext,
  type CareerVNextMechanics,
  type InjuryRiskBreakdownVNext,
  type OffseasonProgramIdVNext,
  type VNextPositionId,
} from '@project-saturday/game-core';
import type { MessageKey } from '@project-saturday/game-content/locales';

import { useAppTranslation } from '../i18n/i18n';
import {
  DEPTH_COMPONENT_KEYS,
  MOVEMENT_KEYS,
  POSITION_ABBR_KEYS,
  athleteName,
  attributeNameKey,
  focusText,
  key,
  participantName,
  practiceBand,
} from './content';
import { GrowthList } from './Growth';
import { mergeGrowth } from './growth-model';
import { Nameplate } from './Nameplate';
import { Panel } from './ui';

const pct = (permille: number) => Math.round(permille / 10);

/** The pregame injury risk, part by part (M12), inside a disclosure under the risk band. */
export function RiskParts({
  breakdown,
}: {
  readonly breakdown: InjuryRiskBreakdownVNext;
}): React.JSX.Element {
  const { t } = useAppTranslation();
  const parts = [
    ['base', breakdown.base],
    ['bodyDeficit', breakdown.bodyDeficit],
    ['durability', breakdown.durability],
    ['workload', breakdown.workload],
    ['trainingLoad', breakdown.trainingLoad],
    ['positionExposure', breakdown.positionExposure],
  ] as const;
  return (
    <details className="s2-disclosure">
      <summary>{t('v2.risk.partsTitle')}</summary>
      <ul className="s2-kv">
        {parts
          .filter(([, value]) => value > 0)
          .map(([id, value]) => (
            <li key={id}>
              <span>{t(`v2.risk.part.${id}`)}</span>
              <strong className="s2-num">{(value / 10).toFixed(1)}%</strong>
            </li>
          ))}
        {breakdown.cardMultiplierPermille !== 1000 && (
          <li>
            <span>
              {t('v2.risk.part.cards', {
                value: (breakdown.cardMultiplierPermille / 1000).toFixed(2),
              })}
            </span>
          </li>
        )}
      </ul>
      <p className="s2-note">{t('v2.risk.total', { value: (breakdown.total / 10).toFixed(1) })}</p>
    </details>
  );
}

/** What the picked plan does to the athlete, from the planning command itself (M12 DEV-06). */
export function PlanPreview({
  career,
  mechanics,
  picks,
}: {
  readonly career: CareerVNext;
  readonly mechanics: CareerVNextMechanics;
  readonly picks: readonly string[];
}): React.JSX.Element {
  const { t } = useAppTranslation();
  const preview = useMemo(
    () => (picks.length === 3 ? previewWeekPlanVNext(career, picks, mechanics) : null),
    [career, mechanics, picks],
  );
  return (
    <Panel id="s2-preview" title={t('v2.preview.title')}>
      {preview === null ? (
        <p className="s2-note">{t('v2.preview.empty')}</p>
      ) : (
        <div className="s2-stack" style={{ gap: 8 }}>
          <p className="s2-row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="s2-effect">
              {t('v2.week.projectedGrade', { band: practiceBand(preview.practiceScore) })}
            </span>
            <span
              className={`s2-effect ${preview.overall.after > preview.overall.before ? 's2-effect--up' : ''}`}
            >
              {t('v2.preview.overall', preview.overall)}
            </span>
            <span className="s2-effect s2-effect--up">
              {t('v2.preview.gauge', { gain: preview.gauge.after - preview.gauge.before })}
            </span>
          </p>
          <GrowthList rows={mergeGrowth(preview.focuses.flatMap((focus) => focus.attributeXp))} />
          {preview.coachFocus !== null && (
            <p className="s2-note">
              {t('v2.focus.progress', {
                focus: t(focusText(career.development?.focus?.focusId ?? '').nameKey),
                done: preview.coachFocus.done,
                required: preview.coachFocus.required,
              })}
            </p>
          )}
          {preview.risk !== null && career.condition.injury === null && (
            <RiskParts breakdown={preview.risk} />
          )}
        </div>
      )}
    </Panel>
  );
}

/** The next concrete steps: a tell, the next rating points, the depth gap, the draft's weak spot. */
export function Milestones({
  career,
  mechanics,
}: {
  readonly career: CareerVNext;
  readonly mechanics: CareerVNextMechanics;
}): React.JSX.Element {
  const { t } = useAppTranslation();
  const info = informationOutlookVNext(career);
  const points = nextPointsVNext(career, mechanics);
  const draft = draftWeakestFactorVNext(career);
  const room = career.program?.room;
  const depth = depthOutlookVNext(career, mechanics);
  const name = (id: string) =>
    room === undefined ? '' : participantName(t, room, id, athleteName(t, career));
  return (
    <Panel id="s2-milestones" title={t('v2.milestone.title')}>
      <ul className="s2-bullets">
        <li>
          <span>
            {info.nextAt === null
              ? t('v2.milestone.tellsMax')
              : info.preparationNeeded !== null
                ? t('v2.milestone.tell', {
                    n: info.tells + 1,
                    score: info.score,
                    at: info.nextAt,
                    prep: info.preparationNeeded,
                    iq: info.iqNeeded ?? '—',
                  })
                : t('v2.milestone.tellIqOnly', {
                    n: info.tells + 1,
                    score: info.score,
                    at: info.nextAt,
                    iq: info.iqNeeded ?? '—',
                  })}
          </span>
        </li>
        {points.map((point) => (
          <li key={point.attributeId}>
            <span>
              {t('v2.milestone.point', {
                attribute: t(attributeNameKey(point.attributeId)),
                rating: point.rating,
                next: Math.min(100, point.rating + 1),
                xp: point.xpToNext,
              })}
            </span>
          </li>
        ))}
        {depth !== null && (
          <li>
            <span>
              {depth.direction === 'ADVANCEMENT_TARGET'
                ? t('v2.milestone.depthUp', {
                    name: name(depth.neighborParticipantId),
                    gap: depth.pointsToMove.toFixed(1),
                    component:
                      depth.leadingDeficit === null
                        ? '—'
                        : t(
                            DEPTH_COMPONENT_KEYS[
                              depth.leadingDeficit as keyof typeof DEPTH_COMPONENT_KEYS
                            ],
                          ),
                  })
                : t('v2.milestone.depthTop', {
                    name: name(depth.neighborParticipantId),
                    gap: depth.pointsToMove.toFixed(1),
                  })}
            </span>
          </li>
        )}
        {draft !== null && (
          <li>
            <span>
              {t('v2.milestone.draft', {
                factor: t(`v2.draftFactor.${draft.factor}`),
                value: draft.value,
              })}
            </span>
          </li>
        )}
      </ul>
    </Panel>
  );
}

/** The background's growth curve, shown where the athlete plans (M12 potential). */
export function PotentialLine({ career }: { readonly career: CareerVNext }): React.JSX.Element {
  const { t } = useAppTranslation();
  return (
    <p className="s2-note" title={t('v2.potential.title')}>
      {t('v2.potential.line', {
        value: pct(potentialPermilleVNext(career)),
        background: t(
          key(
            `creation.backgrounds.${backgroundKey(career.athlete.profile.recruitingBackgroundId)}.name`,
          ),
        ),
      })}
    </p>
  );
}

function backgroundKey(id: string): string {
  return id
    .slice('background_'.length)
    .replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/** The background's full curve and recruit standing (creation and Profile). */
export function PotentialCurve({ backgroundId }: { readonly backgroundId: string }) {
  const { t } = useAppTranslation();
  const profile = backgroundProfileVNext(backgroundId);
  const [a, b, c, d] = profile.potentialPermille.map(pct);
  return (
    <span className="s2-stack" style={{ gap: 2 }}>
      <span className="s2-note">{t('v2.potential.curve', { a, b, c, d })}</span>
      <span className="s2-note">
        {t('v2.potential.standing', {
          value:
            profile.recruitStanding > 0 ? `+${profile.recruitStanding}` : profile.recruitStanding,
        })}
      </span>
    </span>
  );
}

function CampReport({
  career,
  report,
  blocked,
  onContinue,
}: {
  readonly career: CareerVNext;
  readonly report: CampReportVNext;
  readonly blocked: boolean;
  readonly onContinue: () => void;
}) {
  const { t } = useAppTranslation();
  const abbr = t(POSITION_ABBR_KEYS[career.athlete.profile.positionId as VNextPositionId]);
  const band = practiceBand(report.practiceScore);
  return (
    <div className="s2-grid-2">
      <Panel id="s2-camp-report" title={t('v2.camp.reportTitle')}>
        <div className="s2-row" style={{ alignItems: 'center', gap: 18 }}>
          <span aria-label={t('v2.report.gradeLabel', { band })} className="s2-grade" role="img">
            {band}
          </span>
          <div className="s2-stack" style={{ gap: 6 }}>
            <p className="s2-display" style={{ fontSize: 28 }}>
              {t(MOVEMENT_KEYS[report.depth.movement], {
                position: abbr,
                rank: report.depth.rankAfter,
              })}
            </p>
            <p className="s2-note">
              {t('v2.camp.role', { position: abbr, rank: report.depth.rankAfter })}
            </p>
            <p className="s2-note">
              {t('v2.report.gauge', {
                value: report.gaugeAfter,
                threshold: VNEXT_BREAKTHROUGH_THRESHOLD,
                gain: report.gaugeAfter - report.gaugeBefore,
              })}
            </p>
          </div>
        </div>
      </Panel>
      <Panel id="s2-camp-growth" title={t('v2.report.growthTitle')}>
        <GrowthList rows={mergeGrowth(report.focuses.flatMap((focus) => focus.attributeXp))} />
      </Panel>
      <div className="s2-actionbar">
        <div className="s2-actionbar__inner">
          <button
            className="s2-btn s2-btn--block"
            disabled={blocked}
            onClick={onContinue}
            type="button"
          >
            {t('v2.camp.continue')} <span className="s2-btn__arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/** Preseason camp (M12): three emphases at camp XP, then the camp report. */
export function CampScreen({
  career,
  mechanics,
  blocked,
  onCamp,
  onContinue,
}: {
  readonly career: CareerVNext;
  readonly mechanics: CareerVNextMechanics;
  readonly blocked: boolean;
  readonly onCamp: (ids: readonly string[]) => void;
  readonly onContinue: () => void;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  const [picks, setPicks] = useState<readonly string[]>([]);
  const open = useMemo(() => campFocusIdsVNext(career, mechanics), [career, mechanics]);
  const trains = useMemo(
    () =>
      new Map(
        focusDefinitionsVNext(career, mechanics).map((definition) => [
          definition.id as string,
          definition.attributeXp.map(({ attributeId }) => attributeId as string),
        ]),
      ),
    [career, mechanics],
  );
  const projected = useMemo(() => {
    if (picks.length !== 3) return null;
    const result = chooseCampVNext(career, picks, mechanics);
    return result.ok && result.career.flow.type === 'CAMP' ? result.career.flow.report : null;
  }, [career, mechanics, picks]);
  if (career.flow.type !== 'CAMP') return null;
  const report = career.flow.report;
  const xp = pct(
    (potentialPermilleVNext(career) * VNEXT_DEVELOPMENT_CALENDAR.campXpPermille) / 1000,
  );
  return (
    <div className="s2-stack">
      <Nameplate career={career} />
      <div className="s2-next">
        <p className="s2-eyebrow">{t('v2.camp.eyebrow', { season: career.season.index + 1 })}</p>
        <h2 className="s2-display s2-next__title">
          {report === null ? t('v2.camp.title') : t('v2.camp.reportTitle')}
        </h2>
        <p className="s2-note">{t('v2.camp.help', { xp })}</p>
      </div>
      {report !== null ? (
        <CampReport blocked={blocked} career={career} onContinue={onContinue} report={report} />
      ) : (
        <>
          <div className="s2-grid-2">
            <Panel
              aside={
                <button
                  className="s2-chipbtn"
                  onClick={() => setPicks(recommendedCampVNext(career, mechanics))}
                  type="button"
                >
                  {t('v2.camp.recommended')}
                </button>
              }
              id="s2-camp"
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
                      onClick={() => setPicks(picks.filter((_, i) => i !== index))}
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
                {open.map((id) => (
                  <button
                    className="s2-focus"
                    disabled={picks.length >= 3}
                    key={id}
                    onClick={() => setPicks([...picks, id])}
                    title={t(focusText(id).descriptionKey)}
                    type="button"
                  >
                    <span className="s2-focus__name">{t(focusText(id).nameKey)}</span>
                    <span className="s2-focus__trains">
                      {t('v2.week.trains', {
                        list: (trains.get(id) ?? [])
                          .map((attributeId) => t(attributeNameKey(attributeId)))
                          .join(' · '),
                      })}
                    </span>
                    {picks.includes(id) && (
                      <span className="s2-focus__count">
                        {picks.filter((pick) => pick === id).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <p className="s2-note" style={{ marginTop: 10 }}>
                {t('v2.camp.excluded')}
              </p>
            </Panel>
            <Panel id="s2-camp-preview" title={t('v2.preview.title')}>
              {projected === null ? (
                <p className="s2-note">{t('v2.preview.empty')}</p>
              ) : (
                <div className="s2-stack" style={{ gap: 8 }}>
                  <span className="s2-effect">
                    {t('v2.week.projectedGrade', { band: practiceBand(projected.practiceScore) })}
                  </span>
                  <GrowthList
                    rows={mergeGrowth(projected.focuses.flatMap((focus) => focus.attributeXp))}
                  />
                </div>
              )}
            </Panel>
          </div>
          <div className="s2-actionbar">
            <div className="s2-actionbar__inner">
              <button
                className="s2-btn s2-btn--block"
                disabled={picks.length !== 3 || blocked}
                onClick={() => onCamp(picks)}
                type="button"
              >
                {picks.length === 3
                  ? t('v2.camp.lockIn')
                  : t('v2.week.pickMore', { count: 3 - picks.length })}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** The midseason checkpoint (M12): where the season stands and the coach's focus. */
export function MidseasonScreen({
  career,
  blocked,
  onDecide,
}: {
  readonly career: CareerVNext;
  readonly blocked: boolean;
  readonly onDecide: (accept: boolean) => void;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  if (career.flow.type !== 'MIDSEASON') return null;
  const review = career.flow.review;
  const abbr = t(POSITION_ABBR_KEYS[career.athlete.profile.positionId as VNextPositionId]);
  const tuning = VNEXT_DEVELOPMENT_CALENDAR;
  const focus = t(focusText(review.suggestion.focusId).nameKey);
  const attribute = t(attributeNameKey(review.suggestion.attributeId));
  return (
    <div className="s2-stack">
      <Nameplate career={career} />
      <div className="s2-next">
        <p className="s2-eyebrow">{t('v2.mid.eyebrow')}</p>
        <h2 className="s2-display s2-next__title">{t('v2.mid.title')}</h2>
      </div>
      <div className="s2-grid-2">
        <Panel id="s2-mid-summary" title={t('v2.mid.summary')}>
          <ul className="s2-bullets">
            <li>
              <span>{t('v2.mid.record', review.record)}</span>
            </li>
            <li>
              <span>
                {t('v2.mid.reads', { sharp: review.sharpReads, total: review.liveSnaps })}
              </span>
            </li>
            {review.averageGrade !== null && (
              <li>
                <span>{t('v2.mid.grade', { grade: practiceBand(review.averageGrade) })}</span>
              </li>
            )}
            <li>
              <span>{t('v2.mid.overall', review.overall)}</span>
            </li>
            <li>
              <span>
                {t('v2.mid.depth', {
                  position: abbr,
                  start: review.depthRank.start,
                  now: review.depthRank.now,
                })}
              </span>
            </li>
          </ul>
        </Panel>
        <Panel id="s2-mid-focus" title={t('v2.mid.focusTitle')}>
          <p>
            {t(
              review.suggestion.reason === 'MISSED_READS' ? 'v2.mid.focusReads' : 'v2.mid.focusKey',
              {
                attribute,
                focus,
              },
            )}
          </p>
          <p className="s2-note" style={{ marginTop: 8 }}>
            {t('v2.mid.reward', {
              trust: tuning.focusReward.trust,
              attribute,
              xp: tuning.focusReward.xp,
              gauge: tuning.focusReward.gauge,
              miss: tuning.focusMissTrust,
            })}
          </p>
        </Panel>
      </div>
      <div className="s2-actionbar">
        <div className="s2-actionbar__inner s2-row" style={{ gap: 10 }}>
          <button
            className="s2-btn s2-btn--ghost"
            disabled={blocked}
            onClick={() => onDecide(false)}
            type="button"
          >
            {t('v2.mid.decline')}
          </button>
          <button
            className="s2-btn s2-btn--block"
            disabled={blocked}
            onClick={() => onDecide(true)}
            type="button"
          >
            {t('v2.mid.accept')}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Offseason program choice (M12 DEV-03), with each program's real XP and start-of-season cost. */
export function OffseasonProgramPicker({
  career,
  mechanics,
  value,
  onChange,
}: {
  readonly career: CareerVNext;
  readonly mechanics: CareerVNextMechanics;
  readonly value: OffseasonProgramIdVNext | null;
  readonly onChange: (next: OffseasonProgramIdVNext | null) => void;
}): React.JSX.Element {
  const { t } = useAppTranslation();
  const nextPotential = potentialPermilleVNext({
    athlete: career.athlete,
    season: { ...career.season, index: career.season.index + 1 },
  });
  const options: readonly (OffseasonProgramIdVNext | null)[] = [
    null,
    ...VNEXT_OFFSEASON_PROGRAMS.map(({ id }) => id),
  ];
  return (
    <Panel id="s2-offprogram" title={t('v2.offProgram.title')}>
      <p className="s2-note" style={{ marginBottom: 10 }}>
        {t('v2.offProgram.help')}
      </p>
      <div
        className="s2-stack"
        role="radiogroup"
        style={{ gap: 8 }}
        aria-label={t('v2.offProgram.title')}
      >
        {options.map((id) => {
          const program = VNEXT_OFFSEASON_PROGRAMS.find((entry) => entry.id === id);
          const xp =
            id === null ? [] : offseasonProgramXpVNext(career, id, mechanics, nextPotential);
          return (
            <button
              aria-checked={value === id}
              className={`s2-option ${value === id ? 's2-option--on' : ''}`}
              key={id ?? 'none'}
              onClick={() => onChange(id)}
              role="radio"
              type="button"
            >
              <strong>
                {t(
                  id === null
                    ? 'v2.offProgram.none'
                    : (`v2.offProgram.${id.slice('offseason_'.length)}` as MessageKey),
                )}
              </strong>
              {xp.length > 0 && (
                <span className="s2-effects">
                  {xp.map((entry) => (
                    <span className="s2-effect s2-effect--up" key={entry.attributeId}>
                      {t('v2.offProgram.gain', {
                        attribute: t(attributeNameKey(entry.attributeId)),
                        xp: entry.xp,
                      })}
                    </span>
                  ))}
                </span>
              )}
              {program !== undefined && (
                <span className="s2-effects">
                  {program.bodyStart !== undefined && (
                    <span className="s2-effect s2-effect--down">
                      {t('v2.offProgram.body', { value: program.bodyStart })}
                    </span>
                  )}
                  {program.preparationStart !== undefined && (
                    <span className="s2-effect s2-effect--up">
                      {t('v2.offProgram.prep', { value: program.preparationStart })}
                    </span>
                  )}
                  {program.gpaDelta !== undefined && (
                    <span
                      className={`s2-effect ${program.gpaDelta > 0 ? 's2-effect--up' : 's2-effect--down'}`}
                    >
                      {t('v2.offProgram.gpa', {
                        value: `${program.gpaDelta > 0 ? '+' : '−'}${Math.abs(program.gpaDelta).toFixed(2)}`,
                      })}
                    </span>
                  )}
                  {program.brandDelta !== undefined && (
                    <span className="s2-effect s2-effect--down">
                      {t('v2.offProgram.brand', { value: program.brandDelta })}
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

/** How development works, with this athlete's live numbers from the rules (M12 DEV-04). */
export function DevelopmentGuide({
  career,
  mechanics,
}: {
  readonly career: CareerVNext;
  readonly mechanics: CareerVNextMechanics;
}): React.JSX.Element {
  const { t } = useAppTranslation();
  const positionId = career.athlete.profile.positionId as InformationPositionId;
  const share = (permille: number) => `${Math.round(permille / 10)}%`;
  const weights = overallWeightsVNext(career, mechanics)
    .slice(0, 4)
    .map(
      ({ attributeId, weightPermille }) =>
        `${t(attributeNameKey(attributeId))} ${share(weightPermille)}`,
    )
    .join(' · ');
  const depth = mechanics.room.depthEvaluationWeightsPermille;
  const depthList = (Object.keys(DEPTH_COMPONENT_KEYS) as (keyof typeof DEPTH_COMPONENT_KEYS)[])
    .map((id) => `${t(DEPTH_COMPONENT_KEYS[id])} ${share(depth[id])}`)
    .join(' · ');
  const info = INFORMATION_RULES[positionId];
  const gpa = (milli: number) => (milli / 1000).toFixed(2);
  return (
    <Panel>
      <details className="s2-disclosure" id="s2-guide">
        <summary>{t('v2.guide.title')}</summary>
        <ul className="s2-bullets">
          <li>
            <span>
              {t('v2.guide.xp', {
                body: pct(
                  deriveBodyXpEfficiencyPermille(
                    career.athlete.profile.state.body,
                    mechanics.trainingConfig,
                  ),
                ),
                potential: pct(potentialPermilleVNext(career)),
              })}
            </span>
          </li>
          <li>
            <span>{t('v2.guide.overall', { list: weights })}</span>
          </li>
          <li>
            <span>
              {t('v2.guide.depth', {
                list: depthList,
                margin: (mechanics.room.hysteresisThresholdMilli / 1000).toFixed(1),
              })}
            </span>
          </li>
          <li>
            <span>
              {t('v2.guide.information', {
                iq: pct(info.iqWeight),
                reading: info.readingAttributeIds.map((id) => t(attributeNameKey(id))).join(' + '),
                readingWeight: pct(info.readingWeight),
                prep: pct(info.preparationWeight),
                one: info.tiers[0],
                two: info.tiers[1],
              })}
            </span>
          </li>
          <li>
            <span>{t('v2.guide.condition')}</span>
          </li>
          <li>
            <span>{t('v2.guide.trust')}</span>
          </li>
          <li>
            <span>
              {t('v2.guide.academics', {
                weeks: mechanics.academics.checkpoints
                  .map(({ weekIndex }) => weekIndex + 1)
                  .join(', '),
                floor: gpa(mechanics.academics.warningGpaMilli),
                warning: gpa(mechanics.academics.eligibleGpaMilli),
              })}
            </span>
          </li>
          <li>
            <span>{t('v2.guide.gauge', { threshold: VNEXT_BREAKTHROUGH_THRESHOLD })}</span>
          </li>
        </ul>
      </details>
    </Panel>
  );
}
