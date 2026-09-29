import {
  assessWeeklyInjury,
  resolveInjuryChoice,
  validateCareerSession,
  type CareerSession,
  type InjuryChoiceId,
  type InjuryCommandFailureReason,
} from '@project-saturday/game-core';

import { injuryOutcomeMechanicsDefinitions, injuryTuning } from './injuries.js';
import { skillMechanicsDefinitions } from './skills.js';

export type InjurySessionCommandResult =
  | { readonly ok: true; readonly session: CareerSession }
  | {
      readonly ok: false;
      readonly session: CareerSession;
      readonly reason: InjuryCommandFailureReason;
    };

export function assessShippedWeeklyInjury(session: CareerSession): InjurySessionCommandResult {
  if (!validateCareerSession(session).ok) {
    return { ok: false, session, reason: 'injury.invalid_career' };
  }
  const result = assessWeeklyInjury(
    session.career,
    injuryOutcomeMechanicsDefinitions,
    injuryTuning,
    skillMechanicsDefinitions,
  );
  return result.ok
    ? { ok: true, session: { ...session, career: result.career } }
    : { ok: false, session, reason: result.reason };
}

export function resolveShippedInjuryChoice(
  session: CareerSession,
  choiceId: InjuryChoiceId,
): InjurySessionCommandResult {
  if (!validateCareerSession(session).ok) {
    return { ok: false, session, reason: 'injury.invalid_career' };
  }
  const result = resolveInjuryChoice(
    session.career,
    choiceId,
    injuryOutcomeMechanicsDefinitions,
    injuryTuning,
  );
  return result.ok
    ? { ok: true, session: { ...session, career: result.career } }
    : { ok: false, session, reason: result.reason };
}
