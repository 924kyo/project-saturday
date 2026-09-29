import {
  advancePositionAlphaGameDayV2,
  commitPositionAlphaFocusPlanV2,
  migratePositionAlphaSessionV1ToV2,
  resolvePositionAlphaEventV2,
  resolvePositionAlphaGameDaySnapV2,
  resolvePositionAlphaInjuryChoiceV2,
  settlePositionAlphaGameDayV2,
  type PositionAlphaCommandResultV2,
  type PositionAlphaSessionV2,
  type NilOfferId,
  type ProgramId,
} from '@project-saturday/game-core';
import {
  buildShippedPositionAlphaSessionCommandMechanics,
  createShippedPositionAlphaSession,
  chooseShippedPositionAlphaSkill,
  resolveShippedPositionAlphaEvent,
  resolveShippedPositionAlphaSeason,
  commitShippedPositionAlphaOffseason,
  defaultWrAppearance,
} from '@project-saturday/game-content';
import { advancePositionAlphaFixture } from './position-alpha-fixture';

export const CURRENT_POSITION_CASES = [
  ['position_qb', 'archetype_qb_field_general'],
  ['position_rb', 'archetype_rb_power_back'],
  ['position_cb', 'archetype_cb_press_man'],
] as const;

/** Test-only initial relationship context; every played boundary uses the real current commands. */
export function createCurrentPositionWeekFixture(
  positionId: (typeof CURRENT_POSITION_CASES)[number][0],
  archetypeId: (typeof CURRENT_POSITION_CASES)[number][1],
  options: {
    readonly positiveOpportunity?: boolean;
    readonly legacyWeeks?: number;
    readonly seedSuffix?: string;
    readonly initialBody?: number;
    readonly nilOfferId?: NilOfferId;
    readonly legacySeasons?: 0 | 1;
    readonly programId?: ProgramId;
  } = {},
) {
  const identity = {
    displayName: '경기 / Game Day',
    positionId,
    archetypeId,
    recruitingBackgroundId: 'background_late_bloomer' as const,
    personalityTraitIds: ['personality_disciplined', 'personality_leader'] as const,
    appearance: defaultWrAppearance,
    heightCm: 188,
    weightKg: 92,
  };
  const created = createShippedPositionAlphaSession({
    careerSeed: `current-ui-${positionId}${options.seedSuffix ?? ''}`,
    programId: options.programId ?? 'program_ember_peak_polytechnic',
    identity,
  });
  if (!created.ok) throw new Error(created.reason);
  const baseMechanics = buildShippedPositionAlphaSessionCommandMechanics({ identity })!;
  // Test-only eligibility isolation. All authored rewards, obligations and owning commands stay real.
  const mechanics =
    options.nilOfferId === undefined
      ? baseMechanics
      : {
          ...baseMechanics,
          nil: {
            ...baseMechanics.nil,
            catalog: {
              ...baseMechanics.nil.catalog,
              nilOffers: baseMechanics.nil.catalog.nilOffers.map((offer) => ({
                ...offer,
                requirements: {
                  ...offer.requirements,
                  minimumBrand: offer.id === options.nilOfferId ? 0 : 100,
                  maximumDepthRank:
                    offer.id === options.nilOfferId ? 8 : offer.requirements.maximumDepthRank,
                },
              })),
            },
          },
        };
  const initialState = {
    ...created.session.player.state,
    body: options.initialBody ?? created.session.player.state.body,
  };
  // Positive teammate context lets a developmental player receive a real role-bounded snap.
  // This is a valid initial test-world setup, not a production relationship or football rule.
  const source = {
    ...created.session,
    player: { ...created.session.player, state: initialState },
    training: {
      ...created.session.training,
      state: { ...created.session.training.state, body: initialState.body },
    },
    lifecycle: {
      ...created.session.lifecycle,
      playerState: initialState,
      relationships: created.session.lifecycle.relationships.map((track) =>
        track.actorId === 'DIRECT_COMPETITOR' ? { ...track, value: 100 } : track,
      ) as unknown as typeof created.session.lifecycle.relationships,
    },
  };
  let historical = options.positiveOpportunity === false ? created.session : source;
  const advanceHistoricalWeek = () => {
    historical = advancePositionAlphaFixture(historical);
    if (historical.skills.offeredSkillIds !== null) {
      const result = chooseShippedPositionAlphaSkill(
        historical,
        historical.skills.offeredSkillIds[0],
      );
      if (!result.ok) throw new Error(result.reason);
      historical = result.session;
    }
    if (historical.events.pending !== null) {
      const result = resolveShippedPositionAlphaEvent(
        historical,
        historical.events.pending.choiceIds[0],
      );
      if (!result.ok) throw new Error(result.reason);
      historical = result.session;
    }
  };
  if (options.legacySeasons === 1) {
    for (let week = 0; week < 12; week += 1) advanceHistoricalWeek();
    const reviewed = resolveShippedPositionAlphaSeason(historical, 'best_fit');
    if (!reviewed.ok) throw new Error(reviewed.reason);
    const committed = commitShippedPositionAlphaOffseason(
      reviewed.session,
      reviewed.session.lifecycle.currentProgramId,
    );
    if (!committed.ok) throw new Error(committed.reason);
    historical = committed.session;
  }
  for (let week = 0; week < (options.legacyWeeks ?? 0); week += 1) advanceHistoricalWeek();
  const initial = migratePositionAlphaSessionV1ToV2(historical, mechanics);
  if (initial === null) throw new Error('Invalid current UI initial fixture');
  const boundaries: PositionAlphaSessionV2[] = [initial];
  const apply = (result: PositionAlphaCommandResultV2): PositionAlphaSessionV2 => {
    if (!result.ok) throw new Error(result.reason);
    boundaries.push(result.session);
    return result.session;
  };
  let current = apply(
    commitPositionAlphaFocusPlanV2(
      initial,
      ['action_film_study', 'action_recovery', 'action_study_hall'],
      mechanics,
    ),
  );
  for (let step = 0; step < 50; step += 1) {
    const day = current.gameDay;
    if (day.type === 'POST_GAME') {
      const next = apply(settlePositionAlphaGameDayV2(current, mechanics));
      return { initial, mechanics, boundaries, postGame: current, next };
    }
    if (day.type === 'IDLE') throw new Error('Unexpected idle current Game Day');
    if (day.type === 'ACTIVE_SNAP') {
      if (day.game?.game.type !== 'ACTIVE') throw new Error('Missing active snap');
      current = apply(
        resolvePositionAlphaGameDaySnapV2(
          current,
          day.game.game.pendingSnap.decisionIds[0],
          mechanics,
        ),
      );
    } else if (day.type === 'EVENT_CHOICE') {
      current = apply(resolvePositionAlphaEventV2(current, day.event?.choiceIds[0], mechanics));
    } else if (day.type === 'INJURY_CHOICE') {
      current = apply(
        resolvePositionAlphaInjuryChoiceV2(current, 'injury_choice_rest_rehab', mechanics),
      );
    } else {
      current = apply(advancePositionAlphaGameDayV2(current, mechanics));
    }
  }
  throw new Error('Current UI fixture exceeded its bounded Game Day');
}
