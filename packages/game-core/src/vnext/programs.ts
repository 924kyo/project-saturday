import type { ProgramId } from '../player/ids.js';
import type { PositionRoomMechanics } from '../programs/position-room.js';
import { createRng, nextUint32 } from '../random/rng.js';
import { potentialPermilleVNext } from './development.js';
import type {
  AcademicSupportIdVNext,
  CareerVNext,
  CareerVNextMechanics,
  DevelopmentTierIdVNext,
  ExposureTierIdVNext,
  NilMarketIdVNext,
  ProgramProfileVNext,
  SchemeIdVNext,
  VNextPositionId,
} from './types.js';

/**
 * Program profiles (M12 Phase 4, playtest report "offers need genuine tradeoffs"): the same athlete
 * develops, plays, earns and is seen differently at different schools. Every effect is a bounded
 * multiplier or offset on an existing rule; a program without a profile is neutral everywhere.
 */
export const VNEXT_PROGRAM_TUNING = Object.freeze({
  /** Added to the room's scheme fit (0–100) for the athlete's and every teammate's style. */
  schemeFit: { ideal: 8, poor: -8 },
  /**
   * Centered on the Phase 2 growth baseline (the 96-program mean is about 1.0): an elite developer
   * and a standard one differ by 10%, without inflating every career.
   */
  developmentXpPermille: {
    development_elite: 1050,
    development_strong: 1000,
    development_standard: 950,
  } satisfies Record<DevelopmentTierIdVNext, number>,
  /** Brand from a Saturday, and the program-exposure term in draft stock. */
  brandPermille: {
    exposure_national: 1500,
    exposure_regional: 1000,
    exposure_local: 750,
  } satisfies Record<ExposureTierIdVNext, number>,
  draftExposure: {
    exposure_national: 6,
    exposure_regional: 0,
    exposure_local: -5,
  } satisfies Record<ExposureTierIdVNext, number>,
  /** The weekly NIL offer chance before visibility (was a flat 300). */
  nilOfferChancePermille: {
    nil_market_major: 380,
    nil_market_solid: 300,
    nil_market_small: 220,
  } satisfies Record<NilMarketIdVNext, number>,
  /** Scales the GPA a study-hall week earns. */
  studyGpaPermille: {
    academics_strong: 1300,
    academics_standard: 1000,
    academics_limited: 750,
  } satisfies Record<AcademicSupportIdVNext, number>,
  /** Each offseason a side of the ball changes coordinator (and scheme) with this chance. */
  coordinatorChangePermille: 200,
  /** A transfer opens camp behind on the new playbook. */
  transferPreparation: -12,
});

export function programProfileVNext(
  mechanics: Pick<CareerVNextMechanics, 'programProfiles'>,
  programId: ProgramId | string,
): ProgramProfileVNext | null {
  return mechanics.programProfiles?.find((entry) => entry.programId === programId) ?? null;
}

export function sideOfVNext(positionId: VNextPositionId | string): 'offense' | 'defense' {
  return positionId === 'position_qb' ||
    positionId === 'position_rb' ||
    positionId === 'position_wr'
    ? 'offense'
    : 'defense';
}

export interface ProgramSchemeVNext {
  readonly schemeId: SchemeIdVNext;
  /** Set when a new coordinator brought this scheme in for this season. */
  readonly previousSchemeId: SchemeIdVNext | null;
}

/**
 * The program's scheme on the athlete's side of the ball in a season. Coordinator changes are
 * replayed season by season from `:vnext:coordinator:<season>:<program>:<side>`, so nothing is
 * stored and every view of the same season agrees.
 */
export function programSchemeVNext(
  seed: CareerVNext['seed'],
  programId: ProgramId | string,
  positionId: VNextPositionId | string,
  seasonIndex: number,
  mechanics: Pick<CareerVNextMechanics, 'programProfiles' | 'schemes'>,
): ProgramSchemeVNext | null {
  const profile = programProfileVNext(mechanics, programId);
  if (profile === null) return null;
  const side = sideOfVNext(positionId);
  const options = (mechanics.schemes ?? [])
    .filter((scheme) => scheme.side === side)
    .map(({ id }) => id)
    .sort();
  let schemeId: SchemeIdVNext =
    side === 'offense' ? profile.offenseSchemeId : profile.defenseSchemeId;
  let previousSchemeId: SchemeIdVNext | null = null;
  for (let season = 1; season <= seasonIndex; season += 1) {
    previousSchemeId = null;
    const roll = nextUint32(
      createRng(`${String(seed)}:vnext:coordinator:${season}:${programId}:${side}`),
    );
    if (roll.value % 1000 >= VNEXT_PROGRAM_TUNING.coordinatorChangePermille) continue;
    const others = options.filter((id) => id !== schemeId);
    if (others.length === 0) continue;
    previousSchemeId = schemeId;
    schemeId = others[nextUint32(roll.nextRng).value % others.length]!;
  }
  return { schemeId, previousSchemeId };
}

export type SchemeFitBandVNext = 'ideal' | 'neutral' | 'poor';

export function schemeFitBandVNext(
  schemeId: SchemeIdVNext,
  archetypeId: string,
  mechanics: Pick<CareerVNextMechanics, 'schemes'>,
): SchemeFitBandVNext {
  const scheme = mechanics.schemes?.find(({ id }) => id === schemeId);
  if (scheme?.idealArchetypeIds.includes(archetypeId)) return 'ideal';
  if (scheme?.poorArchetypeIds.includes(archetypeId)) return 'poor';
  return 'neutral';
}

/** The room rules at one program in one season: scheme fit follows that season's scheme. */
export function roomMechanicsVNext(
  mechanics: CareerVNextMechanics,
  seed: CareerVNext['seed'],
  programId: ProgramId,
  positionId: VNextPositionId | string,
  seasonIndex: number,
): PositionRoomMechanics {
  const scheme = programSchemeVNext(seed, programId, positionId, seasonIndex, mechanics);
  if (scheme === null) return mechanics.room;
  const tuning = VNEXT_PROGRAM_TUNING.schemeFit;
  const fits = Object.fromEntries(
    Object.entries(mechanics.room.schemeFitByArchetype).map(([archetypeId, base]) => {
      const band = schemeFitBandVNext(scheme.schemeId, archetypeId, mechanics);
      const delta = band === 'ideal' ? tuning.ideal : band === 'poor' ? tuning.poor : 0;
      return [archetypeId, Math.max(0, Math.min(100, (base ?? 0) + delta))];
    }),
  );
  return { ...mechanics.room, schemeFitByArchetype: fits };
}

/**
 * The season's XP multiplier: the background's potential × the program's development tier. The
 * program is the current one unless given (the offseason program trains for the destination).
 */
export function developmentPermilleVNext(
  career: Pick<CareerVNext, 'athlete' | 'season' | 'program'>,
  mechanics: Pick<CareerVNextMechanics, 'programProfiles'>,
  programId: ProgramId | null = career.program?.programId ?? null,
): number {
  const potential = potentialPermilleVNext(career);
  const profile = programId === null ? null : programProfileVNext(mechanics, programId);
  if (profile === null) return potential;
  return Math.round(
    (potential * VNEXT_PROGRAM_TUNING.developmentXpPermille[profile.developmentTierId]) / 1000,
  );
}

/** How much of a study-hall GPA gain the program's academic support delivers. */
export function studyGpaPermilleVNext(
  mechanics: Pick<CareerVNextMechanics, 'programProfiles'>,
  programId: ProgramId | null,
): number {
  const profile = programId === null ? null : programProfileVNext(mechanics, programId);
  return profile === null ? 1000 : VNEXT_PROGRAM_TUNING.studyGpaPermille[profile.academicSupportId];
}

export function brandPermilleVNext(
  mechanics: Pick<CareerVNextMechanics, 'programProfiles'>,
  programId: ProgramId,
): number {
  const profile = programProfileVNext(mechanics, programId);
  return profile === null ? 1000 : VNEXT_PROGRAM_TUNING.brandPermille[profile.exposureTierId];
}

export function nilOfferChancePermilleVNext(
  mechanics: Pick<CareerVNextMechanics, 'programProfiles'>,
  programId: ProgramId,
): number {
  const profile = programProfileVNext(mechanics, programId);
  return profile === null
    ? VNEXT_PROGRAM_TUNING.nilOfferChancePermille.nil_market_solid
    : VNEXT_PROGRAM_TUNING.nilOfferChancePermille[profile.nilMarketId];
}

export function draftExposureBonusVNext(
  mechanics: Pick<CareerVNextMechanics, 'programProfiles'>,
  programId: ProgramId,
): number {
  const profile = programProfileVNext(mechanics, programId);
  return profile === null ? 0 : VNEXT_PROGRAM_TUNING.draftExposure[profile.exposureTierId];
}
