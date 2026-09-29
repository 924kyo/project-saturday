import {
  createPositionAlphaSession,
  commitPositionAlphaOffseason,
  choosePositionAlphaSkill,
  equipPositionAlphaSkill,
  resolvePositionAlphaEvent,
  parsePositionAlphaSessionJson,
  parsePositionAlphaSessionV2Json,
  serializePositionAlphaSessionV2Json,
  parsePositionAlphaSessionWireV3Json,
  serializePositionAlphaSessionWireV3Json,
  migratePositionAlphaSessionV1ToV2,
  resolvePositionAlphaSeason,
  resolvePositionAlphaWeek,
  type AddedPositionId,
  type CreatePositionAlphaSessionInput,
  type CreatePositionAlphaSessionResult,
  type PositionAlphaSessionFoundationMechanics,
  type PositionAlphaSessionCommandMechanics,
  type PositionAlphaDecisionStrategy,
  type PositionAlphaSessionV1,
  type PositionAlphaSessionV2,
  type ResolvePositionAlphaWeekResult,
} from '@project-saturday/game-core';

import { cbAlphaDecisions, cbAlphaEvents, cbAlphaPatterns, cbAlphaSkills } from './cb-alpha.js';
import { injuryOutcomeMechanicsDefinitions, injuryTuning } from './injuries.js';
import { positionCommonFocusDefinitions, positionFocusInjuryPolicies } from './position-focus.js';
import { positionSkillBuilds, positionSkillActionTags } from './position-skill-builds.js';
import { positionSkillOffers } from './position-skill-offers.js';
import { positionLifecycleMechanics } from './position-lifecycle-mechanics.js';
import { offFieldMechanicsCatalog } from './off-field.js';
import { positionAlphaContent } from './positions.js';
import { rosterNameMechanicsPool } from './programs.js';
import { qbAlphaDecisions, qbAlphaEvents, qbAlphaPatterns, qbAlphaSkills } from './qb-alpha.js';
import { rbAlphaDecisions, rbAlphaEvents, rbAlphaPatterns, rbAlphaSkills } from './rb-alpha.js';
import { buildPositionCreationMechanics } from './position-creation-mechanics.js';
import { buildPositionRoomMechanics } from './position-room-mechanics.js';
import { developmentWeekConfig } from './weekly-actions.js';
import {
  worldAlphaMechanicsDefinition,
  worldAlphaNilProgramStrengthBands,
} from './world-alpha-mechanics.js';

export type ShippedPositionAlphaSessionResult = CreatePositionAlphaSessionResult;

export function buildShippedPositionAlphaSessionFoundation(
  input: Pick<CreatePositionAlphaSessionInput, 'identity'>,
): PositionAlphaSessionFoundationMechanics | null {
  const creation = buildPositionCreationMechanics({
    positionId: input.identity.positionId,
    archetypeId: input.identity.archetypeId,
    recruitingBackgroundId: input.identity.recruitingBackgroundId,
    personalityTraitIds: input.identity.personalityTraitIds,
  });
  const room = buildPositionRoomMechanics(input.identity.positionId);
  if (!creation.ok || room === undefined) return null;
  const skillIds =
    input.identity.positionId === 'position_qb'
      ? qbAlphaSkills.map(({ id }) => id)
      : input.identity.positionId === 'position_rb'
        ? rbAlphaSkills.map(({ id }) => id)
        : cbAlphaSkills.map(({ id }) => id);
  const events =
    input.identity.positionId === 'position_qb'
      ? qbAlphaEvents
      : input.identity.positionId === 'position_rb'
        ? rbAlphaEvents
        : cbAlphaEvents;
  return {
    creation: creation.mechanics,
    room,
    roomNames: rosterNameMechanicsPool,
    world: worldAlphaMechanicsDefinition,
    skillIds,
    eventIds: events.map(({ id }) => id),
    eventChoiceIds: events.flatMap(({ choices }) => choices.map(({ id }) => id)),
  };
}

export function createShippedPositionAlphaSession(
  input: CreatePositionAlphaSessionInput & {
    readonly identity: CreatePositionAlphaSessionInput['identity'] & {
      readonly positionId: AddedPositionId;
    };
  },
): ShippedPositionAlphaSessionResult {
  const mechanics = buildShippedPositionAlphaSessionFoundation(input);
  return mechanics === null
    ? { ok: false, reason: 'position_alpha_session.invalid_input' }
    : createPositionAlphaSession(input, mechanics);
}

export function buildShippedPositionAlphaSessionCommandMechanics(
  input: Pick<CreatePositionAlphaSessionInput, 'identity'>,
): PositionAlphaSessionCommandMechanics | null {
  const foundation = buildShippedPositionAlphaSessionFoundation(input);
  if (foundation === null) return null;
  return {
    ...foundation,
    skillOffers: positionSkillOffers.filter(
      ({ positionId }) => positionId === input.identity.positionId,
    ),
    academics: offFieldMechanicsCatalog.academics,
    skillBuilds: {
      definitions: positionSkillBuilds
        .filter(({ positionId }) => positionId === input.identity.positionId)
        .map(({ mechanics }) => mechanics),
      actionTags: positionSkillActionTags,
    },
    nil: {
      skillIds: foundation.skillIds,
      skillDefinitions: positionSkillBuilds
        .filter(({ positionId }) => positionId === input.identity.positionId)
        .map(({ mechanics }) => mechanics),
      catalog: offFieldMechanicsCatalog,
      programStrengthBands: worldAlphaNilProgramStrengthBands,
    },
    trainingActions: positionAlphaContent.trainingActions,
    trainingConfig: developmentWeekConfig,
    injuries: { outcomes: injuryOutcomeMechanicsDefinitions, tuning: injuryTuning },
    commonFocuses: positionCommonFocusDefinitions,
    focusInjuryPolicies: positionFocusInjuryPolicies,
    lifecycle: positionLifecycleMechanics,
    qb: {
      decisions: qbAlphaDecisions,
      patterns: qbAlphaPatterns,
      skills: qbAlphaSkills,
      events: qbAlphaEvents,
    },
    rb: {
      decisions: rbAlphaDecisions,
      patterns: rbAlphaPatterns,
      skills: rbAlphaSkills,
      events: rbAlphaEvents,
    },
    cb: {
      decisions: cbAlphaDecisions,
      patterns: cbAlphaPatterns,
      skills: cbAlphaSkills,
      events: cbAlphaEvents,
    },
  };
}

export function resolveShippedPositionAlphaWeek(
  session: PositionAlphaSessionV1,
  actionId: unknown,
  strategy: PositionAlphaDecisionStrategy,
): ResolvePositionAlphaWeekResult {
  const mechanics = buildShippedPositionAlphaSessionCommandMechanics({
    identity: session.player,
  });
  return mechanics === null
    ? { ok: false, reason: 'position_alpha_session.invalid_command' }
    : resolvePositionAlphaWeek(session, actionId, strategy, mechanics);
}

export function resolveShippedPositionAlphaSeason(
  session: PositionAlphaSessionV1,
  strategy: PositionAlphaDecisionStrategy,
): ResolvePositionAlphaWeekResult {
  const mechanics = buildShippedPositionAlphaSessionCommandMechanics({ identity: session.player });
  return mechanics === null
    ? { ok: false, reason: 'position_alpha_session.invalid_command' }
    : resolvePositionAlphaSeason(session, strategy, mechanics);
}

export function commitShippedPositionAlphaOffseason(
  session: PositionAlphaSessionV1,
  selectedProgramId: unknown,
): ResolvePositionAlphaWeekResult {
  const mechanics = buildShippedPositionAlphaSessionCommandMechanics({ identity: session.player });
  return mechanics === null || typeof selectedProgramId !== 'string'
    ? { ok: false, reason: 'position_alpha_session.invalid_command' }
    : commitPositionAlphaOffseason(session, selectedProgramId as `program_${string}`, mechanics);
}

export function chooseShippedPositionAlphaSkill(
  session: PositionAlphaSessionV1,
  skillId: unknown,
): ResolvePositionAlphaWeekResult {
  const mechanics = buildShippedPositionAlphaSessionCommandMechanics({ identity: session.player });
  return mechanics === null
    ? { ok: false, reason: 'position_alpha_session.invalid_command' }
    : choosePositionAlphaSkill(session, skillId, mechanics);
}

export function equipShippedPositionAlphaSkill(
  session: PositionAlphaSessionV1,
  skillId: unknown,
  slotIndex: unknown,
): ResolvePositionAlphaWeekResult {
  const mechanics = buildShippedPositionAlphaSessionCommandMechanics({ identity: session.player });
  return mechanics === null
    ? { ok: false, reason: 'position_alpha_session.invalid_command' }
    : equipPositionAlphaSkill(session, skillId, slotIndex, mechanics);
}

export function resolveShippedPositionAlphaEvent(
  session: PositionAlphaSessionV1,
  choiceId: unknown,
): ResolvePositionAlphaWeekResult {
  const mechanics = buildShippedPositionAlphaSessionCommandMechanics({ identity: session.player });
  return mechanics === null
    ? { ok: false, reason: 'position_alpha_session.invalid_command' }
    : resolvePositionAlphaEvent(session, choiceId, mechanics);
}

export function parseShippedPositionAlphaSessionJson(json: string): PositionAlphaSessionV1 | null {
  try {
    const raw: unknown = JSON.parse(json);
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
    const player = (raw as { readonly player?: unknown }).player;
    if (typeof player !== 'object' || player === null || Array.isArray(player)) return null;
    const identity = player as CreatePositionAlphaSessionInput['identity'];
    const mechanics = buildShippedPositionAlphaSessionFoundation({ identity });
    return mechanics === null ? null : parsePositionAlphaSessionJson(json, mechanics);
  } catch {
    return null;
  }
}

/** Current domain creation uses the same original creation/room/world rules and zero-draw migration. */
export function createShippedPositionAlphaSessionV2(
  input: CreatePositionAlphaSessionInput,
):
  | { readonly ok: true; readonly session: PositionAlphaSessionV2 }
  | Extract<CreatePositionAlphaSessionResult, { readonly ok: false }> {
  const initial = createShippedPositionAlphaSession(input);
  if (!initial.ok) return initial;
  const mechanics = buildShippedPositionAlphaSessionCommandMechanics({
    identity: initial.session.player,
  });
  const session =
    mechanics === null ? null : migratePositionAlphaSessionV1ToV2(initial.session, mechanics);
  return session === null
    ? { ok: false, reason: 'position_alpha_session.invalid_input' }
    : { ok: true, session };
}

function commandMechanicsFromSavedPlayer(
  body: unknown,
): PositionAlphaSessionCommandMechanics | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const player = (body as Record<string, unknown>)['player'];
  if (typeof player !== 'object' || player === null || Array.isArray(player)) return null;
  return buildShippedPositionAlphaSessionCommandMechanics({
    identity: player as CreatePositionAlphaSessionInput['identity'],
  });
}

/** Literal v1/raw-v2 readers remain valid; only the tagged current wire is written by v2. */
export function parseShippedPositionAlphaSessionV2Json(
  json: string,
): PositionAlphaSessionV2 | null {
  try {
    const raw: unknown = JSON.parse(json);
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
    const fields = raw as Record<string, unknown>;
    const body = fields['model'] === 'position_alpha_session_wire_v2' ? fields['session'] : fields;
    const mechanics = commandMechanicsFromSavedPlayer(body);
    if (mechanics === null) return null;
    if (fields['model'] === 'position_alpha_session_v1') {
      const historical = parseShippedPositionAlphaSessionJson(json);
      return historical === null ? null : migratePositionAlphaSessionV1ToV2(historical, mechanics);
    }
    return parsePositionAlphaSessionV2Json(json, mechanics);
  } catch {
    return null;
  }
}

export function serializeShippedPositionAlphaSessionV2Json(
  session: PositionAlphaSessionV2,
): string | null {
  const mechanics = buildShippedPositionAlphaSessionCommandMechanics({ identity: session.player });
  return mechanics === null ? null : serializePositionAlphaSessionV2Json(session, mechanics);
}

/** Wire-v3 reader with explicit read-only v1/v2 compatibility; gameplay remains domain v2. */
export function parseShippedPositionAlphaSessionV3Json(
  json: string,
): PositionAlphaSessionV2 | null {
  try {
    const raw: unknown = JSON.parse(json);
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
    const fields = raw as Record<string, unknown>;
    if (fields['model'] !== 'position_alpha_session_wire_v3')
      return parseShippedPositionAlphaSessionV2Json(json);
    const mechanics = commandMechanicsFromSavedPlayer(fields['session']);
    return mechanics === null ? null : parsePositionAlphaSessionWireV3Json(json, mechanics);
  } catch {
    return null;
  }
}

export function serializeShippedPositionAlphaSessionV3Json(
  session: PositionAlphaSessionV2,
): string | null {
  const mechanics = buildShippedPositionAlphaSessionCommandMechanics({ identity: session.player });
  return mechanics === null ? null : serializePositionAlphaSessionWireV3Json(session, mechanics);
}
