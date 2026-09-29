import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import { packJsonArchiveV1, type JsonArchiveV1 } from '../player/json-archive.js';
import type { ProgramId } from '../player/ids.js';
import type { NewInjuryEvidence } from '../injuries/types.js';
import { advanceInjuryDuration } from '../injuries/resolution.js';
import { generatePositionRoom } from '../programs/position-room.js';
import { commitPositionOffseason } from './position-lifecycle.js';
import {
  advancePositionAlphaSeasonClockV2,
  positionAlphaSourceClockV2,
} from './position-alpha-calendar-v2.js';
import { createWorldAlphaSeason, type WorldAlphaProgramMechanics } from './world-alpha.js';
import type {
  PositionAlphaSessionCommandMechanics,
  PositionAlphaSessionFoundationMechanics,
} from './position-alpha-session.js';
import type { PositionAlphaSessionV2 } from './position-alpha-session-v2.js';

export interface PositionAlphaSeasonStartV2 {
  readonly model: 'position_alpha_season_start_v2';
  readonly priorSeason: JsonArchiveV1;
  readonly selectedProgramId: ProgramId;
  readonly injury: NewInjuryEvidence | null;
  readonly worldProfiles: readonly WorldAlphaProgramMechanics[];
}

/** Only the owning aggregate accepts this context after replaying the archived commitment. */
export function positionAlphaActiveMechanicsV2<T extends PositionAlphaSessionFoundationMechanics>(
  session: Pick<PositionAlphaSessionV2, 'seasonStart'>,
  mechanics: T,
): T {
  return session.seasonStart === undefined
    ? mechanics
    : {
        ...mechanics,
        world: { ...mechanics.world, programProfiles: session.seasonStart.worldProfiles },
      };
}

/** Source validation belongs to the owning command/reader. No historical command is invoked. */
export function derivePositionAlphaSeasonStartV2(
  source: PositionAlphaSessionV2,
  selectedProgramId: ProgramId,
  mechanics: PositionAlphaSessionCommandMechanics,
): PositionAlphaSessionV2 | null {
  if (
    source.phase.type !== 'OFFSEASON_DECISION' ||
    source.phase.seasonIndex !== 0 ||
    source.lifecycle.activeSeasonIndex !== 0 ||
    source.seasonReview === undefined ||
    Object.hasOwn(source, 'seasonStart') ||
    source.gameDay.type !== 'IDLE'
  )
    return null;
  const clock = positionAlphaSourceClockV2(source);
  const seasonClock = clock === null ? null : advancePositionAlphaSeasonClockV2(clock);
  const lifecycle = commitPositionOffseason(
    source.lifecycle,
    selectedProgramId,
    mechanics.lifecycle,
  );
  const projected = source.seasonReview.worldOffseason.programs.find(
    ({ programId }) => programId === selectedProgramId,
  );
  if (lifecycle === null || projected === undefined || seasonClock === null) return null;
  const player = { ...source.player, state: lifecycle.playerState };
  const room = generatePositionRoom(player, source.careerRng, mechanics.roomNames, mechanics.room, {
    programId: selectedProgramId,
    roomTalentMean: Math.max(
      0,
      Math.min(100, 68 + projected.incomingPressure - projected.departingPressure),
    ),
    roomTalentSpread: 9,
    trustBase: 50,
    practiceFormBase: 50,
    experienceReadinessBase: 55,
    playerCoachTrustBonus: 0,
    playerPracticeForm: 55,
    playerExperienceReadiness: 60,
  });
  const worldProfiles = source.seasonReview.worldOffseason.programs.map(({ after }) => after);
  const world = createWorldAlphaSeason(
    { ...mechanics.world, programProfiles: worldProfiles },
    source.seasonReview.worldOffseason.rng,
    1,
    selectedProgramId,
  );
  const priorSeason = packJsonArchiveV1(source);
  if (!room.ok || !world.ok || priorSeason === null) return null;
  const latest = source.postseasonHistory.at(-1) ?? source.weekHistory.at(-1);
  const injury =
    latest?.model === 'position_alpha_week_summary_v2' && latest.injury.currentInjury !== null
      ? advanceInjuryDuration(
          latest.injury.currentInjury,
          latest.injury.availability!.recoveryCreditWeeks,
        )
      : null;
  const fields = Object.fromEntries(
    Object.entries(source).filter(([key]) => key !== 'seasonReview'),
  ) as Omit<PositionAlphaSessionV2, 'seasonReview'>;
  return deepFreeze(
    cloneSerializable({
      ...fields,
      revision: source.revision + 1,
      careerRng: room.generated.rng,
      player,
      lifecycle,
      room: room.generated.context,
      world: world.value,
      training: {
        ...source.training,
        attributes: player.attributes,
        state: {
          body: player.state.body,
          preparation: player.state.preparation,
          confidence: player.state.confidence,
        },
      },
      ...(source.academics === undefined
        ? {}
        : {
            academics: {
              ...source.academics,
              state: {
                ...source.academics.state,
                termIndex: 2,
                nextCheckpointIndex: mechanics.academics.checkpoints.length,
              },
            },
          }),
      ...(source.nil === undefined
        ? {}
        : { nil: { ...source.nil, weekStart: source.nil.state, planning: [] } }),
      seasonClock,
      seasonStart: {
        model: 'position_alpha_season_start_v2',
        priorSeason,
        selectedProgramId,
        injury,
        worldProfiles,
      },
      weekHistory: [],
      postseasonHistory: [],
      phase: { type: 'WEEK_PLANNING', weekIndex: 0 },
    }),
  );
}
