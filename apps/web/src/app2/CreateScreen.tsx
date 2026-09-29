import { useMemo, useState } from 'react';
import {
  createPositionPlayerProfile,
  type PersonalityTraitId,
  type PlayerAppearance,
  type PositionPlayerCreationIdentity,
  type RecruitingBackgroundId,
  type VNextPositionId,
} from '@project-saturday/game-core';
import { defaultWrAppearance } from '@project-saturday/game-content';
import { buildCareerVNextMechanics } from '@project-saturday/game-content/content';

import { AthletePortrait } from '../career/AthletePortrait';
import { PORTRAIT } from './theme';
import { useAppTranslation, type AppTranslate } from '../i18n/i18n';
import {
  POSITION_ABBR_KEYS,
  POSITION_NAME_KEYS,
  VNEXT_POSITIONS,
  appearanceCatalog,
  archetypeModifiers,
  archetypesFor,
  attributeNameKey,
  backgroundModifiers,
  backgrounds,
  key,
  traits,
} from './content';

const LOOK_FIELDS = ['skinToneId', 'faceId', 'hairStyleId', 'hairColorId', 'bodyTypeId'] as const;
const EXTRA_FIELDS = [
  'eyeBlackId',
  'armSleevesId',
  'glovesId',
  'visorId',
  'towelId',
  'wristTapeId',
  'jerseyFitId',
  'footwearId',
] as const;

interface Draft {
  readonly positionId: VNextPositionId;
  readonly archetypeId: string;
  readonly backgroundId: RecruitingBackgroundId;
  readonly traitIds: readonly PersonalityTraitId[];
  readonly appearance: PlayerAppearance;
  readonly displayName: string;
  readonly heightCm: number;
  readonly weightKg: number;
}

function trade(
  t: AppTranslate,
  modifiers: readonly { readonly attributeId: string; readonly delta: number }[],
): React.JSX.Element {
  const ups = modifiers.filter(({ delta }) => delta > 0);
  const downs = modifiers.filter(({ delta }) => delta < 0);
  return (
    <span className="s2-trade">
      {ups.length > 0 && (
        <span className="s2-up">
          + {ups.map(({ attributeId }) => t(attributeNameKey(attributeId))).join(' · ')}
        </span>
      )}
      {ups.length > 0 && downs.length > 0 && ' '}
      {downs.length > 0 && (
        <span className="s2-down">
          − {downs.map(({ attributeId }) => t(attributeNameKey(attributeId))).join(' · ')}
        </span>
      )}
    </span>
  );
}

function identityOf(draft: Draft, fallbackName: string): PositionPlayerCreationIdentity {
  return {
    displayName: draft.displayName.trim() === '' ? fallbackName : draft.displayName.trim(),
    positionId: draft.positionId,
    archetypeId: draft.archetypeId,
    recruitingBackgroundId: draft.backgroundId,
    personalityTraitIds: [draft.traitIds[0]!, draft.traitIds[1]!],
    appearance: draft.appearance,
    heightCm: draft.heightCm,
    weightKg: draft.weightKg,
  } as PositionPlayerCreationIdentity;
}

export function CreateScreen({
  blocked,
  onCreate,
}: {
  readonly blocked: boolean;
  readonly onCreate: (identity: PositionPlayerCreationIdentity) => void;
}): React.JSX.Element {
  const { i18n, t } = useAppTranslation();
  const imperial = i18n.resolvedLanguage === 'en-US';
  const [step, setStep] = useState(0);
  const [showExtras, setShowExtras] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    positionId: 'position_qb',
    archetypeId: archetypesFor('position_qb')[0]!.id,
    backgroundId: backgrounds[0]!.id,
    traitIds: [],
    appearance: defaultWrAppearance,
    displayName: '',
    heightCm: 188,
    weightKg: 95,
  });
  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  const fallbackName = t('v2.create.defaultName');
  const preview = useMemo(() => {
    if (draft.traitIds.length !== 2) return null;
    const identity = identityOf(draft, fallbackName);
    const mechanics = buildCareerVNextMechanics(identity);
    if (mechanics === null) return null;
    const created = createPositionPlayerProfile({
      careerSeed: 'preview',
      identity,
      mechanics: mechanics.creation,
    });
    return created.ok ? created.player : null;
  }, [draft, fallbackName]);
  const archetypes = archetypesFor(draft.positionId);
  const archetype = archetypes.find(({ id }) => id === draft.archetypeId) ?? archetypes[0]!;
  const headline = [...archetype.priorityAttributeIds];
  const canFinish = draft.traitIds.length === 2 && preview !== null;
  const steps = [t('v2.create.stepRole'), t('v2.create.stepStory'), t('v2.create.stepLook')];
  const feet = Math.floor(draft.heightCm / 30.48);
  const inches = Math.round((draft.heightCm / 2.54) % 12);
  const pounds = Math.round(draft.weightKg * 2.2046);

  function toggleTrait(id: PersonalityTraitId): void {
    if (draft.traitIds.includes(id))
      update({ traitIds: draft.traitIds.filter((value) => value !== id) });
    else if (draft.traitIds.length < 2) update({ traitIds: [...draft.traitIds, id] });
  }
  function incompatible(id: PersonalityTraitId): boolean {
    const trait = traits.find((entry) => entry.id === id)!;
    return draft.traitIds.some(
      (selected) =>
        selected !== id &&
        ((trait.incompatibleTraitIds as readonly string[]).includes(selected) ||
          (
            traits.find((entry) => entry.id === selected)!.incompatibleTraitIds as readonly string[]
          ).includes(id)),
    );
  }

  const card = (
    <aside aria-label={t('v2.create.cardLabel')} className="s2-playercard s2-cardpreview">
      <div className="s2-playercard__top">
        <div>
          <p className="s2-display s2-playercard__ovr s2-num">{preview?.overall ?? '—'}</p>
          <p className="s2-eyebrow">{t('v2.create.overall')}</p>
        </div>
        <p className="s2-display s2-playercard__pos">{t(POSITION_ABBR_KEYS[draft.positionId])}</p>
      </div>
      <AthletePortrait
        appearance={draft.appearance}
        label={t('v2.player.portrait', { name: draft.displayName || fallbackName })}
        size={PORTRAIT.profile}
      />
      <p className="s2-display s2-playercard__name">{draft.displayName || fallbackName}</p>
      <p className="s2-note">
        {t(key(archetype.nameKey))} ·{' '}
        {t(key(backgrounds.find(({ id }) => id === draft.backgroundId)!.nameKey))}
      </p>
      {preview !== null && (
        <div className="s2-ratings">
          {headline.map((attributeId) => (
            <div key={attributeId}>
              <span>{t(attributeNameKey(attributeId))}</span>
              <strong className="s2-num">
                {(preview.attributes as unknown as Record<string, { rating: number }>)[attributeId]
                  ?.rating ?? '—'}
              </strong>
            </div>
          ))}
        </div>
      )}
    </aside>
  );

  return (
    <div className="s2-create">
      {card}
      <section aria-labelledby="s2-create-title" className="s2-stack">
        <div>
          <p className="s2-eyebrow">{t('v2.create.eyebrow')}</p>
          <h1 className="s2-display s2-size-h1" id="s2-create-title">
            {steps[step]}
          </h1>
        </div>
        <div aria-hidden="true" className="s2-steps">
          {steps.map((label, index) => (
            <span data-done={index <= step} key={label} />
          ))}
        </div>

        {step === 0 && (
          <>
            <fieldset className="s2-stack" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="s2-eyebrow">{t('v2.create.position')}</legend>
              <div className="s2-tiles s2-tiles--3">
                {VNEXT_POSITIONS.map((positionId) => (
                  <button
                    aria-pressed={draft.positionId === positionId}
                    className="s2-tile"
                    key={positionId}
                    onClick={() =>
                      update({ positionId, archetypeId: archetypesFor(positionId)[0]!.id })
                    }
                    type="button"
                  >
                    <span className="s2-tile__name">{t(POSITION_NAME_KEYS[positionId])}</span>
                    <span className="s2-tile__desc">
                      {t(key(`v2.position.${positionId.slice(9)}.pitch`))}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="s2-stack" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="s2-eyebrow">{t('v2.create.archetype')}</legend>
              <div className="s2-tiles s2-tiles--3">
                {archetypes.map((entry) => (
                  <button
                    aria-pressed={draft.archetypeId === entry.id}
                    className="s2-tile"
                    key={entry.id}
                    onClick={() => update({ archetypeId: entry.id })}
                    type="button"
                  >
                    <span className="s2-tile__name">{t(key(entry.nameKey))}</span>
                    <span className="s2-tile__desc">{t(key(entry.descriptionKey))}</span>
                    {trade(t, archetypeModifiers(entry.id))}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}

        {step === 1 && (
          <>
            <fieldset className="s2-stack" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="s2-eyebrow">{t('v2.create.background')}</legend>
              <div className="s2-tiles s2-tiles--2">
                {backgrounds.map((entry) => (
                  <button
                    aria-pressed={draft.backgroundId === entry.id}
                    className="s2-tile"
                    key={entry.id}
                    onClick={() => update({ backgroundId: entry.id })}
                    type="button"
                  >
                    <span className="s2-tile__name">{t(key(entry.nameKey))}</span>
                    {trade(t, backgroundModifiers(draft.positionId, entry.id))}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="s2-stack" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="s2-eyebrow">
                {t('v2.create.traits', { count: draft.traitIds.length })}
              </legend>
              <div className="s2-tiles s2-tiles--2">
                {traits.map((entry) => {
                  const selected = draft.traitIds.includes(entry.id);
                  return (
                    <button
                      aria-checked={selected}
                      className="s2-tile"
                      disabled={!selected && (draft.traitIds.length >= 2 || incompatible(entry.id))}
                      key={entry.id}
                      onClick={() => toggleTrait(entry.id)}
                      role="checkbox"
                      type="button"
                    >
                      <span className="s2-tile__name">{t(key(entry.nameKey))}</span>
                      <span className="s2-tile__desc">{t(key(entry.descriptionKey))}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </>
        )}

        {step === 2 && (
          <>
            <div className="s2-field">
              <label htmlFor="s2-name">{t('v2.create.name')}</label>
              <input
                autoComplete="off"
                className="s2-input"
                id="s2-name"
                maxLength={40}
                onChange={(event) => update({ displayName: event.target.value })}
                placeholder={fallbackName}
                value={draft.displayName}
              />
            </div>
            {[...LOOK_FIELDS, ...(showExtras ? EXTRA_FIELDS : [])].map((field) => {
              const spec = appearanceCatalog[field];
              return (
                <div className="s2-field" key={field}>
                  <span className="s2-eyebrow">{t(key(spec.labelKey))}</span>
                  <div className="s2-swatches" role="group" aria-label={t(key(spec.labelKey))}>
                    {spec.options.map((option) => {
                      const value = option.id;
                      return (
                        <button
                          aria-pressed={draft.appearance[field] === value}
                          className="s2-swatch"
                          key={option.id ?? 'none'}
                          onClick={() =>
                            update({ appearance: { ...draft.appearance, [field]: value } })
                          }
                          type="button"
                        >
                          {t(key(option.nameKey))}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <button
              className="s2-btn s2-btn--ghost"
              onClick={() => setShowExtras(!showExtras)}
              type="button"
            >
              {t(showExtras ? 'v2.create.fewerLook' : 'v2.create.moreLook')}
            </button>
            <div className="s2-row">
              {imperial ? (
                <>
                  <div className="s2-field">
                    <label htmlFor="s2-ft">{t('v2.create.heightFeet')}</label>
                    <input
                      className="s2-input"
                      id="s2-ft"
                      inputMode="numeric"
                      max={7}
                      min={5}
                      onChange={(event) =>
                        update({
                          heightCm: Math.round((Number(event.target.value) * 12 + inches) * 2.54),
                        })
                      }
                      type="number"
                      value={feet}
                    />
                  </div>
                  <div className="s2-field">
                    <label htmlFor="s2-in">{t('v2.create.heightInches')}</label>
                    <input
                      className="s2-input"
                      id="s2-in"
                      inputMode="numeric"
                      max={11}
                      min={0}
                      onChange={(event) =>
                        update({
                          heightCm: Math.round((feet * 12 + Number(event.target.value)) * 2.54),
                        })
                      }
                      type="number"
                      value={inches}
                    />
                  </div>
                  <div className="s2-field">
                    <label htmlFor="s2-lb">{t('v2.create.weightPounds')}</label>
                    <input
                      className="s2-input"
                      id="s2-lb"
                      inputMode="numeric"
                      onChange={(event) =>
                        update({ weightKg: Math.round(Number(event.target.value) / 2.2046) })
                      }
                      type="number"
                      value={pounds}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="s2-field">
                    <label htmlFor="s2-cm">{t('v2.create.heightCm')}</label>
                    <input
                      className="s2-input"
                      id="s2-cm"
                      inputMode="numeric"
                      max={215}
                      min={150}
                      onChange={(event) =>
                        update({ heightCm: Math.round(Number(event.target.value)) })
                      }
                      type="number"
                      value={draft.heightCm}
                    />
                  </div>
                  <div className="s2-field">
                    <label htmlFor="s2-kg">{t('v2.create.weightKg')}</label>
                    <input
                      className="s2-input"
                      id="s2-kg"
                      inputMode="numeric"
                      max={150}
                      min={55}
                      onChange={(event) =>
                        update({ weightKg: Math.round(Number(event.target.value)) })
                      }
                      type="number"
                      value={draft.weightKg}
                    />
                  </div>
                </>
              )}
            </div>
          </>
        )}

        <div className="s2-actionbar">
          <div className="s2-actionbar__inner">
            {step === 1 && draft.traitIds.length !== 2 && (
              <p className="s2-actionbar__hint">{t('v2.create.traitsHint')}</p>
            )}
            <div className="s2-row" style={{ flexWrap: 'nowrap' }}>
              {step > 0 && (
                <button
                  className="s2-btn s2-btn--ghost"
                  onClick={() => setStep(step - 1)}
                  type="button"
                >
                  {t('v2.common.back')}
                </button>
              )}
              {step < 2 ? (
                <button
                  className="s2-btn s2-btn--block"
                  disabled={step === 1 && draft.traitIds.length !== 2}
                  onClick={() => setStep(step + 1)}
                  type="button"
                >
                  {t('v2.common.next')}
                </button>
              ) : (
                <button
                  className="s2-btn s2-btn--block"
                  disabled={!canFinish || blocked}
                  onClick={() => onCreate(identityOf(draft, fallbackName))}
                  type="button"
                >
                  {t('v2.create.finish')}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
