import { useMemo, useState } from 'react';
import {
  createPositionPlayerProfile,
  type AthleteNameTokensVNext,
  type PersonalityTraitId,
  type PlayerAppearance,
  type PositionPlayerCreationIdentity,
  type RecruitingBackgroundId,
  type VNextPositionId,
} from '@project-saturday/game-core';
import { defaultWrAppearance } from '@project-saturday/game-content';
import { buildCareerVNextMechanics } from '@project-saturday/game-content/content';

import { TradingCard } from './TradingCard';
import { PositionGlyph } from './ui';
import { useAppTranslation, type AppTranslate } from '../i18n/i18n';
import { usePreferences } from './preferences';
import {
  POSITION_ABBR_KEYS,
  POSITION_NAME_KEYS,
  POSITION_PITCH_KEYS,
  VNEXT_POSITIONS,
  appearanceCatalog,
  archetypeModifiers,
  archetypesFor,
  generatedName,
  namePreview,
  attributeNameKey,
  backgroundModifiers,
  backgrounds,
  imperialMeasure,
  key,
  traits,
  positionOverall,
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

/** Nothing is chosen for the player: position, style, background and name start empty. */
interface Draft {
  readonly positionId: VNextPositionId | null;
  readonly archetypeId: string | null;
  readonly backgroundId: RecruitingBackgroundId | null;
  readonly traitIds: readonly PersonalityTraitId[];
  readonly appearance: PlayerAppearance;
  readonly displayName: string;
  /** Set when the name is a suggestion; it then follows the language. Typing clears it. */
  readonly nameTokens: AthleteNameTokensVNext | null;
  readonly heightCm: number;
  readonly weightKg: number;
}

type CompleteDraft = Draft & {
  readonly positionId: VNextPositionId;
  readonly archetypeId: string;
  readonly backgroundId: RecruitingBackgroundId;
};

function complete(draft: Draft): draft is CompleteDraft {
  return (
    draft.positionId !== null &&
    draft.archetypeId !== null &&
    draft.backgroundId !== null &&
    draft.traitIds.length === 2
  );
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

function identityOf(draft: CompleteDraft, name: string): PositionPlayerCreationIdentity {
  return {
    displayName: name,
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
  readonly onCreate: (
    identity: PositionPlayerCreationIdentity,
    nameTokens: AthleteNameTokensVNext | null,
  ) => void;
}): React.JSX.Element {
  const { t } = useAppTranslation();
  const imperial = usePreferences().units === 'imperial';
  const [step, setStep] = useState(0);
  const [showExtras, setShowExtras] = useState(false);
  const [suggestion, setSuggestion] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    positionId: null,
    archetypeId: null,
    backgroundId: null,
    traitIds: [],
    appearance: defaultWrAppearance,
    displayName: '',
    nameTokens: null,
    heightCm: 188,
    weightKg: 95,
  });
  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  // A suggested name is shown (and saved) in the current language.
  const name =
    draft.nameTokens === null ? draft.displayName.trim() : namePreview(t, draft.nameTokens);
  const preview = useMemo(() => {
    if (!complete(draft)) return null;
    const identity = identityOf(draft, 'Preview');
    const mechanics = buildCareerVNextMechanics(identity);
    if (mechanics === null) return null;
    const created = createPositionPlayerProfile({
      careerSeed: 'preview',
      identity,
      mechanics: mechanics.creation,
    });
    return created.ok ? created.player : null;
  }, [draft]);
  const archetypes = draft.positionId === null ? [] : archetypesFor(draft.positionId);
  const archetype = archetypes.find(({ id }) => id === draft.archetypeId) ?? null;
  const headline = archetype === null ? [] : [...archetype.priorityAttributeIds];
  const roleDone = draft.positionId !== null && draft.archetypeId !== null;
  const storyDone = draft.backgroundId !== null && draft.traitIds.length === 2;
  const canFinish = complete(draft) && preview !== null && name !== '';
  function suggestName(): void {
    update({ nameTokens: generatedName(suggestion), displayName: '' });
    setSuggestion(suggestion + 1);
  }
  const steps = [t('v2.create.stepRole'), t('v2.create.stepStory'), t('v2.create.stepLook')];
  // One conversion for creation and Profile (a stored 152 cm reads 5′0″, never 4′12″).
  const { feet, inches, pounds } = imperialMeasure(draft.heightCm, draft.weightKg);

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
    <TradingCard
      appearance={draft.appearance}
      ariaLabel={t('v2.create.cardLabel')}
      backgroundId={draft.backgroundId}
      className="s2-cardpreview"
      name={name}
      overall={preview === null ? null : positionOverall(preview)}
      overallLabel={t('v2.create.overall')}
      positionId={draft.positionId}
      ratings={
        preview === null
          ? []
          : headline.map((attributeId) => ({
              label: t(attributeNameKey(attributeId)),
              value:
                (preview.attributes as unknown as Record<string, { rating: number }>)[attributeId]
                  ?.rating ?? 0,
            }))
      }
      styleKey={archetype?.nameKey ?? null}
    />
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
                    className="s2-tile s2-tile--position"
                    data-position={positionId.slice('position_'.length)}
                    key={positionId}
                    onClick={() =>
                      draft.positionId !== positionId && update({ positionId, archetypeId: null })
                    }
                    type="button"
                  >
                    <PositionGlyph positionId={positionId} />
                    <span className="s2-tile__abbr s2-display">
                      {t(POSITION_ABBR_KEYS[positionId])}
                    </span>
                    <span className="s2-tile__name">{t(POSITION_NAME_KEYS[positionId])}</span>
                    <span className="s2-tile__desc">{t(POSITION_PITCH_KEYS[positionId])}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            {draft.positionId !== null && (
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
            )}
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
                    {draft.positionId !== null &&
                      trade(t, backgroundModifiers(draft.positionId, entry.id))}
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
              <div className="s2-namefield">
                <input
                  aria-describedby="s2-name-help"
                  autoComplete="off"
                  className="s2-input"
                  id="s2-name"
                  maxLength={40}
                  onChange={(event) =>
                    update({ displayName: event.target.value, nameTokens: null })
                  }
                  placeholder={t('v2.create.namePlaceholder')}
                  value={draft.nameTokens === null ? draft.displayName : name}
                />
                <button className="s2-btn s2-btn--ghost" onClick={suggestName} type="button">
                  {t('v2.create.suggestName')}
                </button>
              </div>
              <p className="s2-note" id="s2-name-help">
                {t('v2.create.suggestHelp')}
              </p>
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
            {((step === 0 && !roleDone) ||
              (step === 1 && !storyDone) ||
              (step === 2 && name === '')) && (
              <p className="s2-actionbar__hint">
                {t(
                  step === 0
                    ? 'v2.create.roleHint'
                    : step === 1
                      ? 'v2.create.storyHint'
                      : 'v2.create.nameHint',
                )}
              </p>
            )}
            <div className="s2-actionbar__buttons">
              {step > 0 && (
                <button
                  className="s2-btn s2-btn--ghost s2-btn--back"
                  onClick={() => setStep(step - 1)}
                  type="button"
                >
                  {t('v2.common.back')}
                </button>
              )}
              {step < 2 ? (
                <button
                  className="s2-btn s2-btn--block"
                  disabled={step === 0 ? !roleDone : !storyDone}
                  onClick={() => setStep(step + 1)}
                  type="button"
                >
                  {t('v2.common.next')}
                </button>
              ) : (
                <button
                  className="s2-btn s2-btn--block"
                  disabled={!canFinish || blocked}
                  onClick={() =>
                    complete(draft) && onCreate(identityOf(draft, name), draft.nameTokens)
                  }
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
