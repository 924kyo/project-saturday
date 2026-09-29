import {
  validateCareerSession,
  type CareerRun,
  type CareerSession,
  type EventChoiceId,
  type InjuryChoiceId,
  type MetaProfileV1,
  type NilObligationResolutionId,
  type NilOfferDecisionId,
  type NilOfferId,
  type ProgramId,
} from '@project-saturday/game-core';
import {
  advanceShippedCampRound,
  assessShippedWeeklyInjury,
  attemptShippedWeeklyNilOffer,
  bootstrapShippedNextSeason,
  bootstrapShippedSeason,
  completeShippedCareer,
  completeShippedPostseasonRound,
  completeShippedRegularSeasonRound,
  decideShippedNilOffer,
  decideShippedOffseason,
  enterShippedSeasonReview,
  initializeShippedPostseason,
  prepareNextShippedPostseasonGame,
  prepareNextShippedSeasonGame,
  prepareShippedOffFieldPlanningBoundary,
  projectShippedOffseason,
  resolveShippedEventChoice,
  resolveShippedInjuryChoice,
  resolveShippedNilObligation,
  selectShippedWeeklyEvent,
  settleShippedCompletedWeekOffField,
} from '@project-saturday/game-content/content';

export type SeasonUiCommandResult =
  | { readonly ok: true; readonly session: CareerSession }
  | { readonly ok: false; readonly session: CareerSession; readonly reason: string };

export type SeasonUiCompletionResult = ReturnType<typeof completeShippedCareer>;

function failure(session: CareerSession, reason: string): SeasonUiCommandResult {
  return { ok: false, session, reason };
}

export function replaceSessionCareer(
  session: CareerSession,
  career: CareerRun,
): SeasonUiCommandResult {
  const next = { ...session, career };
  return validateCareerSession(next).ok
    ? { ok: true, session: next }
    : failure(session, 'season_ui.invalid_session');
}

export function bootstrapCareerSeason(session: CareerSession): SeasonUiCommandResult {
  const bootstrapped = bootstrapShippedSeason(session);
  return bootstrapped.ok
    ? prepareShippedOffFieldPlanningBoundary(bootstrapped.session)
    : bootstrapped;
}

function continueCompletedWeek(session: CareerSession): SeasonUiCommandResult {
  const seasonState = session.career.seasonCareerState;
  if (
    session.career.phase.type !== 'WEEK_END' ||
    seasonState.bootstrapStatus !== 'ACTIVE' ||
    session.world.calendar.type !== 'ACTIVE'
  ) {
    return failure(session, 'season_ui.invalid_week_boundary');
  }
  const weekIndex = session.career.weekIndex;
  const settled = settleShippedCompletedWeekOffField(session);
  if (!settled.ok) return settled;
  let current = settled.session;
  if (seasonState.eventState.lastSelection?.weekIndex !== weekIndex) {
    const selected = selectShippedWeeklyEvent(current);
    if (!selected.ok) return selected;
    current = selected.session;
    if (current.career.phase.type === 'EVENT_CHOICE') return { ok: true, session: current };
  }
  if (
    current.career.seasonCareerState.bootstrapStatus !== 'ACTIVE' ||
    current.career.seasonCareerState.injuryState.lastAssessment?.weekIndex !== weekIndex
  ) {
    const assessed = assessShippedWeeklyInjury(current);
    if (!assessed.ok) return assessed;
    current = assessed.session;
    if (current.career.phase.type === 'INJURY_CHOICE') return { ok: true, session: current };
  }
  if (current.world.calendar.type !== 'ACTIVE') {
    return failure(session, 'season_ui.invalid_calendar');
  }
  const nilAttempt = attemptShippedWeeklyNilOffer(current);
  if (!nilAttempt.ok) return nilAttempt;
  current = nilAttempt.session;
  if (current.world.calendar.type !== 'ACTIVE') {
    return failure(session, 'season_ui.invalid_calendar');
  }
  if (current.world.calendar.stage === 'CAMP') {
    const advanced = advanceShippedCampRound(current);
    return advanced.ok ? prepareShippedOffFieldPlanningBoundary(advanced.session) : advanced;
  }
  if (current.world.calendar.stage === 'REGULAR_SEASON') {
    return prepareNextShippedSeasonGame(current);
  }
  if (current.world.calendar.postseason.type === 'ACTIVE') {
    return prepareNextShippedPostseasonGame(current);
  }
  return failure(session, 'season_ui.invalid_postseason_boundary');
}

export function continueShippedSeasonWeek(session: CareerSession): SeasonUiCommandResult {
  return continueCompletedWeek(session);
}

export function resolveSeasonEventChoice(
  session: CareerSession,
  choiceId: EventChoiceId,
): SeasonUiCommandResult {
  const resolved = resolveShippedEventChoice(session, choiceId);
  return resolved.ok ? continueCompletedWeek(resolved.session) : resolved;
}

export function resolveSeasonInjuryChoice(
  session: CareerSession,
  choiceId: InjuryChoiceId,
): SeasonUiCommandResult {
  const resolved = resolveShippedInjuryChoice(session, choiceId);
  return resolved.ok ? continueCompletedWeek(resolved.session) : resolved;
}

export function completeShippedSeasonGameWeek(session: CareerSession): SeasonUiCommandResult {
  if (session.world.calendar.type !== 'ACTIVE') {
    return failure(session, 'season_ui.invalid_calendar');
  }
  if (session.world.calendar.stage === 'REGULAR_SEASON') {
    const completed = completeShippedRegularSeasonRound(session);
    return completed.ok ? prepareShippedOffFieldPlanningBoundary(completed.session) : completed;
  }
  if (session.world.calendar.stage === 'POSTSEASON') {
    const completed = completeShippedPostseasonRound(session);
    return completed.ok ? prepareShippedOffFieldPlanningBoundary(completed.session) : completed;
  }
  return failure(session, 'season_ui.invalid_game_stage');
}

export function initializeCareerPostseason(session: CareerSession): SeasonUiCommandResult {
  const initialized = initializeShippedPostseason(session);
  return initialized.ok ? prepareShippedOffFieldPlanningBoundary(initialized.session) : initialized;
}

export function enterCareerSeasonReview(session: CareerSession): SeasonUiCommandResult {
  return enterShippedSeasonReview(session);
}

export function decideCareerNilOffer(
  session: CareerSession,
  offerId: NilOfferId,
  decisionId: NilOfferDecisionId,
): SeasonUiCommandResult {
  return decideShippedNilOffer(session, offerId, decisionId);
}

export function resolveCareerNilObligation(
  session: CareerSession,
  resolutionId: NilObligationResolutionId,
): SeasonUiCommandResult {
  return resolveShippedNilObligation(session, resolutionId);
}

export function projectCareerOffseason(session: CareerSession): SeasonUiCommandResult {
  return projectShippedOffseason(session);
}

export function decideCareerOffseason(
  session: CareerSession,
  selectedProgramId: ProgramId,
): SeasonUiCommandResult {
  return decideShippedOffseason(session, selectedProgramId);
}

export function bootstrapCareerNextSeason(session: CareerSession): SeasonUiCommandResult {
  return bootstrapShippedNextSeason(session);
}

export function completeCareerSeason(
  session: CareerSession,
  meta: MetaProfileV1,
): SeasonUiCompletionResult {
  return completeShippedCareer(session, meta);
}
