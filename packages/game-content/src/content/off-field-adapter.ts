import {
  bootstrapOffFieldSystems,
  decideNilOffer,
  expireNilOffers,
  resolveAcademicCheckpoint,
  resolveNilObligation,
  resolveWeeklyRelationships,
  projectRelationshipContextV1,
  selectNilOffer,
  validateCareerSession,
  type CareerSession,
  type CareerSessionV8,
  type NilObligationResolutionId,
  type NilOfferDecisionId,
  type NilOfferId,
  type AcademicCheckpointId,
  type AcademicEligibilityStatus,
  type NilEffect,
  type NilObligationId,
  type RelationshipContextProjectionV1,
  type OffFieldCommandFailureReason,
} from '@project-saturday/game-core';

import { offFieldMechanicsCatalog } from './off-field.js';
import { deriveShippedEventContextTagIds } from './event-adapter.js';
import { programMechanicsDefinitions } from './programs.js';
import { skillMechanicsDefinitions } from './skills.js';
import { isValidShippedWrSession } from './wr-tactical-mechanics.js';

export type OffFieldSessionCommandResult =
  | { readonly ok: true; readonly session: CareerSession }
  | {
      readonly ok: false;
      readonly session: CareerSession;
      readonly reason: OffFieldCommandFailureReason;
    };

export interface ShippedOffFieldWeekProjection {
  readonly model: 'off_field_week_projection_v1';
  readonly weekIndex: number;
  readonly academics: {
    readonly eligibilityStatus: Exclude<AcademicEligibilityStatus, 'PENDING'>;
    readonly gpaMilli: number;
    readonly eligibleGpaMilli: number;
    readonly warningGpaMilli: number;
    readonly nextCheckpointId: AcademicCheckpointId | null;
    readonly nextCheckpointWeekIndex: number | null;
    readonly restrictionGamesRemaining: number;
    readonly nextGameMaximumOpportunities: 0 | null;
  };
  readonly relationships: RelationshipContextProjectionV1;
  readonly nil: {
    readonly brand: number;
    readonly fictionalFundsUsd: number;
    readonly pendingOffer: null | {
      readonly offerId: NilOfferId;
      readonly expiresAfterWeekIndex: number;
      readonly rewardEffects: readonly NilEffect[];
      readonly obligationId: NilObligationId;
      readonly obligationFocusCost: number;
      readonly obligationWeeklyEffects: readonly NilEffect[];
      readonly obligationDefaultEffects: readonly NilEffect[];
    };
    readonly activeObligation: null | {
      readonly offerId: NilOfferId;
      readonly obligationId: NilObligationId;
      readonly remainingWeeks: number;
      readonly focusCost: number;
      readonly resolutionRequired: boolean;
      readonly weeklyEffects: readonly NilEffect[];
      readonly defaultEffects: readonly NilEffect[];
    };
  };
}

function invalid(session: CareerSession): OffFieldSessionCommandResult {
  return { ok: false, session, reason: 'off_field.invalid_career' };
}

export function deriveShippedOffFieldWeekProjection(
  session: CareerSession | CareerSessionV8,
): ShippedOffFieldWeekProjection | null {
  if (!isValidShippedWrSession(session)) return null;
  const academics = session.career.offFieldCareerState.academics;
  const relationships = session.career.offFieldCareerState.relationships;
  const nil = session.career.offFieldCareerState.nil;
  if (
    academics.bootstrapStatus !== 'ACTIVE' ||
    relationships.bootstrapStatus !== 'ACTIVE' ||
    !('bootstrapStatus' in nil) ||
    nil.bootstrapStatus !== 'ACTIVE'
  ) {
    return null;
  }
  const relationshipProjection = projectRelationshipContextV1(
    relationships,
    offFieldMechanicsCatalog,
  );
  if (relationshipProjection === null) return null;
  const nextCheckpoint =
    offFieldMechanicsCatalog.academics.checkpoints[academics.nextCheckpointIndex] ?? null;
  const pending = nil.pendingOffers[0] ?? null;
  const pendingDefinition =
    pending === null
      ? null
      : (offFieldMechanicsCatalog.nilOffers.find(({ id }) => id === pending.offerId) ?? null);
  const obligation = nil.activeObligation;
  const obligationDefinition =
    obligation === null
      ? null
      : (offFieldMechanicsCatalog.nilOffers.find(({ id }) => id === obligation.offerId)
          ?.obligation ?? null);
  if (
    (pending !== null && pendingDefinition === null) ||
    (obligation !== null && obligationDefinition === null)
  ) {
    return null;
  }
  return {
    model: 'off_field_week_projection_v1',
    weekIndex: session.career.weekIndex,
    academics: {
      eligibilityStatus: academics.eligibilityStatus,
      gpaMilli: Math.round(session.career.player.state.gpa * 1_000),
      eligibleGpaMilli: offFieldMechanicsCatalog.academics.eligibleGpaMilli,
      warningGpaMilli: offFieldMechanicsCatalog.academics.warningGpaMilli,
      nextCheckpointId: nextCheckpoint?.id ?? null,
      nextCheckpointWeekIndex: nextCheckpoint?.weekIndex ?? null,
      restrictionGamesRemaining: academics.restrictionGamesRemaining,
      nextGameMaximumOpportunities: academics.restrictionGamesRemaining > 0 ? 0 : null,
    },
    relationships: relationshipProjection,
    nil: {
      brand: session.career.player.state.brand,
      fictionalFundsUsd: nil.fictionalFundsUsd,
      pendingOffer:
        pending === null || pendingDefinition === null
          ? null
          : {
              offerId: pending.offerId,
              expiresAfterWeekIndex: pending.expiresAfterWeekIndex,
              rewardEffects: pendingDefinition.rewardEffects,
              obligationId: pendingDefinition.obligation.id,
              obligationFocusCost: pendingDefinition.obligation.focusCost,
              obligationWeeklyEffects: pendingDefinition.obligation.weeklyEffects,
              obligationDefaultEffects: pendingDefinition.obligation.defaultEffects,
            },
      activeObligation:
        obligation === null || obligationDefinition === null
          ? null
          : {
              offerId: obligation.offerId,
              obligationId: obligation.obligationId,
              remainingWeeks: obligation.remainingWeeks,
              focusCost: obligationDefinition.focusCost,
              resolutionRequired: obligation.lastResolvedWeekIndex !== session.career.weekIndex,
              weeklyEffects: obligationDefinition.weeklyEffects,
              defaultEffects: obligationDefinition.defaultEffects,
            },
    },
  };
}

export function bootstrapShippedOffFieldSystems(
  session: CareerSession,
): OffFieldSessionCommandResult {
  if (!validateCareerSession(session).ok) return invalid(session);
  const result = bootstrapOffFieldSystems(session.career, offFieldMechanicsCatalog);
  return result.ok
    ? { ok: true, session: { ...session, career: result.career } }
    : { ok: false, session, reason: result.reason };
}

export function resolveShippedAcademicCheckpoint(
  session: CareerSession,
  obligationGpaDeltaMilli = 0,
): OffFieldSessionCommandResult {
  if (!validateCareerSession(session).ok) return invalid(session);
  const result = resolveAcademicCheckpoint(
    session.career,
    offFieldMechanicsCatalog,
    obligationGpaDeltaMilli,
  );
  return result.ok
    ? { ok: true, session: { ...session, career: result.career } }
    : { ok: false, session, reason: result.reason };
}

export function resolveShippedWeeklyRelationships(
  session: CareerSession,
): OffFieldSessionCommandResult {
  if (!validateCareerSession(session).ok) return invalid(session);
  const result = resolveWeeklyRelationships(
    session.career,
    offFieldMechanicsCatalog,
    skillMechanicsDefinitions,
  );
  return result.ok
    ? { ok: true, session: { ...session, career: result.career } }
    : { ok: false, session, reason: result.reason };
}

function currentWeekObligationGpaDeltaMilli(session: CareerSession): number {
  const nil = session.career.offFieldCareerState.nil;
  if (!('bootstrapStatus' in nil) || nil.bootstrapStatus !== 'ACTIVE') return 0;
  return nil.history.reduce((total, entry) => {
    if (
      entry.model !== 'nil_obligation_resolution_v1' ||
      entry.weekIndex !== session.career.weekIndex
    ) {
      return total;
    }
    return (
      total +
      entry.appliedEffects
        .filter(({ effect }) => effect.type === 'nil_gpa_delta_milli')
        .reduce((effectTotal, effect) => effectTotal + effect.actualDelta, 0)
    );
  }, 0);
}

export function settleShippedCompletedWeekOffField(
  session: CareerSession,
): OffFieldSessionCommandResult {
  if (!validateCareerSession(session).ok) return invalid(session);
  if (session.career.phase.type !== 'WEEK_END') {
    return { ok: false, session, reason: 'off_field.invalid_phase' };
  }
  let current = session;
  const relationships = current.career.offFieldCareerState.relationships;
  if (
    relationships.bootstrapStatus === 'ACTIVE' &&
    relationships.lastProcessedWeekIndex !== current.career.weekIndex
  ) {
    const resolved = resolveShippedWeeklyRelationships(current);
    if (!resolved.ok) return resolved;
    current = resolved.session;
  }
  const academics = current.career.offFieldCareerState.academics;
  if (academics.bootstrapStatus === 'ACTIVE') {
    const checkpoint =
      offFieldMechanicsCatalog.academics.checkpoints[academics.nextCheckpointIndex];
    if (checkpoint?.weekIndex === current.career.weekIndex) {
      const resolved = resolveShippedAcademicCheckpoint(
        current,
        currentWeekObligationGpaDeltaMilli(current),
      );
      if (!resolved.ok) return resolved;
      current = resolved.session;
    }
  }
  return { ok: true, session: current };
}

export function attemptShippedWeeklyNilOffer(session: CareerSession): OffFieldSessionCommandResult {
  if (!validateCareerSession(session).ok) return invalid(session);
  const calendar = session.world.calendar;
  if (
    calendar.type !== 'ACTIVE' ||
    calendar.stage === 'POSTSEASON' ||
    (calendar.stage === 'REGULAR_SEASON' && calendar.completedRegularSeasonRoundCount >= 9)
  ) {
    return { ok: true, session };
  }
  const nil = session.career.offFieldCareerState.nil;
  if (!('bootstrapStatus' in nil) || nil.bootstrapStatus !== 'ACTIVE') return { ok: true, session };
  if (
    nil.pendingOffers.length > 0 ||
    nil.activeObligation !== null ||
    nil.lastOfferAttempt?.weekIndex === session.career.weekIndex
  ) {
    return { ok: true, session };
  }
  return selectShippedNilOffer(session);
}

export function prepareShippedOffFieldPlanningBoundary(
  session: CareerSession,
): OffFieldSessionCommandResult {
  if (!validateCareerSession(session).ok) return invalid(session);
  let current = session;
  const academics = current.career.offFieldCareerState.academics;
  if (academics.bootstrapStatus === 'PENDING') {
    const bootstrapped = bootstrapShippedOffFieldSystems(current);
    if (!bootstrapped.ok) return bootstrapped;
    current = bootstrapped.session;
  }
  const nil = current.career.offFieldCareerState.nil;
  if (
    'bootstrapStatus' in nil &&
    nil.bootstrapStatus === 'ACTIVE' &&
    nil.pendingOffers.some(
      ({ expiresAfterWeekIndex }) => current.career.weekIndex > expiresAfterWeekIndex,
    )
  ) {
    return expireShippedNilOffers(current);
  }
  return { ok: true, session: current };
}

export function selectShippedNilOffer(session: CareerSession): OffFieldSessionCommandResult {
  if (!validateCareerSession(session).ok) return invalid(session);
  const program = programMechanicsDefinitions.find(({ id }) => id === session.career.programId);
  if (program === undefined) return { ok: false, session, reason: 'off_field.invalid_definitions' };
  const result = selectNilOffer(session.career, offFieldMechanicsCatalog, {
    programStrengthBandId: program.strengthBandId,
    additionalTagIds: deriveShippedEventContextTagIds(session),
  });
  return result.ok
    ? { ok: true, session: { ...session, career: result.career } }
    : { ok: false, session, reason: result.reason };
}

export function decideShippedNilOffer(
  session: CareerSession,
  offerId: NilOfferId,
  decisionId: NilOfferDecisionId,
): OffFieldSessionCommandResult {
  if (!validateCareerSession(session).ok) return invalid(session);
  const result = decideNilOffer(
    session.career,
    offerId,
    decisionId,
    offFieldMechanicsCatalog,
    skillMechanicsDefinitions,
  );
  return result.ok
    ? { ok: true, session: { ...session, career: result.career } }
    : { ok: false, session, reason: result.reason };
}

export function expireShippedNilOffers(session: CareerSession): OffFieldSessionCommandResult {
  if (!validateCareerSession(session).ok) return invalid(session);
  const result = expireNilOffers(session.career, offFieldMechanicsCatalog);
  return result.ok
    ? { ok: true, session: { ...session, career: result.career } }
    : { ok: false, session, reason: result.reason };
}

export function resolveShippedNilObligation(
  session: CareerSession,
  resolutionId: NilObligationResolutionId,
): OffFieldSessionCommandResult {
  if (!validateCareerSession(session).ok) return invalid(session);
  const result = resolveNilObligation(session.career, resolutionId, offFieldMechanicsCatalog);
  return result.ok
    ? { ok: true, session: { ...session, career: result.career } }
    : { ok: false, session, reason: result.reason };
}
