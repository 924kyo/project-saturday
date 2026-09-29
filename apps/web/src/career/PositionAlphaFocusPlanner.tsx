import { useMemo, useState } from 'react';
import {
  ATTRIBUTE_XP_PER_RATING,
  projectAttributeProgress,
  projectPositionAlphaPlanningV2,
  type PositionAlphaSessionV2,
  type PositionAlphaSessionCommandMechanics,
} from '@project-saturday/game-core';
import { positionAlphaContent, weeklyActions } from '@project-saturday/game-content';
import type { MessageKey, SupportedLocale } from '@project-saturday/game-content/locales';
import { useAppTranslation } from '../i18n/i18n';
import {
  POSITION_ATTRIBUTE_KEYS as ATTRIBUTE_KEYS,
  POSITION_STATE_KEYS as STATE_LABELS,
} from './position-labels';

const FOCUS_SLOTS = [0, 1, 2] as const;
const ACTIONS = [...positionAlphaContent.trainingActions, ...weeklyActions];

export interface PositionAlphaFocusPlannerProps {
  readonly session: PositionAlphaSessionV2;
  readonly mechanics: PositionAlphaSessionCommandMechanics;
  readonly locale: SupportedLocale;
  readonly busy: boolean;
  readonly saveFailed: boolean;
  readonly onCommit: (actionIds: readonly string[]) => void;
}

/** Current UI: projection owns every consequence and availability decision. */
export function PositionAlphaFocusPlanner({
  session,
  mechanics,
  locale,
  busy,
  saveFailed,
  onCommit,
}: PositionAlphaFocusPlannerProps): React.JSX.Element {
  const { t } = useAppTranslation(locale);
  const [selected, setSelected] = useState<readonly string[]>(['', '', '']);
  const projection = useMemo(
    () => projectPositionAlphaPlanningV2(session, selected, mechanics),
    [session, selected, mechanics],
  );
  const prepared = projection?.preparation ?? null;
  const blocked = busy || saveFailed;
  const number = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(value);
  const signed = (value: number) =>
    new Intl.NumberFormat(locale, { signDisplay: 'exceptZero', maximumFractionDigits: 3 }).format(
      value,
    );
  const multiplier = (permille: number) =>
    new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(
      permille / 1000,
    );
  return (
    <section
      className="panel"
      aria-labelledby="position-focus-heading"
      data-testid="position-focus-planner"
    >
      <h2 id="position-focus-heading">{t('m7Direct.plan.title')}</h2>
      <p>{t('m7Direct.plan.help')}</p>
      <div className="form-section">
        {FOCUS_SLOTS.map((slot) => {
          const choice = projection?.actions.find(({ actionId }) => actionId === selected[slot]);
          const definition = ACTIONS.find(({ id }) => id === selected[slot]);
          const proficiency = choice?.proficiency;
          return (
            <fieldset className="choice-fieldset form-section" key={slot} disabled={blocked}>
              <legend>{t('m7Direct.plan.slot', { slot: slot + 1 })}</legend>
              <label className="select-field">
                <span>{t('m7Direct.plan.slot', { slot: slot + 1 })}</span>
                <select
                  value={selected[slot]}
                  onChange={(event) => {
                    const id = event.currentTarget.value;
                    setSelected((prior) =>
                      prior.map((value, index) => (index === slot ? id : value)),
                    );
                  }}
                >
                  <option value="">{t('career.week.draft.empty')}</option>
                  {projection?.actions.map((action) => {
                    const content = ACTIONS.find(({ id }) => id === action.actionId)!;
                    const name = t(content.nameKey as MessageKey);
                    return (
                      <option
                        key={action.actionId}
                        value={action.actionId}
                        disabled={!action.available}
                      >
                        {action.available ? name : t('m7Direct.plan.unavailable', { action: name })}
                      </option>
                    );
                  })}
                </select>
              </label>
              {definition && (
                <>
                  <p>{t(definition.descriptionKey as MessageKey)}</p>
                  <p>
                    {t('m7Direct.plan.base', {
                      body: signed(definition.bodyDelta),
                      preparation: signed(definition.preparationDelta),
                      confidence: signed(definition.confidenceDelta),
                    })}
                  </p>
                </>
              )}
              {proficiency ? (
                <>
                  <p>
                    {t('m7Direct.plan.proficiency', {
                      level: proficiency.level,
                      uses: proficiency.uses,
                      multiplier: multiplier(proficiency.xpMultiplierPermille),
                    })}
                  </p>
                  <p>
                    {proficiency.nextThreshold === null
                      ? t('m7Ui.week.proficiencyMax')
                      : t('m7Direct.plan.next', {
                          threshold: proficiency.nextThreshold,
                          remaining: proficiency.usesToNextLevel!,
                          multiplier: multiplier(proficiency.nextXpMultiplierPermille!),
                        })}
                  </p>
                </>
              ) : (
                choice && <p>{t('m7Direct.plan.noProficiency')}</p>
              )}
            </fieldset>
          );
        })}
      </div>
      {prepared === null ? (
        <p role="status">
          {t(
            selected.some((id) => id === '') && projection !== null
              ? 'm7Direct.plan.incomplete'
              : 'm7Direct.plan.blocked',
          )}
        </p>
      ) : (
        <section aria-labelledby="position-focus-forecast">
          <h3 id="position-focus-forecast">{t('m7Direct.plan.forecast')}</h3>
          <ul>
            {(Object.keys(STATE_LABELS) as (keyof typeof STATE_LABELS)[]).map((state) => (
              <li key={state}>
                {t('m7Direct.plan.change', {
                  label: t(STATE_LABELS[state]),
                  before: number(session.player.state[state]),
                  after: number(prepared.player.state[state]),
                })}
              </li>
            ))}
          </ul>
          <p>{t('m7Direct.plan.practice', { score: prepared.practiceGrade.score })}</p>
          <p>
            {t('m7Direct.plan.factors', {
              base: prepared.practiceGrade.baseScore,
              focus: signed(prepared.practiceGrade.focusImpact),
              body: signed(prepared.practiceGrade.bodyContribution),
              preparation: signed(prepared.practiceGrade.preparationContribution),
              confidence: signed(prepared.practiceGrade.confidenceContribution),
            })}
          </p>
          <p>
            {t('m7Direct.plan.change', {
              label: t('m7Ui.team.depth'),
              before: session.room.projection.rank,
              after: prepared.room.projection.rank,
            })}
          </p>
          <p>
            {t('m7Direct.plan.opportunities', {
              count: prepared.opportunity.projectedOpportunities,
            })}
          </p>
          <details>
            <summary>{t('m7Direct.plan.details')}</summary>
            {prepared.trainingEvidence.map((evidence, index) => (
              <article key={index}>
                <h4>
                  {t(ACTIONS.find(({ id }) => id === evidence.actionId)!.nameKey as MessageKey)}
                </h4>
                <p>
                  {t('m7Direct.plan.change', {
                    label: t('career.player.body'),
                    before: evidence.bodyBefore,
                    after: evidence.bodyAfter,
                  })}
                </p>
                {evidence.attributeXp.map((xp) => (
                  <p key={xp.attributeId}>
                    {t(
                      projectAttributeProgress({ rating: xp.ratingAfter, xp: xp.xpAfter })
                        .nextRating === null
                        ? 'm7Direct.plan.xpCapped'
                        : 'm7Direct.plan.xp',
                      {
                        attribute: t(ATTRIBUTE_KEYS[xp.attributeId]!),
                        xp: xp.appliedXp,
                        ratingBefore: xp.ratingBefore,
                        ratingAfter: xp.ratingAfter,
                        progress: xp.xpAfter,
                        required: ATTRIBUTE_XP_PER_RATING,
                      },
                    )}
                  </p>
                ))}
              </article>
            ))}
          </details>
        </section>
      )}
      <button
        type="button"
        className="primary-action"
        disabled={blocked || prepared === null}
        onClick={() => onCommit([...selected])}
      >
        {t('career.week.commit')}
      </button>
    </section>
  );
}
