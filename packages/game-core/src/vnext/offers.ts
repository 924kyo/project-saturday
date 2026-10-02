import { derivePositionRecruitingProfile } from '../programs/position-room.js';
import type { DepthRoleId } from '../programs/ids.js';
import type { ProgramId } from '../player/ids.js';
import { programRating } from './common.js';
import { recruitOfferTargetVNext, scoutingReportVNext } from './creation.js';
import {
  programProfileVNext,
  programSchemeVNext,
  schemeFitBandVNext,
  type SchemeFitBandVNext,
} from './programs.js';
import type {
  AcademicSupportIdVNext,
  CareerVNext,
  CareerVNextMechanics,
  DevelopmentTierIdVNext,
  ExposureTierIdVNext,
  NilMarketIdVNext,
  RecruitOfferVNext,
  SchemeIdVNext,
  VNextPositionId,
} from './types.js';

/**
 * Offers explained (M12 Phase 4): what each school offers, why it called, what a "not yet" school
 * still needs, and what the transfer market reads. Everything comes from saved state and the same
 * numbers the offer generators use; forecasts (when a starter leaves) are marked as such.
 */
export const VNEXT_OFFER_TUNING = Object.freeze({
  recruit: { reachAbove: 5, roleBelow: -6, reachTop: 16 },
  transfer: { reachAbove: 3, roleBelow: -4, reachTop: 14 },
  /**
   * The transfer market (REC-05): ability plus what a season showed, centered on an ordinary
   * starter's season. A great season moves the target by at most one band (+5: two honors, top
   * grades, national exposure); a reduced role or poor grades lower it.
   */
  market: {
    abilityShare: 0.8,
    perAward: 1,
    awardsCap: 2,
    // Centered on a starter's season: a reduced role lowers the market, it is not a bonus.
    role: {
      depth_role_starter: 0,
      depth_role_rotation: -1,
      depth_role_reserve: -1,
      depth_role_developmental: -2,
    } satisfies Record<DepthRoleId, number>,
    gradeBaseline: 70,
    gradePerPoint: 5,
    gradeMin: -2,
    gradeMax: 2,
    exposure: {
      exposure_national: 1,
      exposure_regional: 0,
      exposure_local: -1,
    } satisfies Record<ExposureTierIdVNext, number>,
  },
});

export interface TransferMarketVNext {
  readonly ability: number;
  readonly abilityTerm: number;
  readonly awards: number;
  readonly awardTerm: number;
  readonly roleId: DepthRoleId;
  readonly roleTerm: number;
  readonly averageGrade: number | null;
  readonly gradeTerm: number;
  readonly exposureTierId: ExposureTierIdVNext | null;
  readonly exposureTerm: number;
  /** The program rating transfer offers center on. */
  readonly target: number;
}

/** The transfer market after a season (the season just reviewed and the athlete now). */
export function transferMarketVNext(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
): TransferMarketVNext | null {
  if (career.program === null) return null;
  const recruiting = derivePositionRecruitingProfile(career.athlete.profile, mechanics.room, 0);
  if (recruiting === undefined) return null;
  const tuning = VNEXT_OFFER_TUNING.market;
  const review = career.history.at(-1);
  const ability = recruiting.abilityScore;
  const abilityTerm = 50 + Math.round((ability - 50) * tuning.abilityShare);
  const awards = review?.awards?.length ?? 0;
  const awardTerm = Math.min(tuning.awardsCap, awards * tuning.perAward);
  const roleId = career.program.room.projection.roleId;
  const roleTerm = tuning.role[roleId];
  const averageGrade = review?.averageGrade ?? null;
  const gradeTerm =
    averageGrade === null
      ? 0
      : Math.max(
          tuning.gradeMin,
          Math.min(
            tuning.gradeMax,
            Math.round((averageGrade - tuning.gradeBaseline) / tuning.gradePerPoint),
          ),
        );
  const exposureTierId =
    programProfileVNext(mechanics, career.program.programId)?.exposureTierId ?? null;
  const exposureTerm = exposureTierId === null ? 0 : tuning.exposure[exposureTierId];
  return {
    ability,
    abilityTerm,
    awards,
    awardTerm,
    roleId,
    roleTerm,
    averageGrade,
    gradeTerm,
    exposureTierId,
    exposureTerm,
    target: abilityTerm + awardTerm + roleTerm + gradeTerm + exposureTerm,
  };
}

/** Strength and playing-time pips (1–5) for an offer card. */
export function offerPipsVNext(offer: Pick<RecruitOfferVNext, 'programRating' | 'preview'>): {
  readonly strength: number;
  readonly playingTime: number;
} {
  return {
    strength: Math.max(1, Math.min(5, Math.round((offer.programRating - 50) / 7))),
    playingTime: Math.max(1, Math.min(5, 6 - Math.ceil(offer.preview.rank / 1.6))),
  };
}

export interface OfferFactsVNext {
  readonly programId: ProgramId;
  readonly conferenceId: string | null;
  /** Last season's record, only where the season is saved (the offseason's own world). */
  readonly lastSeason: { readonly wins: number; readonly losses: number } | null;
  readonly schemeId: SchemeIdVNext | null;
  /** A new coordinator brought this scheme in for the coming season. */
  readonly previousSchemeId: SchemeIdVNext | null;
  readonly fit: SchemeFitBandVNext | null;
  readonly developmentTierId: DevelopmentTierIdVNext | null;
  readonly exposureTierId: ExposureTierIdVNext | null;
  readonly academicSupportId: AcademicSupportIdVNext | null;
  readonly nilMarketId: NilMarketIdVNext | null;
  readonly roleId: DepthRoleId;
  readonly playersAhead: number;
  /** Forecast: seasons the current starter has left after the coming one (0 = his last year). */
  readonly starterSeasonsLeft: number;
}

/** The comparison facts for an offer, for the season it would start. */
export function offerFactsVNext(
  career: CareerVNext,
  offer: RecruitOfferVNext,
  mechanics: CareerVNextMechanics,
): OfferFactsVNext {
  const profile = programProfileVNext(mechanics, offer.programId);
  const seasonIndex = career.program === null ? 0 : career.season.index + 1;
  const scheme = programSchemeVNext(
    career.seed,
    offer.programId,
    career.athlete.profile.positionId,
    seasonIndex,
    mechanics,
  );
  const record =
    career.program === null
      ? undefined
      : career.season.world?.programRecords.find(({ programId }) => programId === offer.programId);
  return {
    programId: offer.programId,
    conferenceId:
      mechanics.world.programProfiles.find(({ programId }) => programId === offer.programId)
        ?.groupId ?? null,
    lastSeason: record === undefined ? null : { wins: record.wins, losses: record.losses },
    schemeId: scheme?.schemeId ?? null,
    previousSchemeId: scheme?.previousSchemeId ?? null,
    fit:
      scheme === null
        ? null
        : schemeFitBandVNext(scheme.schemeId, career.athlete.profile.archetypeId, mechanics),
    developmentTierId: profile?.developmentTierId ?? null,
    exposureTierId: profile?.exposureTierId ?? null,
    academicSupportId: profile?.academicSupportId ?? null,
    nilMarketId: profile?.nilMarketId ?? null,
    roleId: offer.preview.roleId,
    playersAhead: offer.preview.playersAhead,
    starterSeasonsLeft: 4 - offer.preview.starterClassYear,
  };
}

export type OfferReasonVNext =
  | { readonly id: 'reach' }
  | { readonly id: 'fit' }
  | { readonly id: 'early_role' }
  | { readonly id: 'starter_leaving' }
  | { readonly id: 'open_top' }
  | { readonly id: 'scheme' }
  | { readonly id: 'production'; readonly grade: number }
  | { readonly id: 'honors'; readonly count: number };

/** The level the offers center on: the recruit score's target, or the transfer market's. */
export function offerTargetVNext(career: CareerVNext, mechanics: CareerVNextMechanics): number {
  if (career.program !== null) return transferMarketVNext(career, mechanics)?.target ?? 50;
  return scoutingReportVNext(career.athlete.profile, mechanics)?.offerTarget ?? 50;
}

/** Why a school called: its band against the target, its need, the scheme and the season shown. */
export function offerReasonsVNext(
  career: CareerVNext,
  offer: RecruitOfferVNext,
  mechanics: CareerVNextMechanics,
): readonly OfferReasonVNext[] {
  const transfer = career.program !== null;
  const bands = transfer ? VNEXT_OFFER_TUNING.transfer : VNEXT_OFFER_TUNING.recruit;
  const gap = offer.programRating - offerTargetVNext(career, mechanics);
  const reasons: OfferReasonVNext[] = [
    gap > bands.reachAbove
      ? { id: 'reach' }
      : gap < bands.roleBelow
        ? { id: 'early_role' }
        : { id: 'fit' },
  ];
  if (offer.preview.playersAhead === 0) reasons.push({ id: 'open_top' });
  else if (offer.preview.starterClassYear === 4) reasons.push({ id: 'starter_leaving' });
  if (offerFactsVNext(career, offer, mechanics).fit === 'ideal') reasons.push({ id: 'scheme' });
  if (transfer) {
    const review = career.history.at(-1);
    if (review?.averageGrade != null && review.averageGrade >= 70)
      reasons.push({ id: 'production', grade: review.averageGrade });
    if ((review?.awards?.length ?? 0) > 0)
      reasons.push({ id: 'honors', count: review!.awards!.length });
  }
  return reasons;
}

export interface NotYetOfferVNext {
  readonly programId: ProgramId;
  readonly programRating: number;
  /** The recruit score (recruiting) or market value (transfer) that would bring the offer. */
  readonly needed: number;
  readonly current: number;
  readonly measure: 'recruit_score' | 'market_value';
}

/**
 * The nearest school above the reach band that did not call, and the gap to close: the lowest
 * rated program the generator could not reach, at the score that would put it in range.
 */
export function notYetOfferVNext(
  career: CareerVNext,
  offers: readonly RecruitOfferVNext[],
  mechanics: CareerVNextMechanics,
): NotYetOfferVNext | null {
  const positionId = career.athlete.profile.positionId as VNextPositionId;
  const transfer = career.program !== null;
  const target = offerTargetVNext(career, mechanics);
  const top =
    target + (transfer ? VNEXT_OFFER_TUNING.transfer : VNEXT_OFFER_TUNING.recruit).reachTop;
  const offered = new Set(offers.map(({ programId }) => programId));
  const next = mechanics.world.programProfiles
    .filter(({ programId }) => !offered.has(programId))
    .map(({ programId }) => ({
      programId,
      rating: programRating(mechanics, programId, positionId),
    }))
    .filter(({ rating }) => rating > top)
    .sort(
      (left, right) => left.rating - right.rating || left.programId.localeCompare(right.programId),
    )[0];
  if (next === undefined) return null;
  const reachTop = (transfer ? VNEXT_OFFER_TUNING.transfer : VNEXT_OFFER_TUNING.recruit).reachTop;
  if (transfer)
    return {
      programId: next.programId,
      programRating: next.rating,
      needed: next.rating - reachTop,
      current: target,
      measure: 'market_value',
    };
  const current = scoutingReportVNext(career.athlete.profile, mechanics)?.recruitScore ?? 50;
  let needed = current;
  while (needed < 100 && recruitOfferTargetVNext(needed) + reachTop < next.rating) needed += 1;
  return {
    programId: next.programId,
    programRating: next.rating,
    needed,
    current,
    measure: 'recruit_score',
  };
}
