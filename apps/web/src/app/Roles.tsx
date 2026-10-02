import {
  careerRoleStatusVNext,
  snapMomentVNext,
  type CareerVNext,
  type CareerVNextMechanics,
  type DepthMovementReasonVNext,
  type DepthRoleId,
  type RoleStatusIdVNext,
  type SnapMomentVNext,
} from '@project-saturday/game-core';
import type { MessageKey } from '@project-saturday/game-content/locales';

import { useAppTranslation } from '../i18n/i18n';
import { DEPTH_COMPONENT_KEYS, athleteName, participantName } from './content';

const STATUS_KEYS = {
  SECURE: 'v2.roleStatus.secure',
  CONTESTED: 'v2.roleStatus.contested',
  AT_RISK: 'v2.roleStatus.atRisk',
} as const satisfies Record<RoleStatusIdVNext, MessageKey>;

const STATUS_CHIP_KEYS = {
  SECURE: 'v2.roleStatus.chip.secure',
  CONTESTED: 'v2.roleStatus.chip.contested',
  AT_RISK: 'v2.roleStatus.chip.atRisk',
} as const satisfies Record<RoleStatusIdVNext, MessageKey>;

const MOMENT_KEYS = {
  CLOSING_DRIVE: 'v2.snapMoment.closingDrive',
  ROTATION_SERIES: 'v2.snapMoment.rotationSeries',
  LATE_PACKAGE: 'v2.snapMoment.latePackage',
} as const satisfies Record<SnapMomentVNext, MessageKey>;

/** Role security against the teammate right below, with the recovery path (ROLE-03). */
export function RoleStatusLine({
  career,
  mechanics,
}: {
  readonly career: CareerVNext;
  readonly mechanics: CareerVNextMechanics;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  const status = careerRoleStatusVNext(career, mechanics);
  const room = career.program?.room;
  if (status === null || room === undefined) return null;
  if (status.challengerId === null || status.pointsToLose === null)
    return <span id="s2-role-status">{t('v2.roleStatus.bottom')}</span>;
  return (
    <span data-status={status.status} id="s2-role-status">
      <span className={`s2-effect ${status.status === 'SECURE' ? 's2-effect--up' : ''}`}>
        {t(STATUS_CHIP_KEYS[status.status])}
      </span>{' '}
      {t(STATUS_KEYS[status.status], {
        name: participantName(t, room, status.challengerId, athleteName(t, career)),
        points: status.pointsToLose.toFixed(1),
        secure: status.pointsToSecure.toFixed(1),
        component:
          status.challengerLead === null ? '—' : t(DEPTH_COMPONENT_KEYS[status.challengerLead]),
      })}
    </span>
  );
}

/** The component that decided a depth move (ROLE-06). */
export function MovementReason({
  career,
  reason,
  neighborId,
}: {
  readonly career: CareerVNext;
  readonly reason: DepthMovementReasonVNext | undefined;
  readonly neighborId: string | null;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  const room = career.program?.room;
  if (reason === undefined || room === undefined) return null;
  const name =
    neighborId === null ? '' : participantName(t, room, neighborId, athleteName(t, career));
  const component = t(DEPTH_COMPONENT_KEYS[reason.componentId]);
  return (
    <p className="s2-note" id="s2-move-reason">
      {reason.side === 'YOURS'
        ? t('v2.report.reason.yours', { component })
        : reason.componentId === 'practiceForm'
          ? t('v2.report.reason.rivalForm', { name })
          : t('v2.report.reason.theirs', { name, component })}
    </p>
  );
}

/** What kind of moment this live snap is for the athlete's role (ROLE-05). */
export function SnapMoment({
  roleId,
  index,
  count,
}: {
  readonly roleId: DepthRoleId;
  readonly index: number;
  readonly count: number;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  const moment = snapMomentVNext(roleId, index, count);
  return moment === null ? null : (
    <span className="s2-effect" id="s2-snap-moment">
      {t(MOMENT_KEYS[moment])}
    </span>
  );
}
