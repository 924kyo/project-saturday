import {
  resolveEventChoice,
  selectWeeklyEvent,
  collectEquippedLifeHooks,
  deriveRelationshipContextProjection,
  validateCareerSession,
  type CareerSession,
  type EventChoiceId,
  type EventCommandFailureReason,
  type PlayerTagId,
} from '@project-saturday/game-core';

import { eventMechanicsDefinitions, eventSelectionTuning } from './events.js';
import { programContent } from './programs.js';
import { skillMechanicsDefinitions } from './skills.js';
import { offFieldMechanicsCatalog } from './off-field.js';

export type EventSessionCommandResult =
  | { readonly ok: true; readonly session: CareerSession }
  | {
      readonly ok: false;
      readonly session: CareerSession;
      readonly reason: EventCommandFailureReason;
    };

export function deriveShippedEventContextTagIds(session: CareerSession): readonly PlayerTagId[] {
  if (session.world.calendar.type !== 'ACTIVE') return [];
  const calendar = session.world.calendar;
  const program = programContent.programs.find(({ id }) => id === session.career.programId);
  const programTags = program?.traitIds.map((traitId) => `tag_${traitId}` as PlayerTagId) ?? [];
  const lifeHooks = collectEquippedLifeHooks(
    session.career.player.skillState,
    skillMechanicsDefinitions,
  );
  const skillTags: PlayerTagId[] =
    lifeHooks.ok && lifeHooks.hooks.some(({ hookId }) => hookId === 'life_hook_event_option_access')
      ? ['tag_skill_event_option_access']
      : [];
  const relationshipTags =
    deriveRelationshipContextProjection(session.career, offFieldMechanicsCatalog)?.tagIds ?? [];
  if (calendar.stage === 'CAMP') {
    return ['tag_season_camp', ...programTags, ...skillTags, ...relationshipTags];
  }
  if (calendar.stage === 'POSTSEASON') {
    return ['tag_season_postseason', ...programTags, ...skillTags, ...relationshipTags];
  }
  const round = calendar.definition.regularSeasonRounds[calendar.completedRegularSeasonRoundCount];
  const programId = session.career.programId;
  const fixture = round?.fixtures.find(
    (candidate) => candidate.homeProgramId === programId || candidate.awayProgramId === programId,
  );
  const tags: PlayerTagId[] = [
    'tag_season_regular',
    ...programTags,
    ...skillTags,
    ...relationshipTags,
  ];
  if (fixture !== undefined && programId !== null) {
    tags.push(fixture.homeProgramId === programId ? 'tag_game_home' : 'tag_game_away');
    if (fixture.spotlight) tags.push('tag_game_spotlight');
  }
  return tags;
}

export function selectShippedWeeklyEvent(session: CareerSession): EventSessionCommandResult {
  if (!validateCareerSession(session).ok) {
    return { ok: false, session, reason: 'event.invalid_career' };
  }
  const result = selectWeeklyEvent(
    session.career,
    { additionalTagIds: deriveShippedEventContextTagIds(session) },
    eventMechanicsDefinitions,
    eventSelectionTuning,
  );
  return result.ok
    ? { ok: true, session: { ...session, career: result.career } }
    : { ok: false, session, reason: result.reason };
}

export function resolveShippedEventChoice(
  session: CareerSession,
  choiceId: EventChoiceId,
): EventSessionCommandResult {
  if (!validateCareerSession(session).ok) {
    return { ok: false, session, reason: 'event.invalid_career' };
  }
  const result = resolveEventChoice(session.career, choiceId, eventMechanicsDefinitions);
  return result.ok
    ? { ok: true, session: { ...session, career: result.career } }
    : { ok: false, session, reason: result.reason };
}
