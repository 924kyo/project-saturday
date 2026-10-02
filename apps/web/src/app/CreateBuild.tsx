import { useMemo } from 'react';
import {
  allocationPresetsVNext,
  applyAllocationVNext,
  checkAllocationVNext,
  creationBreakdownVNext,
  scoutingReportVNext,
  VNEXT_ALLOCATION_TUNING,
  type AllocationVNext,
  type CareerVNextMechanics,
  type CreatedPositionPlayerProfile,
  type DepthRoleId,
} from '@project-saturday/game-core';
import type { MessageKey } from '@project-saturday/game-content/locales';

import { useAppTranslation } from '../i18n/i18n';
import { attributeNameKey, ROLE_KEYS } from './content';
import { PotentialCurve } from './Development';

const PRESET_KEYS: Readonly<Record<string, MessageKey>> = {
  preset_recommended: 'v2.alloc.preset.recommended',
  preset_specialist: 'v2.alloc.preset.specialist',
  preset_athletic: 'v2.alloc.preset.athletic',
  preset_none: 'v2.alloc.preset.none',
};

const ROLE_ORDER: readonly DepthRoleId[] = Object.keys(ROLE_KEYS) as DepthRoleId[];

const signed = (value: number) => (value === 0 ? '·' : value > 0 ? `+${value}` : `−${-value}`);

/**
 * Creation step 3 (M12): the player's own point budget, with presets, per-attribute caps and
 * refunds, where every rating comes from, and a scouting report. The rules are the core's
 * (`checkAllocationVNext`); this screen only lets the player try them.
 */
export function CreateBuild({
  profile,
  mechanics,
  allocation,
  presetId,
  bonusBudget,
  firstRoles = null,
  onChange,
}: {
  readonly profile: CreatedPositionPlayerProfile;
  readonly mechanics: CareerVNextMechanics;
  readonly allocation: AllocationVNext;
  readonly presetId: string | null;
  readonly bonusBudget: number;
  /** The first role each real offer projects (the same seed the career will use). */
  readonly firstRoles?: readonly DepthRoleId[] | null;
  readonly onChange: (allocation: AllocationVNext, presetId: string | null) => void;
}): React.JSX.Element {
  const { t } = useAppTranslation();
  const tuning = VNEXT_ALLOCATION_TUNING;
  const presets = useMemo(
    () => allocationPresetsVNext(profile, mechanics, bonusBudget),
    [profile, mechanics, bonusBudget],
  );
  const check = checkAllocationVNext(profile, allocation, bonusBudget);
  const rows = [
    ...creationBreakdownVNext(profile.positionId, mechanics.creation, mechanics, allocation),
  ].sort(
    (left, right) =>
      right.overallWeightPermille - left.overallWeightPermille ||
      left.attributeId.localeCompare(right.attributeId),
  );
  const report = scoutingReportVNext(applyAllocationVNext(profile, allocation), mechanics);
  const ratings = profile.attributes as unknown as Readonly<Record<string, { rating: number }>>;
  const step = (attributeId: string, delta: number) => {
    const next = { ...allocation, [attributeId]: (allocation[attributeId] ?? 0) + delta };
    if (next[attributeId] === 0) delete next[attributeId];
    return next;
  };
  const allowed = (next: AllocationVNext) => {
    const result = checkAllocationVNext(profile, next, bonusBudget);
    // Lowering is allowed while over budget only if it moves toward a valid plan.
    return result.ok;
  };
  return (
    <div className="s2-stack">
      <section aria-labelledby="s2-alloc-presets" className="s2-stack" style={{ gap: 8 }}>
        <h2 className="s2-eyebrow" id="s2-alloc-presets">
          {t('v2.alloc.presetsTitle')}
        </h2>
        <div className="s2-swatches" role="group" aria-labelledby="s2-alloc-presets">
          {presets.map((preset) => (
            <button
              aria-pressed={presetId === preset.id}
              className="s2-swatch"
              key={preset.id}
              onClick={() => onChange(preset.allocation, preset.id)}
              type="button"
            >
              {t(PRESET_KEYS[preset.id]!)}
            </button>
          ))}
        </div>
        <p className="s2-note">{t('v2.alloc.presetHelp')}</p>
      </section>

      <section aria-labelledby="s2-alloc-title" className="s2-stack" style={{ gap: 8 }}>
        <div className="s2-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="s2-eyebrow" id="s2-alloc-title">
            {t('v2.alloc.title')}
          </h2>
          <span className="s2-row" style={{ gap: 8, alignItems: 'center' }}>
            <strong aria-live="polite" className={`s2-num ${check.remaining < 0 ? 's2-down' : ''}`}>
              {t('v2.alloc.remaining', { count: check.remaining })}
            </strong>
            <button className="s2-chipbtn" onClick={() => onChange({}, null)} type="button">
              {t('v2.alloc.reset')}
            </button>
          </span>
        </div>
        <p className="s2-note">
          {t('v2.alloc.help', {
            raise: tuning.maxRaise,
            lower: tuning.maxLower,
            refund: tuning.maxRefund,
            ceiling: tuning.ceiling,
          })}
        </p>
        <ul className="s2-alloc">
          {rows.map((row) => {
            const name = t(attributeNameKey(row.attributeId));
            const own = allocation[row.attributeId] ?? 0;
            return (
              <li className="s2-alloc__row" key={row.attributeId}>
                <span className="s2-alloc__name">
                  {name}
                  <span className="s2-note">
                    {row.overallWeightPermille > 0
                      ? t('v2.alloc.weight', { weight: Math.round(row.overallWeightPermille / 10) })
                      : t('v2.alloc.noWeight')}
                  </span>
                </span>
                <button
                  aria-label={t('v2.alloc.lower', { attribute: name })}
                  className="s2-alloc__step"
                  disabled={!allowed(step(row.attributeId, -1))}
                  onClick={() => onChange(step(row.attributeId, -1), null)}
                  type="button"
                >
                  −
                </button>
                <span className="s2-num s2-alloc__value">
                  {(ratings[row.attributeId]?.rating ?? 0) + own}
                  <span className={own > 0 ? 's2-up' : own < 0 ? 's2-down' : 's2-note'}>
                    {' '}
                    {signed(own)}
                  </span>
                </span>
                <button
                  aria-label={t('v2.alloc.raise', { attribute: name })}
                  className="s2-alloc__step"
                  disabled={!allowed(step(row.attributeId, 1))}
                  onClick={() => onChange(step(row.attributeId, 1), null)}
                  type="button"
                >
                  +
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <details className="s2-disclosure">
        <summary>{t('v2.alloc.sources')}</summary>
        <div className="s2-tablewrap">
          <table className="s2-table">
            <thead>
              <tr>
                <th scope="col">{t('v2.alloc.colAttribute')}</th>
                <th scope="col">{t('v2.alloc.colBase')}</th>
                <th scope="col">{t('v2.alloc.colStyle')}</th>
                <th scope="col">{t('v2.alloc.colBackground')}</th>
                <th scope="col">{t('v2.alloc.colTraits')}</th>
                <th scope="col">{t('v2.alloc.colYours')}</th>
                <th scope="col">{t('v2.alloc.colTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.attributeId}>
                  <th scope="row">{t(attributeNameKey(row.attributeId))}</th>
                  <td className="s2-num">{row.base}</td>
                  <td className="s2-num">{signed(row.style)}</td>
                  <td className="s2-num">{signed(row.background)}</td>
                  <td className="s2-num">{signed(row.personality)}</td>
                  <td className="s2-num">{signed(row.allocation)}</td>
                  <td className="s2-num">
                    <strong>{row.total}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="s2-note">{t('v2.alloc.overallNote')}</p>
      </details>

      {report !== null && (
        <section aria-labelledby="s2-scout" className="s2-panel s2-stack" style={{ gap: 6 }}>
          <h2 className="s2-eyebrow" id="s2-scout">
            {t('v2.scout.title')}
          </h2>
          <p className="s2-display" style={{ fontSize: 24 }}>
            {t('v2.scout.overall', { value: report.overall })}
          </p>
          <p>
            {t('v2.scout.strengths', {
              list: report.strengths.map((id) => t(attributeNameKey(id))).join(' · '),
            })}
          </p>
          <p>
            {t('v2.scout.weaknesses', {
              list: report.weaknesses.map((id) => t(attributeNameKey(id))).join(' · '),
            })}
          </p>
          <p className="s2-note">
            {t('v2.scout.recruit', {
              score: report.recruitScore,
              standing: signed(report.recruitStanding),
              target: report.offerTarget,
            })}
          </p>
          {firstRoles !== null && firstRoles.length > 0 && (
            <p>
              {t('v2.scout.firstRole', {
                count: firstRoles.length,
                list: ROLE_ORDER.filter((roleId) => firstRoles.includes(roleId))
                  .map(
                    (roleId) =>
                      `${t(ROLE_KEYS[roleId])} ×${firstRoles.filter((id) => id === roleId).length}`,
                  )
                  .join(' · '),
              })}
            </p>
          )}
          <PotentialCurve backgroundId={profile.recruitingBackgroundId} />
          <p className="s2-note">{t('v2.scout.condition')}</p>
        </section>
      )}
    </div>
  );
}
