import {
  SKILL_BREAKTHROUGH_GAUGE_THRESHOLD,
  type PositionAlphaSessionV2,
  type SkillBreakthroughSourceId,
  type SkillId,
  type SkillFamilyId,
  type SkillGradeId,
} from '@project-saturday/game-core';
import {
  qbAlphaContent,
  rbAlphaContent,
  cbAlphaContent,
  positionSkillBuilds,
} from '@project-saturday/game-content';
import type { MessageKey, SupportedLocale } from '@project-saturday/game-content/locales';
import { useAppTranslation } from '../i18n/i18n';
import { ProgressMeter } from './ProgressMeter';

const CARDS = [...qbAlphaContent.skills, ...rbAlphaContent.skills, ...cbAlphaContent.skills];
const FAMILY_KEYS = {
  skill_family_development: 'skills.family.development',
  skill_family_role_coach: 'skills.family.roleCoach',
  skill_family_game_day: 'skills.family.gameDay',
  skill_family_mindset: 'skills.family.mindset',
  skill_family_body: 'skills.family.body',
  skill_family_life: 'skills.family.life',
} as const satisfies Record<SkillFamilyId, MessageKey>;
const GRADE_KEYS = {
  skill_grade_c: 'skills.grade.c',
  skill_grade_b: 'skills.grade.b',
  skill_grade_a: 'skills.grade.a',
  skill_grade_s: 'skills.grade.s',
} as const satisfies Record<SkillGradeId, MessageKey>;
const SOURCE_KEYS = {
  breakthrough_source_development: 'career.skills.gauge.source.development',
  breakthrough_source_role_coach: 'career.skills.gauge.source.roleCoach',
  breakthrough_source_game_day: 'career.skills.gauge.source.gameDay',
  breakthrough_source_mindset: 'career.skills.gauge.source.mindset',
  breakthrough_source_body: 'career.skills.gauge.source.body',
  breakthrough_source_life: 'career.skills.gauge.source.life',
} as const satisfies Record<SkillBreakthroughSourceId, MessageKey>;

export interface PositionAlphaSkillsProps {
  readonly session: PositionAlphaSessionV2;
  readonly locale: SupportedLocale;
  readonly busy: boolean;
  readonly saveFailed: boolean;
  readonly onChoose: (skillId: SkillId) => void;
  readonly onEquip: (skillId: SkillId | null, slotIndex: number) => void;
}

/** Formats saved sources and authored card effects; commands own acquisition and slot movement. */
export function PositionAlphaSkills({
  session,
  locale,
  busy,
  saveFailed,
  onChoose,
  onEquip,
}: PositionAlphaSkillsProps): React.JSX.Element {
  const { t } = useAppTranslation(locale);
  const offered = session.skills.offeredSkillIds;
  const blocked = busy || saveFailed;
  const planning =
    (session.phase.type === 'WEEK_PLANNING' || session.phase.type === 'POSTSEASON_PLANNING') &&
    session.gameDay.type === 'IDLE' &&
    offered === null &&
    session.events.pending === null;
  const latest = session.postseasonHistory.at(-1) ?? session.weekHistory.at(-1);
  const progress =
    latest?.model === 'position_alpha_week_summary_v2' ? latest.breakthrough.progress : null;
  const cardName = (id: SkillId) => t(CARDS.find((card) => card.id === id)!.nameKey as MessageKey);
  const cardCopy = (id: SkillId): React.JSX.Element => {
    const card = CARDS.find((entry) => entry.id === id)!;
    const supplement = positionSkillBuilds.find((entry) => entry.skillId === id);
    return (
      <>
        <strong>{cardName(id)}</strong>
        <span className="skill-card__badges">
          <span>{t(FAMILY_KEYS[card.familyId])}</span>
          <span>{t(GRADE_KEYS[card.gradeId])}</span>
        </span>
        <small>{t(card.descriptionKey as MessageKey)}</small>
        {supplement && <small>{t(supplement.descriptionKey)}</small>}
      </>
    );
  };
  return (
    <section
      className="panel"
      aria-labelledby="position-skills-heading"
      data-testid="position-current-skills"
    >
      <h2 id="position-skills-heading">{t('m7Ui.skills.title')}</h2>
      <p>{t('m7Direct.skills.help')}</p>
      {offered === null ? (
        <ProgressMeter
          label={t('career.skills.gauge.title')}
          maximum={SKILL_BREAKTHROUGH_GAUGE_THRESHOLD}
          value={session.skills.breakthroughGauge}
          valueText={t('career.skills.gauge.value', {
            current: session.skills.breakthroughGauge,
            required: SKILL_BREAKTHROUGH_GAUGE_THRESHOLD,
          })}
        />
      ) : (
        <section aria-labelledby="position-breakthrough-heading">
          <h3 id="position-breakthrough-heading">{t('m7Ui.skills.breakthrough')}</h3>
          <p>{t('m7Ui.skills.breakthroughHelp')}</p>
          <div className="choice-grid">
            {offered.map((id) => (
              <button
                key={id}
                className="choice-card"
                type="button"
                disabled={blocked}
                onClick={() => onChoose(id)}
              >
                <span className="choice-card__copy">{cardCopy(id)}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      <details>
        <summary>
          {progress === null
            ? t('career.skills.gauge.title')
            : t('career.skills.gauge.latestEvidence', { count: progress.weekIndex + 1 })}
        </summary>
        {progress === null ? (
          <p>
            {t(
              latest === undefined
                ? 'career.skills.gauge.noEvidence'
                : 'm7Direct.skills.historical',
            )}
          </p>
        ) : progress.sources.length === 0 ? (
          <p>{t('career.skills.gauge.noPoints')}</p>
        ) : (
          <ul>
            {progress.sources.map((source) => (
              <li key={source.sourceId}>
                {t(SOURCE_KEYS[source.sourceId])}{' '}
                {t('career.skills.gauge.points', { count: source.points })}
              </li>
            ))}
          </ul>
        )}
      </details>
      <h3>{t('m7Ui.skills.build')}</h3>
      <p>{t('m7Direct.skills.buildHelp')}</p>
      {!planning && <p>{t('career.skills.inventory.locked')}</p>}
      <div className="form-section">
        {session.skills.equippedSkillIds.map((id, slotIndex) => (
          <label className="select-field" key={slotIndex}>
            <span>{t('career.skills.slot.label', { count: slotIndex + 1 })}</span>
            <select
              value={id ?? ''}
              disabled={blocked || !planning}
              onChange={(event) => {
                const value = event.currentTarget.value;
                const skillId =
                  session.skills.ownedSkillIds.find((owned) => owned === value) ?? null;
                onEquip(skillId, slotIndex);
              }}
            >
              <option value="">{t('career.skills.slot.empty')}</option>
              {session.skills.ownedSkillIds.map((owned) => (
                <option key={owned} value={owned}>
                  {cardName(owned)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <details>
        <summary>{t('m7Ui.skills.build')}</summary>
        {session.skills.ownedSkillIds.length === 0 ? (
          <p>{t('m7Ui.skills.empty')}</p>
        ) : (
          session.skills.ownedSkillIds.map((id) => <article key={id}>{cardCopy(id)}</article>)
        )}
      </details>
    </section>
  );
}
