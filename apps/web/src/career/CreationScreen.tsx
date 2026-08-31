import { useState } from 'react';
import type { PlayerAppearance } from '@project-saturday/game-core';
import {
  appearanceCatalog,
  creationContent,
  wrBodyMeasurementOptions,
} from '@project-saturday/game-content/content';
import type { MessageKey, SupportedLocale } from '@project-saturday/game-content/locales';

import { useAppTranslation } from '../i18n/i18n';
import {
  APPEARANCE_FIELD_ORDER,
  canAddPersonalityTrait,
  createDefaultCreationDraft,
  togglePersonalityTrait,
  type CreationDraft,
  type CreationUiIssueCode,
} from './career-ui';
import {
  feetInchesToHeightCm,
  heightCmToFeetInches,
  poundsToWeightKg,
  weightKgToPounds,
} from './units';

const CREATION_ISSUE_KEYS = {
  'creation-ui.invalid-body': 'career.creation.errors.body',
  'creation-ui.invalid-name': 'career.creation.errors.name',
  'creation-ui.invalid-personalities': 'career.creation.errors.personalities',
  'creation-ui.mechanics-failed': 'career.creation.errors.mechanics',
  'creation-ui.player-failed': 'career.creation.errors.player',
} as const satisfies Readonly<Record<CreationUiIssueCode, MessageKey>>;

export interface CreationScreenProps {
  readonly busy: boolean;
  readonly issues: readonly CreationUiIssueCode[];
  readonly locale: SupportedLocale;
  readonly onCreate: (draft: CreationDraft) => void;
}

interface ImperialHeightFieldsProps {
  readonly heightCm: number;
  readonly onHeightCmChange: (heightCm: number) => void;
}

function ImperialHeightFields({
  heightCm,
  onHeightCmChange,
}: ImperialHeightFieldsProps): React.JSX.Element {
  const { t } = useAppTranslation('en-US');
  const initialHeight = heightCmToFeetInches(heightCm);
  const [feetInput, setFeetInput] = useState(
    Number.isFinite(initialHeight.feet) ? String(initialHeight.feet) : '',
  );
  const [inchesInput, setInchesInput] = useState(
    Number.isFinite(initialHeight.inches) ? String(initialHeight.inches) : '',
  );

  function updateHeight(feet: string, inches: string): void {
    const parsedFeet = Number(feet);
    const parsedInches = Number(inches);
    onHeightCmChange(
      feet.length > 0 &&
        inches.length > 0 &&
        Number.isInteger(parsedFeet) &&
        Number.isInteger(parsedInches)
        ? feetInchesToHeightCm(parsedFeet, parsedInches)
        : Number.NaN,
    );
  }

  return (
    <fieldset className="measurement-fieldset">
      <legend>{t('career.creation.heightImperial')}</legend>
      <label>
        <span>{t('career.units.feet')}</span>
        <input
          data-testid="creation-height-feet"
          inputMode="numeric"
          max={7}
          min={4}
          type="number"
          value={feetInput}
          onChange={(event) => {
            const feet = event.currentTarget.value;
            setFeetInput(feet);
            updateHeight(feet, inchesInput);
          }}
        />
      </label>
      <label>
        <span>{t('career.units.inches')}</span>
        <input
          data-testid="creation-height-inches"
          inputMode="numeric"
          max={11}
          min={0}
          type="number"
          value={inchesInput}
          onChange={(event) => {
            const inches = event.currentTarget.value;
            setInchesInput(inches);
            updateHeight(feetInput, inches);
          }}
        />
      </label>
    </fieldset>
  );
}

interface ImperialWeightFieldProps {
  readonly onWeightKgChange: (weightKg: number) => void;
  readonly weightKg: number;
}

function ImperialWeightField({
  onWeightKgChange,
  weightKg,
}: ImperialWeightFieldProps): React.JSX.Element {
  const { t } = useAppTranslation('en-US');
  const initialWeightLb = weightKgToPounds(weightKg);
  const [weightInput, setWeightInput] = useState(
    Number.isFinite(initialWeightLb) ? String(initialWeightLb) : '',
  );

  return (
    <label className="measurement-field">
      <span>{t('career.creation.weightImperial')}</span>
      <input
        data-testid="creation-weight-lb"
        inputMode="numeric"
        max={weightKgToPounds(wrBodyMeasurementOptions.weightKg.max)}
        min={weightKgToPounds(wrBodyMeasurementOptions.weightKg.min)}
        step={1}
        type="number"
        value={weightInput}
        onChange={(event) => {
          const pounds = event.currentTarget.value;
          setWeightInput(pounds);
          const parsedPounds = Number(pounds);
          onWeightKgChange(
            pounds.length > 0 && Number.isFinite(parsedPounds)
              ? poundsToWeightKg(parsedPounds)
              : Number.NaN,
          );
        }}
      />
    </label>
  );
}

export function CreationScreen({
  busy,
  issues,
  locale,
  onCreate,
}: CreationScreenProps): React.JSX.Element {
  const { t } = useAppTranslation(locale);
  const [draft, setDraft] = useState<CreationDraft>(createDefaultCreationDraft);

  function updateAppearance(field: keyof PlayerAppearance, serializedId: string): void {
    const category = appearanceCatalog[field];
    const selected = category.options.find(({ id }) => String(id ?? '') === serializedId);
    if (selected === undefined) {
      return;
    }
    setDraft((current) => ({
      ...current,
      appearance: { ...current.appearance, [field]: selected.id } as PlayerAppearance,
    }));
  }

  return (
    <main className="creation-layout" data-testid="creation-screen">
      <section className="creation-intro" aria-labelledby="creation-title">
        <p className="eyebrow">{t('career.creation.eyebrow')}</p>
        <h1 id="creation-title">{t('career.creation.title')}</h1>
        <p>{t('career.creation.intro')}</p>
      </section>

      <form
        className="creation-form"
        data-testid="creation-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onCreate(draft);
        }}
      >
        {issues.length > 0 && (
          <div className="form-alert" role="alert" data-testid="creation-errors">
            <p>{t('career.creation.errors.heading')}</p>
            <ul>
              {issues.map((issue) => (
                <li key={issue}>{t(CREATION_ISSUE_KEYS[issue])}</li>
              ))}
            </ul>
          </div>
        )}

        <section className="form-section" aria-labelledby="identity-heading">
          <div className="section-heading">
            <p className="step-mark">{t('career.creation.steps.identity')}</p>
            <h2 id="identity-heading">{t('career.creation.identity.title')}</h2>
          </div>

          <label className="field-label" htmlFor="player-display-name">
            {t('career.creation.displayName')}
          </label>
          <input
            id="player-display-name"
            className="text-input"
            data-testid="creation-name"
            maxLength={40}
            name="displayName"
            required
            type="text"
            value={draft.displayName}
            onChange={(event) => {
              const displayName = event.currentTarget.value;
              setDraft((current) => ({ ...current, displayName }));
            }}
          />

          <fieldset className="choice-fieldset">
            <legend>{t('career.creation.archetype')}</legend>
            <div className="choice-grid">
              {creationContent.wrArchetypes.map((archetype) => (
                <label className="choice-card" key={archetype.id}>
                  <input
                    checked={draft.archetypeId === archetype.id}
                    name="archetype"
                    type="radio"
                    value={archetype.id}
                    onChange={() =>
                      setDraft((current) => ({ ...current, archetypeId: archetype.id }))
                    }
                  />
                  <span className="choice-card__copy">
                    <strong>{t(archetype.nameKey)}</strong>
                    <small>{t(archetype.descriptionKey)}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="choice-fieldset">
            <legend>{t('career.creation.background')}</legend>
            <div className="choice-grid">
              {creationContent.recruitingBackgrounds.map((background) => (
                <label className="choice-card" key={background.id}>
                  <input
                    checked={draft.recruitingBackgroundId === background.id}
                    name="background"
                    type="radio"
                    value={background.id}
                    onChange={() =>
                      setDraft((current) => ({
                        ...current,
                        recruitingBackgroundId: background.id,
                      }))
                    }
                  />
                  <span className="choice-card__copy">
                    <strong>{t(background.nameKey)}</strong>
                    <small>{t(background.descriptionKey)}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="choice-fieldset" aria-describedby="personality-help">
            <legend>{t('career.creation.personality')}</legend>
            <p id="personality-help" className="field-help">
              {t('career.creation.personalityHelp')}
            </p>
            <p className="selection-count" aria-live="polite">
              {t('career.creation.personalityCount', {
                count: draft.personalityTraitIds.length,
                total: 2,
              })}
            </p>
            <div className="choice-grid choice-grid--compact">
              {creationContent.personalityTraits.map((trait) => {
                const selected = draft.personalityTraitIds.includes(trait.id);
                const available = canAddPersonalityTrait(draft.personalityTraitIds, trait.id);
                return (
                  <label className="choice-card" key={trait.id}>
                    <input
                      checked={selected}
                      disabled={!selected && !available}
                      name="personality"
                      type="checkbox"
                      value={trait.id}
                      onChange={() =>
                        setDraft((current) => ({
                          ...current,
                          personalityTraitIds: togglePersonalityTrait(
                            current.personalityTraitIds,
                            trait.id,
                          ),
                        }))
                      }
                    />
                    <span className="choice-card__copy">
                      <strong>{t(trait.nameKey)}</strong>
                      <small>{t(trait.descriptionKey)}</small>
                      {!selected && !available && (
                        <em>{t('career.creation.personalityUnavailable')}</em>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </section>

        <section className="form-section" aria-labelledby="appearance-heading">
          <div className="section-heading">
            <p className="step-mark">{t('career.creation.steps.appearance')}</p>
            <h2 id="appearance-heading">{t('career.creation.appearance.title')}</h2>
            <p>{t('career.creation.appearance.help')}</p>
          </div>
          <div className="select-grid">
            {APPEARANCE_FIELD_ORDER.map((field) => {
              const category = appearanceCatalog[field];
              return (
                <label className="select-field" key={field}>
                  <span>{t(category.labelKey)}</span>
                  <select
                    value={String(draft.appearance[field] ?? '')}
                    onChange={(event) => updateAppearance(field, event.currentTarget.value)}
                  >
                    {category.options.map((option) => (
                      <option key={option.id ?? `${field}-none`} value={option.id ?? ''}>
                        {t(option.nameKey)}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        </section>

        <section className="form-section" aria-labelledby="body-heading">
          <div className="section-heading">
            <p className="step-mark">{t('career.creation.steps.body')}</p>
            <h2 id="body-heading">{t('career.creation.body.title')}</h2>
            <p>{t('career.creation.body.help')}</p>
          </div>

          <div className="measurement-grid">
            {locale === 'en-US' ? (
              <ImperialHeightFields
                heightCm={draft.heightCm}
                onHeightCmChange={(heightCm) => setDraft((current) => ({ ...current, heightCm }))}
              />
            ) : (
              <label className="measurement-field">
                <span>{t('career.creation.heightMetric')}</span>
                <input
                  data-testid="creation-height-cm"
                  inputMode="numeric"
                  max={wrBodyMeasurementOptions.heightCm.max}
                  min={wrBodyMeasurementOptions.heightCm.min}
                  step={wrBodyMeasurementOptions.heightCm.step}
                  type="number"
                  value={Number.isFinite(draft.heightCm) ? draft.heightCm : ''}
                  onChange={(event) => {
                    const heightCm = event.currentTarget.valueAsNumber;
                    setDraft((current) => ({ ...current, heightCm }));
                  }}
                />
              </label>
            )}

            {locale === 'en-US' ? (
              <ImperialWeightField
                weightKg={draft.weightKg}
                onWeightKgChange={(weightKg) => setDraft((current) => ({ ...current, weightKg }))}
              />
            ) : (
              <label className="measurement-field">
                <span>{t('career.creation.weightMetric')}</span>
                <input
                  data-testid="creation-weight-kg"
                  inputMode="numeric"
                  max={wrBodyMeasurementOptions.weightKg.max}
                  min={wrBodyMeasurementOptions.weightKg.min}
                  step={1}
                  type="number"
                  value={Number.isFinite(draft.weightKg) ? draft.weightKg : ''}
                  onChange={(event) => {
                    const weightKg = event.currentTarget.valueAsNumber;
                    setDraft((current) => ({ ...current, weightKg }));
                  }}
                />
              </label>
            )}
          </div>
        </section>

        <button
          className="primary-action"
          data-testid="creation-submit"
          disabled={busy}
          type="submit"
        >
          {busy ? t('career.creation.creating') : t('career.creation.submit')}
        </button>
      </form>
    </main>
  );
}
