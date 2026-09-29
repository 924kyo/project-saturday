import type { PositionAlphaSessionV1 } from '@project-saturday/game-core';
import {
  chooseShippedPositionAlphaSkill,
  commitShippedPositionAlphaOffseason,
  createShippedPositionAlphaSession,
  defaultWrAppearance,
  positionAlphaContent,
  resolveShippedPositionAlphaEvent,
  resolveShippedPositionAlphaSeason,
  resolveShippedPositionAlphaWeek,
} from '@project-saturday/game-content';

export const POSITION_ALPHA_TRANSFER_CASES = [
  ['position_qb', 'archetype_qb_field_general'],
  ['position_rb', 'archetype_rb_power_back'],
  ['position_cb', 'archetype_cb_press_man'],
] as const;

type TransferCase = (typeof POSITION_ALPHA_TRANSFER_CASES)[number];

export function createTransferredPositionAlphaSession(
  positionId: TransferCase[0],
  archetypeId: TransferCase[1],
  seedPrefix = 'm7-transfer-fixture',
): PositionAlphaSessionV1 {
  const created = createShippedPositionAlphaSession({
    careerSeed: `${seedPrefix}-${positionId}`,
    programId: 'program_ember_peak_polytechnic',
    identity: {
      displayName: 'Transfer Player',
      positionId,
      archetypeId,
      recruitingBackgroundId: 'background_late_bloomer',
      personalityTraitIds: ['personality_disciplined', 'personality_leader'],
      appearance: defaultWrAppearance,
      heightCm: 188,
      weightKg: 92,
    },
  });
  if (!created.ok) throw new Error(created.reason);
  const actions = positionAlphaContent.trainingActions.filter(
    (action) => action.positionId === positionId,
  );
  let session = created.session;
  for (let weekIndex = 0; weekIndex < 12; weekIndex += 1) {
    const resolved = resolveShippedPositionAlphaWeek(
      session,
      actions[weekIndex % actions.length]!.id,
      'best_fit',
    );
    if (!resolved.ok) throw new Error(resolved.reason);
    session = resolved.session;
    if (session.skills.offeredSkillIds !== null) {
      const chosen = chooseShippedPositionAlphaSkill(session, session.skills.offeredSkillIds[0]);
      if (!chosen.ok) throw new Error(chosen.reason);
      session = chosen.session;
    }
    if (session.events.pending !== null) {
      const settled = resolveShippedPositionAlphaEvent(
        session,
        session.events.pending.choiceIds[0],
      );
      if (!settled.ok) throw new Error(settled.reason);
      session = settled.session;
    }
  }
  const reviewed = resolveShippedPositionAlphaSeason(session, 'best_fit');
  if (!reviewed.ok) throw new Error(reviewed.reason);
  const transfer = reviewed.session.lifecycle.offseason?.options[1];
  if (transfer === undefined) throw new Error('Expected a transfer option.');
  const committed = commitShippedPositionAlphaOffseason(reviewed.session, transfer.programId);
  if (!committed.ok) throw new Error(committed.reason);
  return committed.session;
}

export function advancePositionAlphaFixture(
  session: PositionAlphaSessionV1,
): PositionAlphaSessionV1 {
  const action = positionAlphaContent.trainingActions.find(
    ({ positionId }) => positionId === session.player.positionId,
  );
  if (action === undefined) throw new Error('Expected a position training action.');
  const resolved = resolveShippedPositionAlphaWeek(session, action.id, 'best_fit');
  if (!resolved.ok) throw new Error(resolved.reason);
  return resolved.session;
}

export function createCompletedPositionAlphaFixture(
  positionId: TransferCase[0],
  archetypeId: TransferCase[1],
): { readonly offseason: PositionAlphaSessionV1; readonly completed: PositionAlphaSessionV1 } {
  let session = createTransferredPositionAlphaSession(positionId, archetypeId, 'hub-completed');
  for (let week = 0; week < 12; week += 1) {
    session = advancePositionAlphaFixture(session);
    if (session.skills.offeredSkillIds !== null) {
      const chosen = chooseShippedPositionAlphaSkill(session, session.skills.offeredSkillIds[0]);
      if (!chosen.ok) throw new Error(chosen.reason);
      session = chosen.session;
    }
    if (session.events.pending !== null) {
      const settled = resolveShippedPositionAlphaEvent(
        session,
        session.events.pending.choiceIds[0],
      );
      if (!settled.ok) throw new Error(settled.reason);
      session = settled.session;
    }
  }
  const reviewed = resolveShippedPositionAlphaSeason(session, 'best_fit');
  if (!reviewed.ok) throw new Error(reviewed.reason);
  const completed = commitShippedPositionAlphaOffseason(
    reviewed.session,
    reviewed.session.lifecycle.currentProgramId,
  );
  if (!completed.ok) throw new Error(completed.reason);
  return { offseason: reviewed.session, completed: completed.session };
}
