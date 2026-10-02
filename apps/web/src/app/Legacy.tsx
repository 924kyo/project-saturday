import {
  hallOfFameScoreVNext,
  LEGACY_PERK_IDS_VNEXT,
  legacyBalanceVNext,
  legacyPointsVNext,
  legacyTotalVNext,
  VNEXT_COMMEMORATIVE_GEAR,
  VNEXT_LEGACY_PERKS,
  VNEXT_LEGACY_POINT_TUNING,
  type AlumniVNext,
  type LegacyCategoryIdVNext,
  type LegacyPerkIdVNext,
  type LegacyStoreVNext,
  type ProgramId,
} from '@project-saturday/game-core';
import type { MessageKey } from '@project-saturday/game-content/locales';

import { useAppTranslation } from '../i18n/i18n';
import { key, program } from './content';
import type { LegacyChoices } from './legacy-choices';
import { Panel } from './ui';

const CATEGORY_KEYS = {
  role: 'v2.legacy.points.role',
  honors: 'v2.legacy.points.honors',
  team: 'v2.legacy.points.team',
  academics: 'v2.legacy.points.academics',
  relationships: 'v2.legacy.points.relationships',
  draft: 'v2.legacy.points.draft',
  hallOfFame: 'v2.legacy.points.hallOfFame',
} as const satisfies Record<LegacyCategoryIdVNext, MessageKey>;

const camel = (id: string) =>
  id
    .split('_')
    .map((part, index) => (index === 0 ? part : part[0]!.toUpperCase() + part.slice(1)))
    .join('');
const perkKey = (id: LegacyPerkIdVNext, part: 'name' | 'desc') =>
  key(`v2.perks.${camel(id)}.${part}`);
const signed = (value: number) => (value > 0 ? `+${value}` : value < 0 ? `−${-value}` : '±0');

/** What this career earned for later ones, the Hall of Fame call and the Combine (LEG-04, CAR-02). */
export function LegacySummary({ plaque }: { readonly plaque: AlumniVNext }): React.JSX.Element {
  const { t } = useAppTranslation();
  const rows = legacyPointsVNext(plaque);
  const total = legacyTotalVNext(plaque);
  const combine = plaque.draft?.combine;
  return (
    <Panel id="s2-legacy-earned" title={t('v2.legacy.points.title')}>
      {rows.length === 0 ? (
        <p className="s2-note">{t('v2.legacy.points.none')}</p>
      ) : (
        <ul className="s2-list">
          {rows.map((row) => (
            <li key={row.categoryId}>
              {t(CATEGORY_KEYS[row.categoryId], {
                points: row.points,
                value: row.value,
                gpa: (row.value / 100).toFixed(2),
              })}
            </li>
          ))}
        </ul>
      )}
      <p>
        <strong>{t('v2.legacy.points.total', { points: total })}</strong>
      </p>
      <p className="s2-note" id="s2-hof">
        {t(plaque.hallOfFame === true ? 'v2.hof.inducted' : 'v2.hof.notInducted', {
          score: hallOfFameScoreVNext(plaque),
          bar: VNEXT_LEGACY_POINT_TUNING.hallOfFame.threshold,
        })}
      </p>
      {combine !== undefined && (
        <div className="s2-stack" id="s2-combine" style={{ gap: 4 }}>
          <p className="s2-eyebrow">{t('v2.combine.title')}</p>
          <p className="s2-num">
            {t('v2.combine.line', {
              forty: (combine.fortyHundredths / 100).toFixed(2),
              vertical: (combine.verticalTenths / 10).toFixed(1),
              bench: combine.benchReps,
              shuttle: (combine.shuttleHundredths / 100).toFixed(2),
              test: combine.footballTest,
            })}
          </p>
          <p className="s2-note">{t('v2.combine.stock', { delta: signed(combine.stockDelta) })}</p>
        </div>
      )}
    </Panel>
  );
}

/** The Hall of Fame inside the Record Book (LEG-03). */
export function HallOfFameList({
  alumni,
}: {
  readonly alumni: readonly AlumniVNext[];
}): React.JSX.Element {
  const { t } = useAppTranslation();
  const inducted = alumni.filter(({ hallOfFame }) => hallOfFame === true);
  return (
    <div className="s2-stack" id="s2-hall-of-fame" style={{ gap: 4 }}>
      <p className="s2-eyebrow">{t('v2.hof.title')}</p>
      {inducted.length === 0 ? (
        <p className="s2-note">{t('v2.hof.none')}</p>
      ) : (
        <ul className="s2-list">
          {inducted.map((plaque) => (
            <li key={plaque.careerId}>{plaque.displayName}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Unlock perks with legacy points, and choose how this career uses them (LEG-02, LEG-04, LEG-05). */
export function LegacyPerks({
  store,
  alumni,
  value,
  blocked,
  onChange,
  onUnlock,
}: {
  readonly store: LegacyStoreVNext;
  readonly alumni: readonly AlumniVNext[];
  readonly value: LegacyChoices;
  readonly blocked: boolean;
  readonly onChange: (next: LegacyChoices) => void;
  readonly onUnlock: (perkId: LegacyPerkIdVNext) => void;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  if (store.earned === 0 && alumni.length === 0) return null;
  const balance = legacyBalanceVNext(store);
  const level = (id: LegacyPerkIdVNext) => store.perks[id] ?? 0;
  const programs = [...new Set(alumni.flatMap(({ programIds }) => programIds))];
  return (
    <Panel id="s2-perks" title={t('v2.perks.title')}>
      <p className="s2-num">
        {t('v2.perks.balance', { points: balance, careers: store.claimedCareerIds.length })}
      </p>
      <p className="s2-note">{t('v2.perks.help')}</p>
      <ul className="s2-list s2-shoplist">
        {LEGACY_PERK_IDS_VNEXT.map((id) => {
          const perk = VNEXT_LEGACY_PERKS[id];
          const owned = level(id);
          return (
            <li data-perk={id} key={id}>
              <span className="s2-stack" style={{ gap: 2 }}>
                <strong>{t(perkKey(id, 'name'))}</strong>
                <span className="s2-note">{t(perkKey(id, 'desc'))}</span>
                {owned > 0 && (
                  <span className="s2-note">
                    {t('v2.perks.level', { level: owned, max: perk.maxLevel })}
                  </span>
                )}
              </span>
              {owned < perk.maxLevel && (
                <button
                  className="s2-chipbtn"
                  disabled={blocked || balance < perk.cost}
                  onClick={() => onUnlock(id)}
                  type="button"
                >
                  {t('v2.perks.unlock', { cost: perk.cost })}
                </button>
              )}
              {id === 'perk_head_start' && owned > 0 && (
                <label className="s2-row" style={{ gap: 6 }}>
                  {t('v2.perks.useHeadStart')}
                  <select
                    onChange={(event) =>
                      onChange({ ...value, bonusBudget: Number(event.currentTarget.value) })
                    }
                    value={value.bonusBudget}
                  >
                    {Array.from({ length: owned + 1 }, (_, points) => (
                      <option key={points} value={points}>
                        {signed(points)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {id === 'perk_mentor_choice' && owned > 0 && (
                <label className="s2-row" style={{ gap: 6 }}>
                  {t('v2.perks.useMentor')}
                  <select
                    onChange={(event) =>
                      onChange({
                        ...value,
                        mentorCareerId: event.currentTarget.value || null,
                      })
                    }
                    value={value.mentorCareerId ?? ''}
                  >
                    <option value="">{t('v2.perks.none')}</option>
                    {alumni.map(({ careerId, displayName }) => (
                      <option key={careerId} value={careerId}>
                        {displayName}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {id === 'perk_legacy_offer' && owned > 0 && (
                <label className="s2-row" style={{ gap: 6 }}>
                  {t('v2.perks.useOffer')}
                  <select
                    onChange={(event) =>
                      onChange({
                        ...value,
                        legacyOfferProgramId: (event.currentTarget.value ||
                          null) as ProgramId | null,
                      })
                    }
                    value={value.legacyOfferProgramId ?? ''}
                  >
                    <option value="">{t('v2.perks.none')}</option>
                    {programs.map((programId) => (
                      <option key={programId} value={programId}>
                        {t(key(program(programId).shortNameKey))}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {id === 'perk_commemorative_gear' && owned > 0 && (
                <label className="s2-row" style={{ gap: 6 }}>
                  <input
                    checked={value.startGearIds.includes(VNEXT_COMMEMORATIVE_GEAR)}
                    onChange={(event) =>
                      onChange({
                        ...value,
                        startGearIds: event.currentTarget.checked ? [VNEXT_COMMEMORATIVE_GEAR] : [],
                      })
                    }
                    type="checkbox"
                  />
                  {t('v2.perks.useGear')}
                </label>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
