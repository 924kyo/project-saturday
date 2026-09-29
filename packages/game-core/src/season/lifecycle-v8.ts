import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import {
  migrateCareerRunV7ToV8,
  parseCareerRunV8,
  projectWrTacticalCareerV8,
  type CareerRunV8,
} from '../player/career-v8.js';
import { parseCareerRunV7 } from '../player/persistence.js';
import type { CareerRunV7 } from '../player/types.js';
import {
  prepareWrTacticalGameV1,
  type WrTacticalMechanicsV1,
} from '../games/tactical-wr-game-v1.js';
import { matchesExactWrEvidence } from '../games/transitions.js';
import { parseCareerSessionV8, type CareerSessionV8 } from './career-session-v8.js';
import { parseCareerSessionV7 } from './persistence.js';
import type { CareerSessionV7 } from './types.js';

type LegacyCareerResult =
  | { readonly ok: true; readonly career: CareerRunV7 }
  | { readonly ok: false; readonly reason: string };
type LegacySessionResult =
  | { readonly ok: true; readonly session: CareerSessionV7 }
  | { readonly ok: false; readonly reason: string };
type LiftedCareerResult<T extends LegacyCareerResult> =
  | Readonly<Omit<Extract<T, { readonly ok: true }>, 'career'> & { readonly career: CareerRunV8 }>
  | { readonly ok: false; readonly career: CareerRunV8; readonly reason: string };
type LiftedSessionResult<T extends LegacySessionResult> =
  | Readonly<
      Omit<Extract<T, { readonly ok: true }>, 'session'> & { readonly session: CareerSessionV8 }
    >
  | { readonly ok: false; readonly session: CareerSessionV8; readonly reason: string };

/** Caller has already validated the full v8 source. This object is never persisted. */
function consumerCareer(
  career: CareerRunV8,
  acknowledgePostGame: boolean,
): CareerRunV7 | undefined {
  if (acknowledgePostGame && career.phase.type !== 'POST_GAME') return undefined;
  if (career.tacticalGame === undefined) {
    const parsed = parseCareerRunV7({ ...career, schemaVersion: 7 });
    return parsed.ok ? parsed.career : undefined;
  }
  if (
    !acknowledgePostGame ||
    career.phase.type !== 'POST_GAME' ||
    !('rulesVersion' in career.phase)
  )
    return undefined;
  const { tacticalGame: retainedGame, phase, ...root } = career;
  if (retainedGame.boundary.type !== 'POST_GAME') return undefined;
  const { rulesVersion, ...completed } = phase;
  if (rulesVersion !== 'tactical_game_v1') return undefined;
  const keyPlayLog = completed.keyPlayLog.map((play) => {
    if (!('tacticalResult' in play)) return play;
    const { tacticalResult, ...actualPlay } = play;
    if (tacticalResult === undefined) throw new TypeError('v8.invalid_completed_play');
    return actualPlay;
  });
  const parsed = parseCareerRunV7({
    ...root,
    schemaVersion: 7,
    phase: { ...completed, keyPlayLog },
  });
  return parsed.ok ? parsed.career : undefined;
}

function outputCareer(
  previous: CareerRunV8,
  next: CareerRunV7,
  mechanics: WrTacticalMechanicsV1,
  acknowledgePostGame: boolean,
): CareerRunV8 | undefined {
  if (
    next.id !== previous.id ||
    next.careerSeed !== previous.careerSeed ||
    next.revision < previous.revision
  )
    return undefined;
  if (
    acknowledgePostGame &&
    (next.revision <= previous.revision ||
      next.phase.type === 'POST_GAME' ||
      !matchesExactWrEvidence(next.gameCareerState, previous.gameCareerState))
  )
    return undefined;
  if (next.phase.type === 'GAME_PREVIEW' && previous.phase.type !== 'GAME_PREVIEW') {
    const record = prepareWrTacticalGameV1(next, mechanics);
    return record === undefined ? undefined : projectWrTacticalCareerV8(record, mechanics);
  }
  return migrateCareerRunV7ToV8(next);
}

function careerCommand<T extends LegacyCareerResult>(
  career: CareerRunV8,
  mechanics: WrTacticalMechanicsV1,
  command: (source: CareerRunV7) => T,
  acknowledgePostGame: boolean,
): LiftedCareerResult<T> {
  const fail = (reason: string): LiftedCareerResult<T> =>
    Object.freeze({ ok: false, career, reason });
  try {
    const parsed = parseCareerRunV8(career, mechanics);
    if (!parsed.ok) return fail('v8.invalid_career');
    const source = consumerCareer(parsed.career, acknowledgePostGame);
    if (source === undefined) return fail('v8.invalid_phase');
    const result = command(source);
    if (!result.ok) return fail(result.reason);
    // TS cannot narrow the generic success branch through its conditional type.
    const { career: resultCareer, ...evidence } = cloneSerializable(
      result as Extract<T, { readonly ok: true }>,
    );
    const checked = parseCareerRunV7(resultCareer);
    if (!checked.ok) return fail('v8.invalid_command_result');
    const next = outputCareer(parsed.career, checked.career, mechanics, acknowledgePostGame);
    if (next === undefined) return fail('v8.invalid_command_result');
    // Only the known career field is lifted; preserve successful auxiliary evidence.
    return deepFreeze({ ...evidence, career: next });
  } catch {
    return fail('v8.command_failed');
  }
}

function sessionCommand<T extends LegacySessionResult>(
  session: CareerSessionV8,
  mechanics: WrTacticalMechanicsV1,
  command: (source: CareerSessionV7) => T,
  acknowledgePostGame: boolean,
): LiftedSessionResult<T> {
  const fail = (reason: string): LiftedSessionResult<T> =>
    Object.freeze({ ok: false, session, reason });
  try {
    const parsed = parseCareerSessionV8(session, mechanics);
    if (!parsed.ok) return fail('v8.invalid_session');
    const career = consumerCareer(parsed.session.career, acknowledgePostGame);
    if (career === undefined) return fail('v8.invalid_phase');
    const source = parseCareerSessionV7({ schemaVersion: 7, career, world: parsed.session.world });
    if (!source.ok) return fail('v8.invalid_session');
    const result = command(source.session);
    if (!result.ok) return fail(result.reason);
    const { session: resultSession, ...evidence } = cloneSerializable(
      result as Extract<T, { readonly ok: true }>,
    );
    const checked = parseCareerSessionV7(resultSession);
    if (!checked.ok) return fail('v8.invalid_command_result');
    const next = outputCareer(
      parsed.session.career,
      checked.session.career,
      mechanics,
      acknowledgePostGame,
    );
    if (next === undefined) return fail('v8.invalid_command_result');
    const validated = parseCareerSessionV8(
      { schemaVersion: 8, career: next, world: checked.session.world },
      mechanics,
    );
    if (!validated.ok) return fail('v8.invalid_command_result');
    // Meta/alumni and other owning-command outputs remain literal, detached values.
    return deepFreeze({
      ...evidence,
      session: validated.session,
    });
  } catch {
    return fail('v8.command_failed');
  }
}

export function runCareerCommandV8<T extends LegacyCareerResult>(
  career: CareerRunV8,
  mechanics: WrTacticalMechanicsV1,
  command: (source: CareerRunV7) => T,
): LiftedCareerResult<T> {
  return careerCommand(career, mechanics, command, false);
}

export function acknowledgePostGameCareerV8<T extends LegacyCareerResult>(
  career: CareerRunV8,
  mechanics: WrTacticalMechanicsV1,
  command: (source: CareerRunV7) => T,
): LiftedCareerResult<T> {
  return careerCommand(career, mechanics, command, true);
}

export function runSessionCommandV8<T extends LegacySessionResult>(
  session: CareerSessionV8,
  mechanics: WrTacticalMechanicsV1,
  command: (source: CareerSessionV7) => T,
): LiftedSessionResult<T> {
  return sessionCommand(session, mechanics, command, false);
}

export function acknowledgePostGameSessionV8<T extends LegacySessionResult>(
  session: CareerSessionV8,
  mechanics: WrTacticalMechanicsV1,
  command: (source: CareerSessionV7) => T,
): LiftedSessionResult<T> {
  return sessionCommand(session, mechanics, command, true);
}
