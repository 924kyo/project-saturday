import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ATTRIBUTE_XP_PER_RATING,
  projectAttributeProgress,
  selectCurrentProgramId,
  type AddedPositionId,
  type CreatePositionAlphaSessionInput,
  type PlayerAppearance,
  type PositionId,
  type PositionAlphaDecisionStrategy,
  type PositionAlphaSessionV1,
  type PositionStatId,
  type ProgramId,
  type SkillId,
} from '@project-saturday/game-core';
import {
  appearanceCatalog,
  creationContent,
  defaultWrAppearance,
  positionAlphaContent,
  programContent,
  qbAlphaContent,
  rbAlphaContent,
  cbAlphaContent,
  worldAlphaContent,
} from '@project-saturday/game-content';
import type { MessageKey, SupportedLocale } from '@project-saturday/game-content/locales';

import { useAppTranslation } from '../i18n/i18n';
import { AthletePortrait } from './AthletePortrait';
import {
  APPEARANCE_FIELD_ORDER,
  canAddPersonalityTrait,
  togglePersonalityTrait,
} from './career-ui';
import { ProgressMeter } from './ProgressMeter';
import { POSITION_CAREER_STAT_KEYS } from './position-labels';

export type PositionAlphaCreationRequest = Omit<CreatePositionAlphaSessionInput, 'careerSeed'>;

const POSITION_NAME_KEYS = {
  position_qb: 'm7Alpha.positions.qb.name',
  position_rb: 'm7Alpha.positions.rb.name',
  position_cb: 'm7Alpha.positions.cb.name',
} as const satisfies Record<AddedPositionId, MessageKey>;

const ALL_POSITION_NAME_KEYS = {
  position_wr: 'm7Alpha.positions.wr.name',
  ...POSITION_NAME_KEYS,
} as const satisfies Record<PositionId, MessageKey>;

export interface CareerPositionSelectorProps {
  readonly blocked?: boolean;
  readonly locale: SupportedLocale;
  readonly selectedPositionId: PositionId;
  readonly onSelect: (positionId: PositionId) => void;
}

export function CareerPositionSelector({
  blocked = false,
  locale,
  selectedPositionId,
  onSelect,
}: CareerPositionSelectorProps): React.JSX.Element {
  const { t } = useAppTranslation(locale);
  return (
    <section className="position-selector" aria-labelledby="position-selector-title">
      <p className="eyebrow">{t('m7Ui.selector.title')}</p>
      <h2 id="position-selector-title">{t('m7Ui.selector.help')}</h2>
      <div className="choice-grid choice-grid--positions">
        {(Object.keys(ALL_POSITION_NAME_KEYS) as PositionId[]).map((positionId) => (
          <button
            aria-pressed={selectedPositionId === positionId}
            className="choice-card position-selector__button"
            data-testid={`position-select-${positionId}`}
            key={positionId}
            disabled={blocked}
            type="button"
            onClick={() => onSelect(positionId)}
          >
            <span className="choice-card__copy">
              <strong>{t(ALL_POSITION_NAME_KEYS[positionId])}</strong>
              <small>
                {t(
                  positionId === 'position_wr' ? 'm7Ui.selector.wrHelp' : 'm7Ui.selector.addedHelp',
                )}
              </small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

const STAT_KEYS = POSITION_CAREER_STAT_KEYS;

const PURPOSES = ['HOME', 'WEEK', 'TEAM', 'SKILLS', 'PLAYER'] as const;
const POSITION_STATE_IDS = ['body', 'preparation', 'confidence'] as const;
const POSITION_STRATEGIES = ['best_fit', 'risk_seeking'] as const;
const POSITION_PORTRAIT_SIZE = 'profile' as const;
type PositionPurpose = (typeof PURPOSES)[number];

const PURPOSE_KEYS = {
  HOME: 'm7Ui.nav.home',
  WEEK: 'm7Ui.nav.week',
  TEAM: 'm7Ui.nav.team',
  SKILLS: 'm7Ui.nav.skills',
  PLAYER: 'm7Ui.nav.player',
} as const satisfies Record<PositionPurpose, MessageKey>;

const ALPHA_PROGRAMS = [...programContent.programs, ...worldAlphaContent.stagedPrograms];
const ALPHA_SKILLS = [...qbAlphaContent.skills, ...rbAlphaContent.skills, ...cbAlphaContent.skills];
const ALPHA_EVENTS = [...qbAlphaContent.events, ...rbAlphaContent.events, ...cbAlphaContent.events];

function programNameKey(programId: string): MessageKey {
  const program = ALPHA_PROGRAMS.find(({ id }) => id === programId);
  return (program?.nameKey ?? 'm7World.world.name') as MessageKey;
}

export interface PositionAlphaCreationProps {
  readonly saveBlocked?: boolean;
  readonly pendingName?: string;
  readonly onRetrySave?: () => void;
  readonly busy: boolean;
  readonly locale: SupportedLocale;
  readonly positionId: AddedPositionId;
  readonly saveFailed: boolean;
  readonly onCreate: (request: PositionAlphaCreationRequest) => void;
}

export function PositionAlphaCreation({
  saveBlocked = false,
  pendingName,
  onRetrySave,
  busy,
  locale,
  positionId,
  saveFailed,
  onCreate,
}: PositionAlphaCreationProps): React.JSX.Element {
  const { t } = useAppTranslation(locale);
  const saveWarning = useRef<HTMLElement>(null);
  useEffect(() => {
    if (saveFailed) saveWarning.current?.focus();
  }, [saveFailed]);
  const archetypes = positionAlphaContent.archetypes.filter(
    (archetype) => archetype.positionId === positionId,
  );
  const [displayName, setDisplayName] = useState('');
  const [archetypeId, setArchetypeId] = useState(archetypes[0]!.id);
  const [backgroundId, setBackgroundId] = useState(
    positionAlphaContent.creationMechanics.backgroundProfiles.find(
      (background) => background.positionId === positionId,
    )!.id,
  );
  const [programId, setProgramId] = useState<ProgramId>(ALPHA_PROGRAMS[0]!.id);
  const [personalityTraitIds, setPersonalityTraitIds] = useState<
    readonly (typeof creationContent.personalityTraits)[number]['id'][]
  >([]);
  const [appearance, setAppearance] = useState<PlayerAppearance>({ ...defaultWrAppearance });
  const [heightCm, setHeightCm] = useState(188);
  const [weightKg, setWeightKg] = useState(92);
  const [invalid, setInvalid] = useState(false);

  function updateAppearance(field: keyof PlayerAppearance, value: string): void {
    const option = appearanceCatalog[field].options.find(({ id }) => String(id ?? '') === value);
    if (option !== undefined) setAppearance((current) => ({ ...current, [field]: option.id }));
  }

  return (
    <main className="creation-layout" data-testid="position-alpha-creation">
      <section className="creation-intro">
        <p className="eyebrow">{t('m7Ui.creation.eyebrow')}</p>
        <h1>{t('m7Ui.creation.title', { position: t(POSITION_NAME_KEYS[positionId]) })}</h1>
        <p>{t('m7Ui.creation.help')}</p>
      </section>
      <form
        className="creation-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (displayName.trim().length === 0 || personalityTraitIds.length !== 2) {
            setInvalid(true);
            return;
          }
          setInvalid(false);
          onCreate({
            programId,
            identity: {
              displayName: displayName.trim(),
              positionId,
              archetypeId,
              recruitingBackgroundId: backgroundId,
              personalityTraitIds: [personalityTraitIds[0]!, personalityTraitIds[1]!],
              appearance,
              heightCm,
              weightKg,
            },
          });
        }}
      >
        {(invalid || saveFailed) && (
          <div className="form-alert" role="alert">
            {t(saveFailed ? 'm7Ui.save.failed' : 'm7Ui.creation.invalid')}
          </div>
        )}
        {saveBlocked && onRetrySave && (
          <aside
            className="save-warning"
            role="alert"
            data-testid="position-creation-save-pending"
            ref={saveWarning}
            tabIndex={-1}
          >
            <p>{t('m7Direct.creation.pending', { name: pendingName ?? displayName })}</p>
            <button
              type="button"
              className="button button--primary"
              disabled={busy}
              onClick={() => onRetrySave()}
            >
              {t('career.save.retry')}
            </button>
          </aside>
        )}
        <fieldset className="position-creation-fields" disabled={busy || saveBlocked}>
          <section className="form-section">
            <h2>{t('m7Ui.creation.identity')}</h2>
            <label className="field-label" htmlFor="position-alpha-name">
              {t('career.creation.displayName')}
            </label>
            <input
              className="text-input"
              data-testid="position-alpha-name"
              id="position-alpha-name"
              maxLength={40}
              value={displayName}
              onChange={(event) => setDisplayName(event.currentTarget.value)}
            />
            <fieldset className="choice-fieldset">
              <legend>{t('career.creation.archetype')}</legend>
              <div className="choice-grid">
                {archetypes.map((archetype) => (
                  <label className="choice-card" key={archetype.id}>
                    <input
                      checked={archetypeId === archetype.id}
                      name="position-archetype"
                      type="radio"
                      onChange={() => setArchetypeId(archetype.id)}
                    />
                    <span className="choice-card__copy">
                      <strong>{t(archetype.nameKey as MessageKey)}</strong>
                      <small>{t(archetype.descriptionKey as MessageKey)}</small>
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
                      checked={backgroundId === background.id}
                      name="position-background"
                      type="radio"
                      onChange={() => setBackgroundId(background.id)}
                    />
                    <span className="choice-card__copy">
                      <strong>{t(background.nameKey)}</strong>
                      <small>{t(background.descriptionKey)}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="choice-fieldset">
              <legend>{t('career.creation.personality')}</legend>
              <p className="field-help">{t('m7Ui.creation.personalityHelp')}</p>
              <div className="choice-grid choice-grid--compact">
                {creationContent.personalityTraits.map((trait) => {
                  const selected = personalityTraitIds.includes(trait.id);
                  return (
                    <label className="choice-card" key={trait.id}>
                      <input
                        checked={selected}
                        disabled={
                          !selected && !canAddPersonalityTrait(personalityTraitIds, trait.id)
                        }
                        type="checkbox"
                        onChange={() =>
                          setPersonalityTraitIds((current) =>
                            togglePersonalityTrait(current, trait.id),
                          )
                        }
                      />
                      <span className="choice-card__copy">
                        <strong>{t(trait.nameKey)}</strong>
                        <small>{t(trait.descriptionKey)}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </section>
          <section className="form-section">
            <h2>{t('career.creation.appearance.title')}</h2>
            <div className="creation-preview">
              <div>
                <h3>{t('career.creation.preview.title')}</h3>
                <p>{t('m7Ui.creation.appearanceHelp')}</p>
              </div>
              <div className="athlete-portrait-host">
                <AthletePortrait
                  appearance={appearance}
                  label={t('career.player.portraitLabel', {
                    name: displayName.trim() || t('m7Ui.creation.unnamed'),
                  })}
                  size={POSITION_PORTRAIT_SIZE}
                />
              </div>
            </div>
            <div className="select-grid">
              {APPEARANCE_FIELD_ORDER.map((field) => (
                <label className="select-field" key={field}>
                  <span>{t(appearanceCatalog[field].labelKey)}</span>
                  <select
                    value={String(appearance[field] ?? '')}
                    onChange={(event) => updateAppearance(field, event.currentTarget.value)}
                  >
                    {appearanceCatalog[field].options.map((option) => (
                      <option key={option.id ?? `${field}-none`} value={option.id ?? ''}>
                        {t(option.nameKey)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div className="measurement-grid">
              <label className="measurement-field">
                <span>{t('career.creation.heightMetric')}</span>
                <input
                  min={150}
                  max={220}
                  type="number"
                  value={heightCm}
                  onChange={(event) => setHeightCm(event.currentTarget.valueAsNumber)}
                />
              </label>
              <label className="measurement-field">
                <span>{t('career.creation.weightMetric')}</span>
                <input
                  min={55}
                  max={160}
                  type="number"
                  value={weightKg}
                  onChange={(event) => setWeightKg(event.currentTarget.valueAsNumber)}
                />
              </label>
            </div>
          </section>
          <section className="form-section">
            <h2>{t('m7Ui.creation.program')}</h2>
            <label className="select-field">
              <span>{t('m7Ui.creation.programLabel')}</span>
              <select
                data-testid="position-alpha-program"
                value={programId}
                onChange={(event) => setProgramId(event.currentTarget.value as ProgramId)}
              >
                {ALPHA_PROGRAMS.map((program) => (
                  <option key={program.id} value={program.id}>
                    {t(program.nameKey as MessageKey)}
                  </option>
                ))}
              </select>
            </label>
            <p className="field-help">{t('m7Ui.creation.programHelp')}</p>
          </section>
          <button className="primary-action" disabled={busy} type="submit">
            {busy ? t('career.creation.creating') : t('m7Ui.creation.submit')}
          </button>
        </fieldset>
      </form>
    </main>
  );
}

export interface PositionAlphaCareerProps {
  readonly busy: boolean;
  readonly locale: SupportedLocale;
  readonly saveFailed: boolean;
  readonly session: PositionAlphaSessionV1;
  readonly onAdvanceWeek: (actionId: string, strategy: PositionAlphaDecisionStrategy) => void;
  readonly onResolveSeason: (strategy: PositionAlphaDecisionStrategy) => void;
  readonly onCommitOffseason: (programId: ProgramId) => void;
  readonly onChooseSkill: (skillId: SkillId) => void;
  readonly onEquipSkill: (skillId: SkillId, slotIndex: number) => void;
  readonly onResolveEvent: (choiceId: string) => void;
  readonly onRetrySave: () => void;
}

export function PositionAlphaCareer({
  busy,
  locale,
  saveFailed,
  session,
  onAdvanceWeek,
  onResolveSeason,
  onCommitOffseason,
  onChooseSkill,
  onEquipSkill,
  onResolveEvent,
  onRetrySave,
}: PositionAlphaCareerProps): React.JSX.Element {
  const { t } = useAppTranslation(locale);
  const [purpose, setPurpose] = useState<PositionPurpose>('HOME');
  const actions = positionAlphaContent.trainingActions.filter(
    ({ positionId }) => positionId === session.player.positionId,
  );
  const [actionId, setActionId] = useState(actions[0]!.id);
  const [strategy, setStrategy] = useState<PositionAlphaDecisionStrategy>('best_fit');
  const [offseasonProgramId, setOffseasonProgramId] = useState<ProgramId | null>(
    session.lifecycle.offseason?.options[0].programId ?? null,
  );
  const [selectedOwnedSkillId, setSelectedOwnedSkillId] = useState<SkillId | null>(
    session.skills.ownedSkillIds[0] ?? null,
  );
  const latest = session.weekHistory.at(-1);
  const ownedAttributes = positionAlphaContent.attributes.filter((attribute) =>
    attribute.id.startsWith(`attribute_${session.player.positionId.slice('position_'.length)}_`),
  );
  const selectedAction = actions.find(({ id }) => id === actionId)!;
  const proficiencyUses = session.training.proficiencyUses[selectedAction.proficiencyId] ?? 0;
  const nextThreshold = [2, 5, 9, 14, 20].find((threshold) => threshold > proficiencyUses) ?? null;
  const playerEvaluation = session.room.evaluations.find(
    ({ participantId }) => participantId === session.player.id,
  )!;
  const currentProgramId = selectCurrentProgramId(session);
  if (currentProgramId === null) throw new Error('Position alpha career requires a program.');
  const programKey = programNameKey(currentProgramId);
  const opponentKey = latest === undefined ? null : programNameKey(latest.opponentProgramId);
  const pendingEvent =
    session.events.pending === null
      ? null
      : (ALPHA_EVENTS.find(({ id }) => id === session.events.pending?.eventId) ?? null);
  const totals = useMemo(() => {
    const values = new Map<PositionStatId, number>();
    for (const week of session.weekHistory) {
      for (const entry of week.stats.entries) {
        values.set(entry.statId, (values.get(entry.statId) ?? 0) + entry.value);
      }
    }
    return [...values.entries()];
  }, [session.weekHistory]);

  return (
    <main className="career-layout position-alpha-shell" data-testid="position-alpha-career">
      <header className="career-hero">
        <div className="athlete-portrait-host">
          <AthletePortrait
            appearance={session.player.appearance}
            label={t('career.player.portraitLabel', { name: session.player.displayName })}
            size={POSITION_PORTRAIT_SIZE}
          />
        </div>
        <div>
          <p className="eyebrow">{t(POSITION_NAME_KEYS[session.player.positionId])}</p>
          <h1>{session.player.displayName}</h1>
          <p>{t(programKey)}</p>
        </div>
      </header>
      {saveFailed && (
        <aside className="save-warning" role="alert" data-testid="position-alpha-save-failure">
          <p>{t('m7Ui.save.failed')}</p>
          <button className="button button--primary" type="button" onClick={onRetrySave}>
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

      {purpose === 'HOME' && (
        <section className="purpose-panel">
          <h2>{t('m7Ui.home.title')}</h2>
          <div className="gauge-grid">
            {POSITION_STATE_IDS.map((stateId) => (
              <ProgressMeter
                key={stateId}
                label={t(
                  stateId === 'body'
                    ? 'career.player.body'
                    : stateId === 'preparation'
                      ? 'career.player.preparation'
                      : 'career.player.confidence',
                )}
                value={session.player.state[stateId]}
                maximum={100}
                valueText={String(session.player.state[stateId])}
              />
            ))}
          </div>
          <div className="career-card-grid">
            <article className="career-card">
              <h3>{t('m7Ui.home.role')}</h3>
              <p>{t('m7Ui.home.rank', { rank: session.room.projection.rank })}</p>
              <p>
                {t('m7Ui.home.opportunities', {
                  minimum: session.room.projection.interactiveSnapMinimum,
                  maximum: session.room.projection.interactiveSnapMaximum,
                })}
              </p>
            </article>
            <article className="career-card">
              <h3>{t('m7Ui.home.consequences')}</h3>
              <p>{t('m7Ui.help.consequences')}</p>
            </article>
          </div>
          {latest && opponentKey && (
            <article className="latest-result">
              <h3>{t('m7Ui.home.lastWeek')}</h3>
              <p>
                {t('m7Ui.home.score', {
                  opponent: t(opponentKey),
                  us: latest.playerTeamScore,
                  them: latest.opponentScore,
                })}
              </p>
              <p>
                {t('m7Ui.home.grades', {
                  practice: latest.practiceGrade.score,
                  game: latest.gameGrade,
                })}
              </p>
              <p>{t('m7Ui.home.risk', { risk: latest.injuryExposure.totalRiskPermille / 10 })}</p>
            </article>
          )}
        </section>
      )}

      {purpose === 'WEEK' && (
        <section className="purpose-panel">
          <h2>
            {session.phase.type === 'WEEK_PLANNING'
              ? t('m7Ui.week.title', { week: session.phase.weekIndex + 1 })
              : session.phase.type === 'SEASON_REVIEW'
                ? t('m7Ui.review.title')
                : session.phase.type === 'OFFSEASON_DECISION'
                  ? t('m7Ui.offseason.title')
                  : t('m7Ui.complete.title')}
          </h2>
          {session.phase.type === 'WEEK_PLANNING' ? (
            session.events.pending !== null && pendingEvent !== null ? (
              <section className="event-panel" data-testid="position-alpha-event">
                <p className="eyebrow">{t('m7Ui.event.eyebrow')}</p>
                <h3>{t(pendingEvent.nameKey as MessageKey)}</h3>
                <p>{t(pendingEvent.descriptionKey as MessageKey)}</p>
                <p>{t('m7Ui.event.help')}</p>
                <div className="choice-grid">
                  {pendingEvent.choices
                    .filter(({ id }) => session.events.pending?.choiceIds.includes(id))
                    .map((choice) => (
                      <button
                        className="choice-card"
                        disabled={busy || saveFailed}
                        key={choice.id}
                        type="button"
                        onClick={() => onResolveEvent(choice.id)}
                      >
                        <span className="choice-card__copy">
                          <strong>{t(choice.nameKey as MessageKey)}</strong>
                          <small>{t(choice.descriptionKey as MessageKey)}</small>
                        </span>
                      </button>
                    ))}
                </div>
              </section>
            ) : (
              <>
                <p>{t('m7Ui.week.help')}</p>
                <fieldset className="choice-fieldset">
                  <legend>{t('m7Ui.week.focus')}</legend>
                  <div className="choice-grid">
                    {actions.map((action) => (
                      <label className="choice-card" key={action.id}>
                        <input
                          checked={actionId === action.id}
                          name="position-action"
                          type="radio"
                          onChange={() => setActionId(action.id)}
                        />
                        <span className="choice-card__copy">
                          <strong>{t(action.nameKey as MessageKey)}</strong>
                          <small>{t(action.descriptionKey as MessageKey)}</small>
                          <em>
                            {t('m7Ui.week.actionEffects', {
                              body: action.bodyDelta * 3,
                              preparation: action.preparationDelta * 3,
                            })}
                          </em>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="career-card">
                  <h3>{t('m7Ui.week.proficiency')}</h3>
                  <p>{t('m7Ui.week.uses', { uses: proficiencyUses })}</p>
                  <p>
                    {nextThreshold === null
                      ? t('m7Ui.week.proficiencyMax')
                      : t('m7Ui.week.nextThreshold', {
                          remaining: nextThreshold - proficiencyUses,
                          threshold: nextThreshold,
                        })}
                  </p>
                </div>
                <fieldset className="choice-fieldset">
                  <legend>{t('m7Ui.week.approach')}</legend>
                  <div className="choice-grid">
                    {POSITION_STRATEGIES.map((option) => (
                      <label className="choice-card" key={option}>
                        <input
                          checked={strategy === option}
                          name="position-strategy"
                          type="radio"
                          onChange={() => setStrategy(option)}
                        />
                        <span className="choice-card__copy">
                          <strong>
                            {t(
                              option === 'best_fit' ? 'm7Ui.week.bestFit' : 'm7Ui.week.riskSeeking',
                            )}
                          </strong>
                          <small>
                            {t(
                              option === 'best_fit'
                                ? 'm7Ui.week.bestFitHelp'
                                : 'm7Ui.week.riskSeekingHelp',
                            )}
                          </small>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <button
                  className="primary-action"
                  disabled={busy || saveFailed}
                  type="button"
                  onClick={() => onAdvanceWeek(actionId, strategy)}
                >
                  {busy ? t('m7Ui.week.resolving') : t('m7Ui.week.resolve')}
                </button>
              </>
            )
          ) : session.phase.type === 'SEASON_REVIEW' ? (
            <>
              <p>{t('m7Ui.review.help')}</p>
              <button
                className="primary-action"
                disabled={busy || saveFailed}
                type="button"
                onClick={() => onResolveSeason(strategy)}
              >
                {busy ? t('m7Ui.review.resolving') : t('m7Ui.review.resolve')}
              </button>
            </>
          ) : session.phase.type === 'OFFSEASON_DECISION' ? (
            <>
              <p>{t('m7Ui.offseason.help')}</p>
              <fieldset className="choice-fieldset">
                <legend>{t('m7Ui.offseason.choice')}</legend>
                <div className="choice-grid">
                  {session.lifecycle.offseason?.options.map((option) => (
                    <label className="choice-card" key={option.programId}>
                      <input
                        checked={offseasonProgramId === option.programId}
                        name="position-offseason"
                        type="radio"
                        onChange={() => setOffseasonProgramId(option.programId)}
                      />
                      <span className="choice-card__copy">
                        <strong>{t(programNameKey(option.programId))}</strong>
                        <small>
                          {t(
                            option.kind === 'STAY'
                              ? 'm7Ui.offseason.stay'
                              : 'm7Ui.offseason.transfer',
                            {
                              rank: option.projectedDepthRank,
                              score: option.comparisonScore,
                            },
                          )}
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <button
                className="primary-action"
                disabled={busy || saveFailed || offseasonProgramId === null}
                type="button"
                onClick={() => {
                  if (offseasonProgramId !== null) onCommitOffseason(offseasonProgramId);
                }}
              >
                {busy ? t('m7Ui.offseason.saving') : t('m7Ui.offseason.commit')}
              </button>
            </>
          ) : (
            <section data-testid="position-alpha-complete">
              <p>{t('m7Ui.complete.help')}</p>
              <p>
                {t('m7Ui.complete.seasons', {
                  seasons: session.lifecycle.completedSeasons.length,
                })}
              </p>
              <p>{t('m7Ui.complete.alumni', { alumni: session.meta?.alumni.length ?? 0 })}</p>
            </section>
          )}
        </section>
      )}

      {purpose === 'TEAM' && (
        <section className="purpose-panel">
          <h2>{t('m7Ui.team.title')}</h2>
          <p>{t('m7Ui.team.help')}</p>
          <div className="career-card-grid">
            <article className="career-card">
              <h3>{t('m7Ui.team.trust')}</h3>
              <p>{session.player.state.coachTrust}</p>
              <p>{t('m7Ui.team.trustHelp')}</p>
            </article>
            <article className="career-card">
              <h3>{t('m7Ui.team.depth')}</h3>
              <p>{t('m7Ui.home.rank', { rank: playerEvaluation.rank })}</p>
              <p>{t('m7Ui.team.depthHelp')}</p>
            </article>
          </div>
          <ol className="receiver-room">
            {session.room.evaluations.map((evaluation) => (
              <li
                key={evaluation.participantId}
                data-player={evaluation.participantId === session.player.id}
              >
                <strong>
                  {evaluation.participantId === session.player.id
                    ? session.player.displayName
                    : t('m7Ui.team.competitor', { rank: evaluation.rank })}
                </strong>
                <span>{t('m7Ui.team.score', { score: evaluation.totalScoreMilli / 1000 })}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {purpose === 'SKILLS' && (
        <section className="purpose-panel">
          <h2>{t('m7Ui.skills.title')}</h2>
          <p>{t('m7Ui.skills.help')}</p>
          <ProgressMeter
            label={t('m7Ui.skills.gauge')}
            value={session.skills.breakthroughGauge}
            maximum={100}
            valueText={t('m7Ui.skills.gaugeValue', {
              gauge: session.skills.breakthroughGauge,
            })}
          />
          {session.skills.offeredSkillIds !== null && (
            <section className="breakthrough-panel" data-testid="position-skill-offers">
              <h3>{t('m7Ui.skills.breakthrough')}</h3>
              <p>{t('m7Ui.skills.breakthroughHelp')}</p>
              <div className="choice-grid">
                {session.skills.offeredSkillIds.map((skillId) => {
                  const skill = ALPHA_SKILLS.find(({ id }) => id === skillId)!;
                  return (
                    <button
                      className="choice-card"
                      disabled={busy || saveFailed}
                      key={skillId}
                      type="button"
                      onClick={() => onChooseSkill(skillId)}
                    >
                      <span className="choice-card__copy">
                        <strong>{t(skill.nameKey as MessageKey)}</strong>
                        <small>{t(skill.descriptionKey as MessageKey)}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
          <section>
            <h3>{t('m7Ui.skills.build')}</h3>
            {session.skills.ownedSkillIds.length === 0 ? (
              <p>{t('m7Ui.skills.empty')}</p>
            ) : (
              <>
                <div className="choice-grid">
                  {session.skills.ownedSkillIds.map((skillId) => {
                    const skill = ALPHA_SKILLS.find(({ id }) => id === skillId)!;
                    return (
                      <label className="choice-card" key={skillId}>
                        <input
                          checked={selectedOwnedSkillId === skillId}
                          name="position-owned-skill"
                          type="radio"
                          onChange={() => setSelectedOwnedSkillId(skillId)}
                        />
                        <span className="choice-card__copy">
                          <strong>{t(skill.nameKey as MessageKey)}</strong>
                          <small>{t(skill.descriptionKey as MessageKey)}</small>
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div className="button-row">
                  {session.skills.equippedSkillIds.map((skillId, slotIndex) => (
                    <button
                      className="button button--secondary"
                      disabled={busy || saveFailed || selectedOwnedSkillId === null}
                      key={slotIndex}
                      type="button"
                      onClick={() => {
                        if (selectedOwnedSkillId !== null)
                          onEquipSkill(selectedOwnedSkillId, slotIndex);
                      }}
                    >
                      {t('m7Ui.skills.slot', {
                        slot: slotIndex + 1,
                        skill:
                          skillId === null
                            ? t('m7Ui.skills.open')
                            : t(
                                ALPHA_SKILLS.find(({ id }) => id === skillId)!
                                  .nameKey as MessageKey,
                              ),
                      })}
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        </section>
      )}

      {purpose === 'PLAYER' && (
        <section className="purpose-panel">
          <h2>{t('m7Ui.player.title')}</h2>
          <p>{t('m7Ui.player.overall', { overall: session.player.overall })}</p>
          <div className="attribute-grid">
            {ownedAttributes.map((definition) => {
              const progress = session.player.attributes[definition.id]!;
              const projection = projectAttributeProgress(progress);
              return (
                <article className="attribute-card" key={definition.id}>
                  <h3>{t(definition.nameKey as MessageKey)}</h3>
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
          {totals.length > 0 && (
            <section>
              <h3>{t('m7Ui.player.seasonStats')}</h3>
              <dl className="summary-list">
                {totals.map(([statId, value]) => (
                  <div key={statId}>
                    <dt>{t(STAT_KEYS[statId] ?? 'm7Ui.stats.other')}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </section>
      )}
    </main>
  );
}
