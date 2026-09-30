import {
  chooseEventVNext,
  chooseInjuryVNext,
  type CareerVNext,
  type CareerVNextMechanics,
  type EventEffectsVNext,
  type InjuryAvailabilityEvidence,
  type VNextPositionId,
} from '@project-saturday/game-core';

import { useAppTranslation, type AppTranslate } from '../i18n/i18n';
import { EXPOSURE_KEYS, eventChoiceKey, eventText, injuryText } from './content';
import { Nameplate } from './Nameplate';
import { METER_COLORS } from './theme';
import { Meter, Panel } from './ui';

const INJURY_CHOICES = ['injury_choice_rest_rehab', 'injury_choice_play_limited'] as const;

interface Chip {
  readonly label: string;
  readonly value: number;
  readonly text: string;
}

function signed(value: number): string {
  return `${value > 0 ? '+' : '−'}${Math.abs(value)}`;
}

function eventChips(
  t: AppTranslate,
  effects: EventEffectsVNext,
  positionId: VNextPositionId,
): readonly Chip[] {
  const stats: [string, number, string][] = [
    [t('v2.stat.body'), effects.body, signed(effects.body)],
    [t('v2.stat.prep'), effects.preparation, signed(effects.preparation)],
    [t('v2.stat.conf'), effects.confidence, signed(effects.confidence)],
    [t('v2.stat.trust'), effects.coachTrust, signed(effects.coachTrust)],
    [t('v2.stat.gpa'), effects.gpaMilli, signed(Math.round(effects.gpaMilli / 10) / 100)],
    [t('v2.stat.brand'), effects.brand, signed(effects.brand)],
    [t('v2.stat.gauge'), effects.gauge, signed(effects.gauge)],
  ];
  const { modifiers } = effects;
  const carried: Chip[] = [
    ...(modifiers.clueBonus > 0
      ? [{ label: '', value: 1, text: t('v2.evt.modClue', { value: modifiers.clueBonus }) }]
      : []),
    ...(modifiers.decisionScoreFlat !== 0
      ? [
          {
            label: '',
            value: modifiers.decisionScoreFlat,
            text: t('v2.evt.modScore', { value: modifiers.decisionScoreFlat }),
          },
        ]
      : []),
    ...(modifiers.exposureReductionPermille > 0
      ? [
          {
            label: '',
            value: 1,
            text: t(EXPOSURE_KEYS[positionId], {
              value: Math.round(modifiers.exposureReductionPermille / 10),
            }),
          },
        ]
      : []),
  ];
  return [
    ...stats
      .filter(([, value]) => value !== 0)
      .map(([label, value, text]) => ({ label, value, text })),
    ...carried,
  ];
}

function injuryChips(t: AppTranslate, availability: InjuryAvailabilityEvidence): readonly Chip[] {
  const stats: [string, number][] = [
    [t('v2.stat.body'), availability.actualBodyDelta],
    [t('v2.stat.conf'), availability.actualConfidenceDelta],
    [t('v2.stat.trust'), availability.actualCoachTrustDelta],
  ];
  return [
    availability.opportunityCap === 0
      ? { label: '', value: -1, text: t('v2.inj.sitOut') }
      : {
          label: '',
          value: 0,
          text: t('v2.inj.snapCap', { count: availability.opportunityCap }),
        },
    ...stats
      .filter(([, value]) => value !== 0)
      .map(([label, value]) => ({ label, value, text: signed(value) })),
    ...(availability.recoveryCreditWeeks > 0
      ? [
          {
            label: '',
            value: 1,
            text: t('v2.inj.recoveryCredit', { count: availability.recoveryCreditWeeks }),
          },
        ]
      : []),
  ];
}

function Chips({ chips }: { readonly chips: readonly Chip[] }): React.JSX.Element {
  return (
    <span className="s2-effects">
      {chips.map((chip) => (
        <span
          className={`s2-effect ${chip.value > 0 ? 's2-effect--up' : chip.value < 0 ? 's2-effect--down' : ''}`}
          key={`${chip.label}${chip.text}`}
        >
          {chip.label}
          {chip.label !== '' && ' '}
          {chip.text}
        </span>
      ))}
    </span>
  );
}

function Readiness({ career }: { readonly career: CareerVNext }): React.JSX.Element {
  const { t } = useAppTranslation();
  const state = career.athlete.profile.state;
  return (
    <Panel id="s2-scene-ready" title={t('v2.readiness.title')}>
      <div className="s2-meters">
        <Meter color={METER_COLORS.body} label={t('v2.stat.body')} value={state.body} />
        <Meter
          color={METER_COLORS.preparation}
          label={t('v2.stat.prep')}
          value={state.preparation}
        />
        <Meter color={METER_COLORS.confidence} label={t('v2.stat.conf')} value={state.confidence} />
        <Meter color={METER_COLORS.trust} label={t('v2.stat.trust')} value={state.coachTrust} />
      </div>
    </Panel>
  );
}

/** Midweek scene card: an authored situation, a real tradeoff, then its exact consequences. */
export function EventScreen({
  career,
  mechanics,
  blocked,
  onChoose,
  onContinue,
}: {
  readonly career: CareerVNext;
  readonly mechanics: CareerVNextMechanics;
  readonly blocked: boolean;
  readonly onChoose: (choiceId: string) => void;
  readonly onContinue: () => void;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  if (career.flow.type !== 'EVENT') return null;
  const event = career.flow.event;
  const positionId = career.athlete.profile.positionId as VNextPositionId;
  const text = eventText(event.eventId);
  // A legacy mentor scene names the alumnus from the career's own snapshot.
  const mentor = career.legacy?.alumni.find(({ careerId }) => careerId === event.mentorCareerId);
  const params = { name: mentor?.displayName ?? '' };
  // The command is pure, so resolving each choice against the current save is an exact preview.
  const preview = (choiceId: string) => {
    const result = chooseEventVNext(career, choiceId, mechanics);
    return result.ok && result.career.flow.type === 'EVENT'
      ? result.career.flow.event.effects
      : null;
  };
  const resolved = event.effects;
  return (
    <div className="s2-stack">
      <Nameplate career={career} />
      <section aria-labelledby="s2-scene-title" className="s2-scene" id="s2-event">
        <p className="s2-eyebrow">{t('v2.evt.eyebrow')}</p>
        <h1 className="s2-display s2-size-h1" id="s2-scene-title">
          {t(text.nameKey, params)}
        </h1>
        <p className="s2-scene__body">{t(text.descriptionKey, params)}</p>
      </section>
      <div className="s2-grid-2">
        {event.chosenChoiceId === null || resolved === null ? (
          <Panel id="s2-event-choose" title={t('v2.evt.choose')}>
            <div className="s2-choices s2-choices--scene" role="group">
              {event.choiceIds.map((choiceId) => {
                const effects = preview(choiceId);
                return (
                  <button
                    className="s2-choice s2-choice--scene"
                    disabled={blocked}
                    key={choiceId}
                    onClick={() => onChoose(choiceId)}
                    type="button"
                  >
                    <span className="s2-choice__name">
                      {t(eventChoiceKey(event.eventId, choiceId))}
                    </span>
                    {effects !== null && <Chips chips={eventChips(t, effects, positionId)} />}
                  </button>
                );
              })}
            </div>
          </Panel>
        ) : (
          <Panel id="s2-event-outcome" title={t('v2.evt.outcome')}>
            <p className="s2-scene__choice">
              {t(eventChoiceKey(event.eventId, event.chosenChoiceId))}
            </p>
            {eventChips(t, resolved, positionId).length === 0 ? (
              <p className="s2-note">{t('v2.evt.noChange')}</p>
            ) : (
              <Chips chips={eventChips(t, resolved, positionId)} />
            )}
          </Panel>
        )}
        <Readiness career={career} />
      </div>
      {event.chosenChoiceId !== null && (
        <div className="s2-actionbar">
          <div className="s2-actionbar__inner">
            <button
              className="s2-btn s2-btn--block"
              disabled={blocked}
              onClick={onContinue}
              type="button"
            >
              {t('v2.evt.continue')} <span className="s2-btn__arrow">→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Pregame medical check: what happened, how long, and the one decision it asks of you. */
export function InjuryScreen({
  career,
  mechanics,
  blocked,
  onChoose,
  onContinue,
}: {
  readonly career: CareerVNext;
  readonly mechanics: CareerVNextMechanics;
  readonly blocked: boolean;
  readonly onChoose: (choiceId: string) => void;
  readonly onContinue: () => void;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  if (career.flow.type !== 'INJURY') return null;
  const report = career.flow.report;
  const text = injuryText(report.injury.outcomeId);
  const availability = report.availability;
  const preview = (choiceId: string) => {
    const result = chooseInjuryVNext(career, choiceId, mechanics);
    return result.ok && result.career.flow.type === 'INJURY'
      ? result.career.flow.report.availability
      : null;
  };
  return (
    <div className="s2-stack">
      <Nameplate career={career} />
      <section
        aria-labelledby="s2-injury-title"
        className="s2-scene s2-scene--medical"
        id="s2-injury"
      >
        <p className="s2-eyebrow">{t('v2.inj.eyebrow')}</p>
        <span className="s2-effect s2-effect--down">
          {t(report.outcome === 'INJURY' ? 'v2.inj.new' : 'v2.inj.ongoing')}
        </span>
        <h1 className="s2-display s2-size-h1" id="s2-injury-title">
          {t(text.nameKey)}
        </h1>
        <p className="s2-scene__body">{t(text.descriptionKey)}</p>
        <p className="s2-note s2-num">
          {t('v2.inj.weeksLeft', { count: report.injury.remainingWeeks })}
        </p>
      </section>
      <div className="s2-grid-2">
        {availability === null ? (
          <Panel id="s2-injury-choose" title={t('v2.inj.choose')}>
            <div className="s2-choices s2-choices--scene" role="group">
              {INJURY_CHOICES.map((choiceId) => {
                const projected = preview(choiceId);
                return (
                  <button
                    className="s2-choice s2-choice--scene"
                    disabled={blocked || projected === null}
                    key={choiceId}
                    onClick={() => onChoose(choiceId)}
                    type="button"
                  >
                    <span className="s2-choice__name">{t(injuryText(choiceId).nameKey)}</span>
                    {projected !== null && <Chips chips={injuryChips(t, projected)} />}
                  </button>
                );
              })}
            </div>
          </Panel>
        ) : (
          <Panel id="s2-injury-status" title={t('v2.evt.outcome')}>
            <p className="s2-scene__choice">
              {availability.opportunityCap === 0
                ? t('v2.inj.out')
                : t('v2.inj.limited', { count: availability.opportunityCap })}
            </p>
            <Chips chips={injuryChips(t, availability)} />
          </Panel>
        )}
        <Readiness career={career} />
      </div>
      {availability !== null && (
        <div className="s2-actionbar">
          <div className="s2-actionbar__inner">
            <button
              className="s2-btn s2-btn--block"
              disabled={blocked}
              onClick={onContinue}
              type="button"
            >
              {t('v2.inj.continue')} <span className="s2-btn__arrow">→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
