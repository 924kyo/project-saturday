import { useMemo, useState } from 'react';
import {
  applyAllocationVNext,
  createPositionPlayerProfile,
  type AllocationVNext,
  type AlumniVNext,
  type LegacyPerkIdVNext,
  type LegacyStoreVNext,
  type AthleteNameTokensVNext,
  type DepthRoleId,
  type HomeRegionIdVNext,
  type PersonalityTraitId,
  type PlayerAppearance,
  type PositionPlayerCreationIdentity,
  type RecruitingBackgroundId,
  type VNextPositionId,
} from '@project-saturday/game-core';
import { defaultWrAppearance } from '@project-saturday/game-content';
import {
  appearanceCatalogVNext,
  buildCareerVNextMechanics,
} from '@project-saturday/game-content/content';

import { FullBodyFigure } from '../career/FullBodyFigure';
import { CreateBuild } from './CreateBuild';
import { LegacyPerks } from './Legacy';
import { NO_LEGACY_CHOICES, type LegacyChoices } from './legacy-choices';

const NO_ALUMNI: readonly AlumniVNext[] = [];
import { PotentialCurve } from './Development';
import { nextNameCursor } from './name-cursor';
import { TradingCard } from './TradingCard';
import { PositionGlyph } from './ui';
import { useAppTranslation, type AppTranslate } from '../i18n/i18n';
import { usePreferences } from './preferences';
import {
  POSITION_ABBR_KEYS,
  POSITION_NAME_KEYS,
  POSITION_PITCH_KEYS,
  VNEXT_POSITIONS,
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

const LOOK_FIELDS = [
  'skinToneId',
  'faceId',
  'hairStyleId',
  'hairColorId',
  'facialHairId',
  'bodyTypeId',
] as const;
const REGIONS: readonly (HomeRegionIdVNext | null)[] = [
  null,
  'home_region_in_state',
  'home_region_out_of_state',
  'home_region_international',
];
const REGION_KEYS = {
  none: 'v2.region.none',
  home_region_in_state: 'v2.region.inState',
  home_region_out_of_state: 'v2.region.outOfState',
  home_region_international: 'v2.region.international',
} as const;

/** The extra creation choices beyond the identity (M12). */
export interface CreationExtras {
  readonly allocation: AllocationVNext;
  readonly presetId: string | null;
  readonly homeRegionId: HomeRegionIdVNext | null;
  /** M12 Phase 8: how this career uses unlocked legacy perks. */
  readonly legacy?: LegacyChoices;
}
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
  readonly allocation: AllocationVNext;
  readonly presetId: string | null;
  readonly homeRegionId: HomeRegionIdVNext | null;
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
  previewFirstRoles,
  legacyStore,
  alumni = NO_ALUMNI,
  onUnlockPerk,
}: {
  readonly blocked: boolean;
  readonly onCreate: (
    identity: PositionPlayerCreationIdentity,
    nameTokens: AthleteNameTokensVNext | null,
    extras: CreationExtras,
  ) => void;
  /** M12 Phase 8: the legacy store and the Alumni Wall (perks), and unlocking a perk. */
  readonly legacyStore?: LegacyStoreVNext;
  readonly alumni?: readonly AlumniVNext[];
  readonly onUnlockPerk?: (perkId: LegacyPerkIdVNext) => void;
  readonly previewFirstRoles?: (
    identity: PositionPlayerCreationIdentity,
    extras: CreationExtras,
  ) => readonly DepthRoleId[] | null;
}): React.JSX.Element {
  const { t } = useAppTranslation();
  const imperial = usePreferences().units === 'imperial';
  const [step, setStep] = useState(0);
  const [showExtras, setShowExtras] = useState(false);
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
    allocation: {},
    presetId: null,
    homeRegionId: null,
  });
  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  const [legacy, setLegacy] = useState<LegacyChoices>(NO_LEGACY_CHOICES);
  // A suggested name is shown (and saved) in the current language.
  const name =
    draft.nameTokens === null ? draft.displayName.trim() : namePreview(t, draft.nameTokens);
  const built = useMemo(() => {
    if (!complete(draft)) return null;
    const identity = identityOf(draft, 'Preview');
    const mechanics = buildCareerVNextMechanics(identity);
    if (mechanics === null) return null;
    const created = createPositionPlayerProfile({
      careerSeed: 'preview',
      identity,
      mechanics: mechanics.creation,
    });
    return created.ok ? { profile: created.player, mechanics } : null;
    // Appearance and name never change ratings: only the identity choices rebuild the preview.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.positionId, draft.archetypeId, draft.backgroundId, draft.traitIds]);
  const firstRoles = useMemo(
    () =>
      built === null || previewFirstRoles === undefined || !complete(draft)
        ? null
        : previewFirstRoles(identityOf(draft, 'Preview'), {
            allocation: draft.allocation,
            presetId: draft.presetId,
            homeRegionId: draft.homeRegionId,
            legacy,
          }),
    // Only the choices that reach ratings or offers rebuild the preview.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [built, draft.allocation, draft.presetId, legacy, previewFirstRoles],
  );
  // The card shows the athlete with the player's own points applied.
  const preview = built === null ? null : applyAllocationVNext(built.profile, draft.allocation);
  const archetypes = draft.positionId === null ? [] : archetypesFor(draft.positionId);
  const archetype = archetypes.find(({ id }) => id === draft.archetypeId) ?? null;
  const headline = archetype === null ? [] : [...archetype.priorityAttributeIds];
  const roleDone = draft.positionId !== null && draft.archetypeId !== null;
  const storyDone = draft.backgroundId !== null && draft.traitIds.length === 2;
  const canFinish = complete(draft) && preview !== null && name !== '';
  function suggestName(): void {
    update({ nameTokens: generatedName(nextNameCursor()), displayName: '' });
  }
  const steps = [
    t('v2.create.stepRole'),
    t('v2.create.stepStory'),
    t('v2.create.stepBuild'),
    t('v2.create.stepLook'),
  ];
  const lastStep = steps.length - 1;
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
                      draft.positionId !== positionId &&
                      update({ positionId, archetypeId: null, allocation: {}, presetId: null })
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
                      onClick={() =>
                        update({ archetypeId: entry.id, allocation: {}, presetId: null })
                      }
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
                    onClick={() =>
                      update({ backgroundId: entry.id, allocation: {}, presetId: null })
                    }
                    type="button"
                  >
                    <span className="s2-tile__name">{t(key(entry.nameKey))}</span>
                    {draft.positionId !== null &&
                      trade(t, backgroundModifiers(draft.positionId, entry.id))}
                    <PotentialCurve backgroundId={entry.id} />
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
            <fieldset className="s2-stack" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="s2-eyebrow">{t('v2.create.region')}</legend>
              <div className="s2-swatches" role="group" aria-label={t('v2.create.region')}>
                {REGIONS.map((region) => (
                  <button
                    aria-pressed={draft.homeRegionId === region}
                    className="s2-swatch"
                    key={region ?? 'none'}
                    onClick={() => update({ homeRegionId: region })}
                    type="button"
                  >
                    {t(REGION_KEYS[region ?? 'none'])}
                  </button>
                ))}
              </div>
              <p className="s2-note">{t('v2.create.regionHelp')}</p>
            </fieldset>
          </>
        )}

        {step === 2 && legacyStore !== undefined && onUnlockPerk !== undefined && (
          <LegacyPerks
            alumni={alumni}
            blocked={blocked}
            onChange={setLegacy}
            onUnlock={onUnlockPerk}
            store={legacyStore}
            value={legacy}
          />
        )}
        {step === 2 && built !== null && (
          <CreateBuild
            allocation={draft.allocation}
            bonusBudget={legacy.bonusBudget}
            firstRoles={firstRoles}
            mechanics={built.mechanics}
            onChange={(allocation, presetId) => update({ allocation, presetId })}
            presetId={draft.presetId}
            profile={built.profile}
          />
        )}

        {step === 3 && (
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
            <FullBodyFigure
              appearance={draft.appearance}
              heightCm={draft.heightCm}
              label={t('v2.create.fullBody')}
              weightKg={draft.weightKg}
            />
            {[...LOOK_FIELDS, ...(showExtras ? EXTRA_FIELDS : [])].map((field) => {
              const spec = appearanceCatalogVNext[field];
              return (
                <div className="s2-field" key={field}>
                  <span className="s2-eyebrow">{t(key(spec.labelKey))}</span>
                  <div className="s2-swatches" role="group" aria-label={t(key(spec.labelKey))}>
                    {spec.options.map((option) => {
                      const value = option.id;
                      return (
                        <button
                          aria-pressed={(draft.appearance[field] ?? null) === value}
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
              (step === lastStep && name === '')) && (
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
              {step < lastStep ? (
                <button
                  className="s2-btn s2-btn--block"
                  disabled={step === 0 ? !roleDone : step === 1 ? !storyDone : built === null}
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
                    complete(draft) &&
                    onCreate(identityOf(draft, name), draft.nameTokens, {
                      allocation: draft.allocation,
                      presetId: draft.presetId,
                      homeRegionId: draft.homeRegionId,
                      legacy,
                    })
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
