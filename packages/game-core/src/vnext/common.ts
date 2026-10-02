import { roomMechanicsVNext } from './programs.js';
import { deepFreeze } from '../player/immutable.js';
import type { ProgramId } from '../player/ids.js';
import type { CreatedPositionPlayerProfile } from '../player/position-creation.js';
import type { RosterFamilyNameId } from '../programs/ids.js';
import {
  derivePositionRecruitingProfile,
  generatePositionRoom,
  type PositionRoomContext,
} from '../programs/position-room.js';
import { createRng } from '../random/rng.js';
import type {
  CareerVNext,
  CareerVNextFailure,
  CareerVNextMechanics,
  CareerVNextResult,
  RecruitOfferVNext,
  VNextPositionId,
} from './types.js';

/** Shared command plumbing and room generation for the VNext command modules. */
export const fail = (reason: CareerVNextFailure): CareerVNextResult =>
  deepFreeze({ ok: false, reason });

export function publish(
  previous: CareerVNext | null,
  next: Omit<CareerVNext, 'revision'>,
): CareerVNextResult {
  // JSON-canonical publication: saved and in-memory careers are identical by construction
  // (e.g. engine arithmetic may produce -0, which JSON stores as 0).
  const career = JSON.parse(
    JSON.stringify({ ...next, revision: (previous?.revision ?? -1) + 1 }),
  ) as CareerVNext;
  return deepFreeze({ ok: true as const, career });
}

export function isVNextPositionId(value: unknown): value is VNextPositionId {
  return (
    value === 'position_qb' ||
    value === 'position_rb' ||
    value === 'position_wr' ||
    value === 'position_cb' ||
    value === 'position_lb' ||
    value === 'position_edge'
  );
}

export function programRating(
  mechanics: CareerVNextMechanics,
  programId: ProgramId,
  positionId: VNextPositionId,
) {
  return (
    mechanics.world.programProfiles.find((profile) => profile.programId === programId)
      ?.positionRatings[positionId] ?? 66
  );
}

/**
 * VNext room tuning is relative to the recruit: stronger programs stack more talent ahead of a
 * freshman, weaker ones offer an earlier path. Competitor trust grows with class year from a base
 * a freshman can compete with, so the depth climb is live from week one.
 */
export const VNEXT_ROOM_TUNING = Object.freeze({
  neutralProgramRating: 66,
  premiumPerRatingPointPermille: 600,
  premiumOffset: -1,
  talentSpread: 10,
  competitorTrustBase: 16,
  practiceFormBase: 52,
  experienceReadinessBase: 44,
});

/** Named derived stream: the offer preview and the committed room are the same draw sequence. */
export function roomFor(
  career: Pick<CareerVNext, 'seed' | 'athlete'>,
  programId: ProgramId,
  mechanics: CareerVNextMechanics,
  /** Later seasons draw from a season-named stream; season 0 keeps the original stream. */
  options: { readonly seasonIndex: number; readonly experienceReadiness: number } = {
    seasonIndex: 0,
    experienceReadiness: 45,
  },
) {
  const positionId = career.athlete.profile.positionId as VNextPositionId;
  const tuning = VNEXT_ROOM_TUNING;
  const config = (roomTalentMean: number) => ({
    programId,
    roomTalentMean,
    roomTalentSpread: tuning.talentSpread,
    trustBase: tuning.competitorTrustBase,
    practiceFormBase: tuning.practiceFormBase,
    experienceReadinessBase: tuning.experienceReadinessBase,
    playerCoachTrustBonus: 0,
    playerPracticeForm: 50,
    playerExperienceReadiness: options.experienceReadiness,
  });
  const rng = createRng(
    options.seasonIndex === 0
      ? `${String(career.seed)}:vnext:room:${programId}`
      : `${String(career.seed)}:vnext:room:${options.seasonIndex}:${programId}`,
  );
  // Zero-cost probe (discarded) reads the recruit's talent fit exactly as the depth model does.
  // M12: scheme fit follows the program's scheme that season.
  const roomMechanics = roomMechanicsVNext(
    mechanics,
    career.seed,
    programId,
    positionId,
    options.seasonIndex,
  );
  const probe = generatePositionRoom(
    career.athlete.profile,
    rng,
    mechanics.roomNames,
    roomMechanics,
    config(60),
  );
  if (!probe.ok) return probe;
  const playerTalent =
    probe.generated.context.evaluations.find(
      ({ participantId }) => participantId === probe.generated.context.playerId,
    )?.components.talentFit ?? 50;
  const premium =
    Math.round(
      ((programRating(mechanics, programId, positionId) - tuning.neutralProgramRating) *
        tuning.premiumPerRatingPointPermille) /
        1000,
    ) + tuning.premiumOffset;
  const room = generatePositionRoom(
    career.athlete.profile,
    rng,
    mechanics.roomNames,
    roomMechanics,
    config(
      Math.max(tuning.talentSpread, Math.min(100 - tuning.talentSpread, playerTalent + premium)),
    ),
  );
  if (!room.ok) return room;
  const context = withoutReservedNames(
    room.generated.context,
    mechanics.reservedNamePairs,
    mechanics.roomNames.familyNameIds,
  );
  return context === room.generated.context
    ? room
    : deepFreeze({ ...room, generated: { ...room.generated, context } });
}

/**
 * A reserved pair keeps its given name and takes the next family name (in catalog ID order) that
 * is neither used in the room nor reserved. Names are cosmetic: no draw, rating or order changes.
 */
function withoutReservedNames(
  context: PositionRoomContext,
  reserved: readonly string[],
  familyNameIds: readonly RosterFamilyNameId[],
): PositionRoomContext {
  const pair = (given: string, family: string) => `${given}|${family}`;
  if (
    !context.competitors.some((entry) =>
      reserved.includes(pair(entry.givenNameId, entry.familyNameId)),
    )
  )
    return context;
  const families = [...familyNameIds].sort();
  const used = new Set(
    context.competitors.map((entry) => pair(entry.givenNameId, entry.familyNameId)),
  );
  const competitors = context.competitors.map((entry) => {
    if (!reserved.includes(pair(entry.givenNameId, entry.familyNameId))) return entry;
    const start = families.indexOf(entry.familyNameId);
    for (let step = 1; step < families.length; step += 1) {
      const familyNameId = families[(start + step) % families.length]!;
      const candidate = pair(entry.givenNameId, familyNameId);
      if (used.has(candidate) || reserved.includes(candidate)) continue;
      used.add(candidate);
      return { ...entry, familyNameId };
    }
    return entry;
  });
  return { ...context, competitors };
}

export function offerFromRoom(
  programId: ProgramId,
  rating: number,
  room: PositionRoomContext,
): RecruitOfferVNext {
  const rank = room.projection.rank;
  const starterId = room.depthOrderIds[0];
  const starter = room.competitors.find(({ id }) => id === starterId);
  return {
    programId,
    programRating: rating,
    preview: {
      rank,
      roleId: room.projection.roleId,
      opportunity: room.projection,
      playersAhead: rank - 1,
      starterClassYear: starter?.classYear ?? 4,
    },
  };
}

/**
 * The athlete's overall: the position-weighted rating the coaches' talent evaluation uses (not a
 * flat mean of every attribute), so training the skills a position values moves it visibly.
 */
export function overallVNext(
  profile: CreatedPositionPlayerProfile,
  mechanics: Pick<CareerVNextMechanics, 'room'>,
): number {
  return (
    derivePositionRecruitingProfile(profile, mechanics.room, 0)?.abilityScore ?? profile.overall
  );
}
