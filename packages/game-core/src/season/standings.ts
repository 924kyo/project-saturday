import { deepFreeze } from '../player/immutable.js';
import { compareCodeUnits } from '../player/order.js';
import type {
  RegularSeasonRoundState,
  SeasonMechanicsDefinition,
  SeasonProgramRecord,
  SeasonStanding,
} from './types.js';

export interface DerivedSeasonTables {
  readonly programRecords: readonly SeasonProgramRecord[];
  readonly standings: readonly SeasonStanding[];
}

export function deriveSeasonTables(
  definition: SeasonMechanicsDefinition,
  regularSeasonResults: readonly RegularSeasonRoundState[],
): DerivedSeasonTables {
  const recordByProgramId = new Map(
    definition.programProfiles.map(({ programId }) => [
      programId,
      {
        programId,
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      },
    ]),
  );
  const resultByFixtureId = new Map(
    regularSeasonResults.flatMap(({ fixtureResults }) =>
      fixtureResults.flatMap((result) =>
        result === null ? [] : [[result.fixtureId, result] as const],
      ),
    ),
  );
  const playedOpponents = new Map<string, Map<string, number>>();

  for (const round of definition.regularSeasonRounds) {
    for (const fixture of round.fixtures) {
      const result = resultByFixtureId.get(fixture.id);
      if (result === undefined) continue;
      const homeRecord = recordByProgramId.get(fixture.homeProgramId)!;
      const awayRecord = recordByProgramId.get(fixture.awayProgramId)!;
      homeRecord.pointsFor += result.homeScore;
      homeRecord.pointsAgainst += result.awayScore;
      awayRecord.pointsFor += result.awayScore;
      awayRecord.pointsAgainst += result.homeScore;
      if (result.winnerProgramId === null) {
        homeRecord.ties += 1;
        awayRecord.ties += 1;
      } else if (result.winnerProgramId === fixture.homeProgramId) {
        homeRecord.wins += 1;
        awayRecord.losses += 1;
      } else {
        awayRecord.wins += 1;
        homeRecord.losses += 1;
      }
      const homeOpponentResults = playedOpponents.get(fixture.homeProgramId) ?? new Map();
      const awayOpponentResults = playedOpponents.get(fixture.awayProgramId) ?? new Map();
      homeOpponentResults.set(
        fixture.awayProgramId,
        (homeOpponentResults.get(fixture.awayProgramId) ?? 0) +
          (result.winnerProgramId === fixture.homeProgramId ? 1 : 0),
      );
      awayOpponentResults.set(
        fixture.homeProgramId,
        (awayOpponentResults.get(fixture.homeProgramId) ?? 0) +
          (result.winnerProgramId === fixture.awayProgramId ? 1 : 0),
      );
      playedOpponents.set(fixture.homeProgramId, homeOpponentResults);
      playedOpponents.set(fixture.awayProgramId, awayOpponentResults);
    }
  }

  const programRecords = [...recordByProgramId.values()].sort((left, right) =>
    compareCodeUnits(left.programId, right.programId),
  );
  const scheduleStrengthByProgramId = new Map(
    definition.programProfiles.map(({ programId, scheduleStrength }) => [
      programId,
      scheduleStrength,
    ]),
  );
  const winsGroups = new Map<number, Set<string>>();
  for (const record of programRecords) {
    const group = winsGroups.get(record.wins) ?? new Set<string>();
    group.add(record.programId);
    winsGroups.set(record.wins, group);
  }
  const headToHeadWinsByProgramId = new Map<string, number>();
  for (const record of programRecords) {
    const tiedPrograms = winsGroups.get(record.wins) ?? new Set<string>();
    const wins = [...(playedOpponents.get(record.programId)?.entries() ?? [])].reduce(
      (total, [opponentId, won]) => total + (tiedPrograms.has(opponentId) ? won : 0),
      0,
    );
    headToHeadWinsByProgramId.set(record.programId, wins);
  }
  const standings = [...programRecords]
    .sort((left, right) => {
      if (left.wins !== right.wins) return right.wins - left.wins;
      const leftHeadToHeadWins = headToHeadWinsByProgramId.get(left.programId) ?? 0;
      const rightHeadToHeadWins = headToHeadWinsByProgramId.get(right.programId) ?? 0;
      if (leftHeadToHeadWins !== rightHeadToHeadWins) {
        return rightHeadToHeadWins - leftHeadToHeadWins;
      }
      const leftScheduleStrength = scheduleStrengthByProgramId.get(left.programId) ?? 0;
      const rightScheduleStrength = scheduleStrengthByProgramId.get(right.programId) ?? 0;
      return leftScheduleStrength === rightScheduleStrength
        ? compareCodeUnits(left.programId, right.programId)
        : rightScheduleStrength - leftScheduleStrength;
    })
    .map((record, index) => ({
      rank: index + 1,
      programId: record.programId,
      wins: record.wins,
      losses: record.losses,
      ties: record.ties,
      headToHeadWins: headToHeadWinsByProgramId.get(record.programId) ?? 0,
      scheduleStrength: scheduleStrengthByProgramId.get(record.programId) ?? 0,
    }));
  return deepFreeze({ programRecords, standings });
}
