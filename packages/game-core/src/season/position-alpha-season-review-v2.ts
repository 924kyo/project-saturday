import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import type { RngState } from '../random/rng.js';
import {
  POSITION_STAT_IDS,
  attachPositionSeasonSummary,
  completePositionCareer,
  projectPositionOffseason,
  type PositionSeasonSummaryV1,
} from './position-lifecycle.js';
import {
  archiveCompletedWorldAlphaSeason,
  projectWorldAlphaOffseason,
  type WorldAlphaOffseasonProjection,
} from './world-alpha.js';
import {
  POSITION_ALPHA_CONTENT_SCHEMA_VERSION,
  type PositionAlphaSessionCommandMechanics,
} from './position-alpha-session.js';
import type { PositionAlphaSessionV2 } from './position-alpha-session-v2.js';

/** The summary, shortlist and world archive already live in their owning ledgers. */
export interface PositionAlphaSeasonReviewV2 {
  readonly model: 'position_alpha_season_review_v2';
  readonly careerRngBefore: RngState;
  readonly worldOffseason: WorldAlphaOffseasonProjection;
}

/** Owning commands validate the source; no recursive session snapshot is persisted. */
export function derivePositionAlphaSeasonReviewV2(
  source: PositionAlphaSessionV2,
  mechanics: PositionAlphaSessionCommandMechanics,
) {
  if (
    source.phase.type !== 'POSTSEASON_REVIEW' ||
    source.world.postseason.type !== 'COMPLETE' ||
    source.lifecycle.offseason !== null ||
    source.skills.offeredSkillIds !== null ||
    source.events.pending !== null ||
    (source.nil !== undefined &&
      (source.nil.state.pendingOffers.length > 0 || source.nil.state.activeObligation !== null))
  )
    return null;
  const worldOffseason = projectWorldAlphaOffseason(source.world, mechanics.world);
  const archived = archiveCompletedWorldAlphaSeason(
    source.worldHistory,
    source.world,
    mechanics.world,
  );
  if (!worldOffseason.ok || !archived.ok) return null;
  const offseason = projectPositionOffseason(
    worldOffseason.value,
    source.player.positionId,
    source.lifecycle.currentProgramId,
    source.room.projection.rank,
    source.lifecycle.relationships,
    [],
    source.careerRng,
    mechanics.lifecycle,
  );
  if (offseason === null) return null;
  const games = [...source.weekHistory, ...source.postseasonHistory];
  const currentGames = games.filter((game) => game.model === 'position_alpha_week_summary_v2');
  const firstWeek = source.weekHistory[0];
  const record = source.world.programRecords.find(
    ({ programId }) => programId === source.lifecycle.currentProgramId,
  );
  if (record === undefined || firstWeek === undefined) return null;
  const postseason = source.world.postseason;
  const reachedFinal = postseason.rounds[1].fixtures.some(
    ({ homeProgramId, awayProgramId }) =>
      homeProgramId === source.lifecycle.currentProgramId ||
      awayProgramId === source.lifecycle.currentProgramId,
  );
  const summary: PositionSeasonSummaryV1 = {
    model: 'position_season_summary_v1',
    seasonIndex: source.lifecycle.activeSeasonIndex,
    seasonId: `season_position_alpha_${source.lifecycle.activeSeasonIndex}`,
    programId: source.lifecycle.currentProgramId,
    positionId: source.player.positionId,
    outcomeId:
      postseason.championProgramId === source.lifecycle.currentProgramId
        ? 'season_outcome_champion'
        : reachedFinal
          ? 'season_outcome_runner_up'
          : postseason.qualifierProgramIds.includes(source.lifecycle.currentProgramId)
            ? 'season_outcome_semifinal_exit'
            : 'season_outcome_regular_season_complete',
    gamesPlayed: games.length,
    wins:
      record.wins +
      source.postseasonHistory.filter(({ resultId }) => resultId === 'game_result_win').length,
    losses:
      record.losses +
      source.postseasonHistory.filter(({ resultId }) => resultId === 'game_result_loss').length,
    ties:
      record.ties +
      source.postseasonHistory.filter(({ resultId }) => resultId === 'game_result_tie').length,
    stats: {
      model: 'position_stat_line_v1',
      positionId: source.player.positionId,
      entries: POSITION_STAT_IDS[source.player.positionId].map((statId) => ({
        statId,
        value: games.reduce(
          (total, game) =>
            total + (game.stats.entries.find((entry) => entry.statId === statId)?.value ?? 0),
          0,
        ),
      })),
    },
    averagePerformanceGrade: Math.round(
      games.reduce((total, game) => total + game.gameGrade, 0) / Math.max(1, games.length),
    ),
    startingDepthRank: firstWeek.depthRankBefore,
    startingRoleId:
      firstWeek.model === 'position_alpha_week_summary_v2'
        ? firstWeek.source.room.projection.roleId
        : firstWeek.roleId,
    finalDepthRank: source.room.projection.rank,
    finalRoleId: source.room.projection.roleId,
    injuryOutcomeIds: currentGames.flatMap(({ injury }) =>
      injury.outcome === 'INJURY' && injury.currentInjury !== null
        ? [injury.currentInjury.outcomeId]
        : [],
    ),
    injuryWeeksMissed: currentGames.filter(
      ({ injury }) => injury.availability?.availabilityId === 'injury_availability_out',
    ).length,
    ownedSkillIds: source.skills.ownedSkillIds,
    equippedSkillIds: source.skills.equippedSkillIds,
  };
  const lifecycle = attachPositionSeasonSummary(source.lifecycle, summary, offseason);
  if (lifecycle === null) return null;
  return deepFreeze(
    cloneSerializable({
      lifecycle,
      worldHistory: archived.value,
      careerRng: offseason.rng,
      seasonReview: {
        model: 'position_alpha_season_review_v2' as const,
        careerRngBefore: source.careerRng,
        worldOffseason: worldOffseason.value,
      },
    }),
  );
}

/** Current alpha retirement is not a third-season commitment or a new program stint. */
export function derivePositionAlphaCareerCompletionV2(
  source: PositionAlphaSessionV2,
): PositionAlphaSessionV2 | null {
  if (
    source.phase.type !== 'OFFSEASON_DECISION' ||
    source.phase.seasonIndex !== 1 ||
    source.lifecycle.activeSeasonIndex !== 1 ||
    source.lifecycle.completedSeasons.length !== 2 ||
    source.lifecycle.offseason === null ||
    source.seasonReview === undefined ||
    source.meta !== null ||
    source.gameDay.type !== 'IDLE'
  )
    return null;
  const lifecycle = {
    ...source.lifecycle,
    revision: source.lifecycle.revision + 1,
    offseason: null,
  };
  const meta = completePositionCareer(
    lifecycle,
    { schemaVersion: 2, revision: 0, alumni: [], unlockedOptionIds: [], programFamiliarity: [] },
    POSITION_ALPHA_CONTENT_SCHEMA_VERSION,
  );
  if (meta === null) return null;
  return deepFreeze(
    cloneSerializable({
      ...source,
      revision: source.revision + 1,
      lifecycle,
      meta,
      phase: { type: 'CAREER_COMPLETE', seasonIndex: 1 },
    }),
  );
}
