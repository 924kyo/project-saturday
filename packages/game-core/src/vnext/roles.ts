import type {
  PositionDepthComponentId,
  PositionDepthEvaluation,
  PositionDepthUpdateEvidence,
  PositionRoomContext,
} from '../programs/position-room.js';
import type { DepthRoleId } from '../programs/ids.js';
import type { CareerVNext, CareerVNextMechanics } from './types.js';

/**
 * Role security (M12 Phase 5, playtest report "role security"): where the athlete's spot stands
 * against the teammate right below, on the depth chart's own numbers. A change of order needs the
 * hysteresis margin (`hysteresisThresholdMilli`), so:
 *
 * - **SECURE** — the athlete leads that teammate by at least the margin;
 * - **CONTESTED** — the athlete leads, by less than the margin;
 * - **AT_RISK** — that teammate already scores higher; once the gap reaches the margin, the next
 *   practice update swaps them.
 */
export type RoleStatusIdVNext = 'SECURE' | 'CONTESTED' | 'AT_RISK';

const COMPONENTS: readonly PositionDepthComponentId[] = [
  'talentFit',
  'coachTrust',
  'practiceForm',
  'schemeFit',
  'experienceReadiness',
];

const contribution = (entry: PositionDepthEvaluation, id: PositionDepthComponentId) =>
  entry.contributions[`${id}Milli`];

/** The component where `ahead` leads `behind` by the most (null when it leads in none). */
function largestLead(
  ahead: PositionDepthEvaluation,
  behind: PositionDepthEvaluation,
): PositionDepthComponentId | null {
  let best: PositionDepthComponentId | null = null;
  let gap = 0;
  for (const id of COMPONENTS) {
    const lead = contribution(ahead, id) - contribution(behind, id);
    if (lead > gap) {
      gap = lead;
      best = id;
    }
  }
  return best;
}

export interface RoleStatusVNext {
  readonly status: RoleStatusIdVNext;
  readonly rank: number;
  readonly roleId: DepthRoleId;
  /** The teammate right below (null at the bottom of the chart). */
  readonly challengerId: string | null;
  /** Points (one decimal) that teammate must gain on the athlete to move past: margin + gap. */
  readonly pointsToLose: number | null;
  /** Points the athlete needs on that teammate to be secure again (0 when secure). */
  readonly pointsToSecure: number;
  /** Where the teammate below leads the athlete most: the recovery path (null when nowhere). */
  readonly challengerLead: PositionDepthComponentId | null;
}

export function roleStatusVNext(
  room: PositionRoomContext,
  mechanics: Pick<CareerVNextMechanics, 'room'>,
): RoleStatusVNext | null {
  const index = room.evaluations.findIndex(({ participantId }) => participantId === room.playerId);
  const player = room.evaluations[index];
  if (player === undefined) return null;
  const below = room.evaluations[index + 1];
  const threshold = mechanics.room.hysteresisThresholdMilli;
  const points = (milli: number) => Math.max(0, Math.ceil(milli / 100) / 10);
  if (below === undefined)
    return {
      status: 'SECURE',
      rank: index + 1,
      roleId: player.roleId,
      challengerId: null,
      pointsToLose: null,
      pointsToSecure: 0,
      challengerLead: null,
    };
  const margin = player.totalScoreMilli - below.totalScoreMilli;
  return {
    status: margin >= threshold ? 'SECURE' : margin >= 0 ? 'CONTESTED' : 'AT_RISK',
    rank: index + 1,
    roleId: player.roleId,
    challengerId: below.participantId,
    pointsToLose: points(margin + threshold),
    pointsToSecure: points(threshold - margin),
    challengerLead: largestLead(below, player),
  };
}

/** The athlete's role status this week (null before a program). */
export function careerRoleStatusVNext(
  career: Pick<CareerVNext, 'program'>,
  mechanics: Pick<CareerVNextMechanics, 'room'>,
): RoleStatusVNext | null {
  return career.program === null ? null : roleStatusVNext(career.program.room, mechanics);
}

/**
 * Why the depth chart moved (ROLE-06): the component that decided it, read from the updated room.
 * A promotion names the athlete's biggest edge over the teammate passed; a demotion names the
 * passing teammate's biggest edge (practice form there is the rival's form).
 */
export interface DepthMovementReasonVNext {
  readonly side: 'YOURS' | 'THEIRS';
  readonly componentId: PositionDepthComponentId;
}

export function depthMovementReasonVNext(
  room: PositionRoomContext,
  evidence: Pick<PositionDepthUpdateEvidence, 'movement' | 'neighborParticipantId'>,
): DepthMovementReasonVNext | null {
  if (evidence.movement === 'HELD' || evidence.neighborParticipantId === null) return null;
  const player = room.evaluations.find(({ participantId }) => participantId === room.playerId);
  const neighbor = room.evaluations.find(
    ({ participantId }) => participantId === evidence.neighborParticipantId,
  );
  if (player === undefined || neighbor === undefined) return null;
  const componentId =
    evidence.movement === 'PROMOTED'
      ? largestLead(player, neighbor)
      : largestLead(neighbor, player);
  return componentId === null
    ? null
    : { side: evidence.movement === 'PROMOTED' ? 'YOURS' : 'THEIRS', componentId };
}
