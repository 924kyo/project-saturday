import {
  advancePositionAlphaGameDayV2,
  advancePositionAlphaPostseasonRoundV2,
  beginPositionAlphaPostseasonV2,
  choosePositionAlphaSkillV2,
  commitPositionAlphaFocusPlanV2,
  resolvePositionAlphaEventV2,
  resolvePositionAlphaGameDaySnapV2,
  resolvePositionAlphaInjuryChoiceV2,
  reviewPositionAlphaSeasonV2,
  settlePositionAlphaGameDayV2,
  type PositionAlphaCommandResultV2,
  type PositionAlphaSessionV2,
} from '@project-saturday/game-core';
import {
  type CURRENT_POSITION_CASES,
  createCurrentPositionWeekFixture,
} from './position-alpha-current-fixture';

/** Last regular week and every bracket boundary use actual current commands. */
export function createCurrentPositionSeasonFixture(
  positionId: (typeof CURRENT_POSITION_CASES)[number][0],
  archetypeId: (typeof CURRENT_POSITION_CASES)[number][1],
  seasonIndex: 0 | 1,
  strongProgram = true,
  seedIndex = 0,
) {
  const fixture = createCurrentPositionWeekFixture(positionId, archetypeId, {
    legacyWeeks: 11,
    legacySeasons: seasonIndex,
    programId: strongProgram ? 'program_ember_peak_polytechnic' : 'program_prairie_forge',
    seedSuffix: seedIndex === 0 ? '' : `-season-${seedIndex}`,
  });
  const { mechanics } = fixture;
  const boundaries: PositionAlphaSessionV2[] = [];
  const apply = (result: PositionAlphaCommandResultV2) => {
    if (!result.ok) throw new Error(result.reason);
    boundaries.push(result.session);
    return result.session;
  };
  let current = fixture.next;
  for (let step = 0; step < 100; step += 1) {
    if (current.skills.offeredSkillIds !== null) {
      current = apply(
        choosePositionAlphaSkillV2(current, current.skills.offeredSkillIds[0], mechanics),
      );
      continue;
    }
    if (current.events.pending !== null) {
      current = apply(
        resolvePositionAlphaEventV2(current, current.events.pending.choiceIds[0], mechanics),
      );
      continue;
    }
    if (current.phase.type === 'SEASON_REVIEW') {
      boundaries.push(current);
      current = apply(beginPositionAlphaPostseasonV2(current, mechanics));
      continue;
    }
    if (current.phase.type === 'POSTSEASON_REVIEW') {
      const reviewed = apply(reviewPositionAlphaSeasonV2(current, mechanics));
      return { mechanics, boundaries, reviewed };
    }
    if (current.phase.type === 'POSTSEASON_PLANNING') {
      const worldOnly = advancePositionAlphaPostseasonRoundV2(current, mechanics);
      current = apply(
        worldOnly.ok
          ? worldOnly
          : commitPositionAlphaFocusPlanV2(
              current,
              ['action_film_study', 'action_recovery', 'action_study_hall'],
              mechanics,
            ),
      );
      continue;
    }
    const day = current.gameDay;
    if (day.type === 'ACTIVE_SNAP' && day.game?.game.type === 'ACTIVE') {
      current = apply(
        resolvePositionAlphaGameDaySnapV2(
          current,
          day.game.game.pendingSnap.decisionIds[0],
          mechanics,
        ),
      );
    } else if (day.type === 'EVENT_CHOICE') {
      current = apply(resolvePositionAlphaEventV2(current, day.event!.choiceIds[0], mechanics));
    } else if (day.type === 'INJURY_CHOICE') {
      current = apply(
        resolvePositionAlphaInjuryChoiceV2(current, 'injury_choice_rest_rehab', mechanics),
      );
    } else if (day.type === 'POST_GAME') {
      current = apply(settlePositionAlphaGameDayV2(current, mechanics));
    } else if (day.type !== 'IDLE') {
      current = apply(advancePositionAlphaGameDayV2(current, mechanics));
    } else throw new Error('Unexpected current season fixture boundary');
  }
  throw new Error('Current season fixture exceeded bounded commands');
}
