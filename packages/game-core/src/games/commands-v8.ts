import {
  migrateCareerRunV7ToV8,
  parseCareerRunV8,
  projectWrTacticalCareerV8,
  type CareerRunV8,
} from '../player/career-v8.js';
import { deepFreeze } from '../player/immutable.js';
import { parseCareerRunV7 } from '../player/persistence.js';
import type { CareerRunV7 } from '../player/types.js';
import type { GameCommandFailureReason, KeySnapDecisionId } from './ids.js';
import {
  advanceWrTacticalGameV1,
  chooseWrTacticalSnapV1,
  prepareWrTacticalGameV1,
  startWrTacticalGameV1,
  type WrTacticalGameV1,
  type WrTacticalMechanicsV1,
} from './tactical-wr-game-v1.js';
import { prepareGame, prepareScheduledGame, resolveKeySnap, startGame } from './transitions.js';
import type {
  GameCommandResult,
  GameOpponentMechanicsProfile,
  ScheduledGameIdentity,
} from './types.js';

export type GameCommandResultV8 =
  | { readonly ok: true; readonly career: CareerRunV8 }
  | { readonly ok: false; readonly career: CareerRunV8; readonly reason: GameCommandFailureReason };

function failure(career: CareerRunV8, reason: GameCommandFailureReason): GameCommandResultV8 {
  return Object.freeze({ ok: false, career, reason });
}

/** Only exact unmarked neutral states may enter historical commands. No evidence is stripped. */
function literalSource(career: CareerRunV8): CareerRunV7 | undefined {
  if (Object.hasOwn(career, 'tacticalGame')) return undefined;
  const parsed = parseCareerRunV7({ ...career, schemaVersion: 7 });
  return parsed.ok ? parsed.career : undefined;
}

function publishRecord(
  previous: CareerRunV8,
  record: WrTacticalGameV1 | undefined,
  mechanics: WrTacticalMechanicsV1,
): GameCommandResultV8 {
  const career = record === undefined ? undefined : projectWrTacticalCareerV8(record, mechanics);
  return career === undefined
    ? failure(previous, 'game.internal_invariant_failure')
    : deepFreeze({ ok: true, career });
}

function publishHistorical(previous: CareerRunV8, result: GameCommandResult): GameCommandResultV8 {
  return result.ok
    ? deepFreeze({ ok: true, career: migrateCareerRunV7ToV8(result.career) })
    : failure(previous, result.reason);
}

function prepareCurrent(
  career: CareerRunV8,
  mechanics: WrTacticalMechanicsV1,
  prepare: (source: CareerRunV7) => GameCommandResult,
): GameCommandResultV8 {
  const parsed = parseCareerRunV8(career, mechanics);
  if (!parsed.ok) return failure(career, 'game.invalid_career');
  if (parsed.career.phase.type !== 'WEEK_END') return failure(career, 'game.invalid_phase');
  const source = literalSource(parsed.career);
  if (source === undefined) return failure(career, 'game.invalid_career');
  const prepared = prepare(source);
  if (!prepared.ok) return failure(career, prepared.reason);
  return publishRecord(career, prepareWrTacticalGameV1(prepared.career, mechanics), mechanics);
}

/** New-game-only activation, with the original preparation rule and no additional draws/revision. */
export function prepareGameV8(
  career: CareerRunV8,
  playerProfile: GameOpponentMechanicsProfile,
  opponentProfile: GameOpponentMechanicsProfile,
  mechanics: WrTacticalMechanicsV1,
): GameCommandResultV8 {
  return prepareCurrent(career, mechanics, (source) =>
    prepareGame(
      source,
      playerProfile,
      opponentProfile,
      mechanics.tuning,
      mechanics.families,
      mechanics.patterns,
      mechanics.skills,
    ),
  );
}

export function prepareScheduledGameV8(
  career: CareerRunV8,
  identity: ScheduledGameIdentity,
  playerProfile: GameOpponentMechanicsProfile,
  opponentProfile: GameOpponentMechanicsProfile,
  mechanics: WrTacticalMechanicsV1,
  availability?: Parameters<typeof prepareScheduledGame>[8],
): GameCommandResultV8 {
  return prepareCurrent(career, mechanics, (source) =>
    prepareScheduledGame(
      source,
      identity,
      playerProfile,
      opponentProfile,
      mechanics.tuning,
      mechanics.families,
      mechanics.patterns,
      mechanics.skills,
      availability,
    ),
  );
}

function gameCommand(
  career: CareerRunV8,
  operation: 'START' | 'CHOOSE' | 'CONTINUE',
  mechanics: WrTacticalMechanicsV1,
  decisionId?: KeySnapDecisionId,
): GameCommandResultV8 {
  const parsed = parseCareerRunV8(career, mechanics);
  if (!parsed.ok) return failure(career, 'game.invalid_career');
  const current = parsed.career;
  if (current.revision >= Number.MAX_SAFE_INTEGER)
    return failure(career, 'game.revision_exhausted');
  const phase =
    operation === 'START' ? 'GAME_PREVIEW' : operation === 'CHOOSE' ? 'KEY_SNAP' : 'SNAP_RESOLVED';
  if (current.phase.type !== phase) return failure(career, 'game.invalid_phase');
  if (
    operation === 'CHOOSE' &&
    (decisionId === undefined ||
      current.phase.type !== 'KEY_SNAP' ||
      !current.phase.pendingSnap.decisionIds.includes(decisionId))
  )
    return failure(career, 'game.invalid_decision');
  if (current.tacticalGame !== undefined) {
    const next =
      operation === 'START'
        ? startWrTacticalGameV1(current.tacticalGame, mechanics)
        : operation === 'CONTINUE'
          ? advanceWrTacticalGameV1(current.tacticalGame, mechanics)
          : chooseWrTacticalSnapV1(current.tacticalGame, decisionId!, mechanics);
    return publishRecord(career, next, mechanics);
  }
  const source = literalSource(current);
  if (source === undefined) return failure(career, 'game.invalid_career');
  if (operation === 'CONTINUE') return failure(career, 'game.invalid_phase');
  return publishHistorical(
    career,
    operation === 'START'
      ? startGame(
          source,
          mechanics.tuning,
          mechanics.families,
          mechanics.patterns,
          mechanics.skills,
        )
      : resolveKeySnap(
          source,
          decisionId!,
          mechanics.tuning,
          mechanics.families,
          mechanics.patterns,
          mechanics.skills,
        ),
  );
}

export function startGameV8(
  career: CareerRunV8,
  mechanics: WrTacticalMechanicsV1,
): GameCommandResultV8 {
  return gameCommand(career, 'START', mechanics);
}

export function resolveKeySnapV8(
  career: CareerRunV8,
  decisionId: KeySnapDecisionId,
  mechanics: WrTacticalMechanicsV1,
): GameCommandResultV8 {
  return gameCommand(career, 'CHOOSE', mechanics, decisionId);
}

export function continueResolvedSnapV8(
  career: CareerRunV8,
  mechanics: WrTacticalMechanicsV1,
): GameCommandResultV8 {
  return gameCommand(career, 'CONTINUE', mechanics);
}
