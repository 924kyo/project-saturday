import {
  cbAlphaDecisions,
  cbAlphaPatterns,
  cbAlphaSkills,
  defaultWrAppearance,
  positionAlphaContent,
  positionLifecycleMechanics,
  qbAlphaDecisions,
  qbAlphaPatterns,
  qbAlphaSkills,
  rbAlphaDecisions,
  rbAlphaPatterns,
  rbAlphaSkills,
  rosterNameMechanicsPool,
  worldAlphaMechanicsDefinition,
  buildPositionCreationMechanics,
  buildPositionRoomMechanics,
  developmentWeekConfig,
} from '@project-saturday/game-content';
import {
  POSITION_STAT_IDS,
  advancePositionLifecycleWeek,
  attachPositionSeasonSummary,
  commitPositionOffseason,
  completePositionCareer,
  createPositionCareerLifecycle,
  createPositionPlayerProfile,
  createPositionTrainingProficiencyUses,
  createRng,
  createWorldAlphaSeason,
  derivePositionEligibilityContext,
  derivePositionInjuryExposure,
  derivePositionOverall,
  derivePositionRecruitingProfile,
  generatePositionRoom,
  initializeWorldAlphaPostseason,
  parsePositionCareerLifecycleJson,
  projectCbWorldAlphaResult,
  projectPositionOffseason,
  projectQbWorldAlphaResult,
  projectRbWorldAlphaResult,
  projectWorldAlphaOffseason,
  resolveCbSnap,
  resolveNextWorldAlphaPostseasonRound,
  resolveNextWorldAlphaRegularRound,
  resolvePositionRelationshipWeek,
  resolvePositionTrainingAction,
  resolveQbSnap,
  resolveRbSnap,
  startCbGame,
  startQbGame,
  startRbGame,
  type ActiveCbGame,
  type ActiveQbGame,
  type ActiveRbGame,
  type CbGameStatLine,
  type CbPlayerGameState,
  type CompleteCbGame,
  type CompleteQbGame,
  type CompleteRbGame,
  type CreatedPositionPlayerProfile,
  type DepthRoleId,
  type PlayerArchetypeId,
  type PlayerState,
  type PositionCareerLifecycleV1,
  type PositionId,
  type PositionMetaProfileV2,
  type PositionSeasonSummaryV1,
  type PositionStatLineV1,
  type ProgramId,
  type QbGameStatLine,
  type QbPlayerGameState,
  type RbGameStatLine,
  type RbPlayerGameState,
  type RecruitingBackgroundId,
  type RngState,
  type WorldAlphaFixtureMechanics,
  type WorldAlphaPlayerGameResult,
  type WorldAlphaSeasonState,
} from '@project-saturday/game-core';

export type AddedAlphaPositionId = Exclude<PositionId, 'position_wr'>;
export type PositionDecisionStrategy = 'best_fit' | 'risk_seeking';
export type PositionOffseasonPolicy = 'stay' | 'first_transfer';

export interface ExecutePositionAlphaCareerInput {
  readonly scenarioId: string;
  readonly seed: string;
  readonly positionId: AddedAlphaPositionId;
  readonly archetypeId: PlayerArchetypeId;
  readonly recruitingBackgroundId: RecruitingBackgroundId;
  readonly initialProgramId: ProgramId;
  readonly decisionStrategy: PositionDecisionStrategy;
  readonly offseasonPolicy: PositionOffseasonPolicy;
}

export interface ExecutedPositionAlphaCareer {
  readonly scenarioId: string;
  readonly seed: string;
  readonly positionId: AddedAlphaPositionId;
  readonly archetypeId: PlayerArchetypeId;
  readonly recruitingBackgroundId: RecruitingBackgroundId;
  readonly recruitTierId: string;
  readonly initialProgramId: ProgramId;
  readonly selectedProgramId: ProgramId;
  readonly initialRoleId: DepthRoleId;
  readonly secondSeasonRoleId: DepthRoleId;
  readonly offseasonPolicy: PositionOffseasonPolicy;
  readonly decisionStrategy: PositionDecisionStrategy;
  readonly gameCount: number;
  readonly totalKeySnaps: number;
  readonly averageGrade: number;
  readonly injuryRiskMinimumPermille: number;
  readonly injuryRiskMaximumPermille: number;
  readonly eligibilityTagIds: readonly string[];
  readonly relationshipValues: readonly number[];
  readonly seasonStatTotals: readonly PositionStatLineV1[];
  readonly lifecycleRoundTripCount: number;
  readonly careerRngDrawCount: number;
  readonly worldRngDrawCount: number;
  readonly worldArchiveSeasonCount: 2;
  readonly meta: PositionMetaProfileV2;
  readonly lifecycle: PositionCareerLifecycleV1;
}

interface GameExecution {
  readonly nextPlayer: QbPlayerGameState | RbPlayerGameState | CbPlayerGameState;
  readonly stats: QbGameStatLine | RbGameStatLine | CbGameStatLine;
  readonly grade: number;
  readonly keySnapCount: number;
  readonly worldResult: WorldAlphaPlayerGameResult;
  readonly rng: RngState;
}

function fail(input: ExecutePositionAlphaCareerInput, stage: string): never {
  throw new Error(`scenario=${JSON.stringify(input.scenarioId)} stage=${stage}`);
}

function finishQb(
  player: QbPlayerGameState,
  fixture: WorldAlphaFixtureMechanics,
  playerProgramId: ProgramId,
  weekIndex: number,
  opportunities: number,
  rng: RngState,
  strategy: PositionDecisionStrategy,
): GameExecution {
  const isHome = fixture.homeProgramId === playerProgramId;
  const opponentProgramId = isHome ? fixture.awayProgramId : fixture.homeProgramId;
  const started = startQbGame({
    gameId: `game_qb_report_${weekIndex}`,
    weekIndex,
    playerProgramId,
    opponentProgramId,
    isHome,
    opportunityCount: opportunities,
    playerTeamRating: 72,
    opponentDefenseRating: 68,
    opponentOffenseRating: 69,
    player,
    patterns: qbAlphaPatterns,
    decisions: qbAlphaDecisions,
    equippedSkills: [qbAlphaSkills[0]!, qbAlphaSkills[4]!],
    eventModifiers: { clueBonus: 0, decisionScoreFlat: 0, pressureReductionPermille: 0 },
    rng,
  });
  if (!started.ok) throw new Error(started.reason);
  let state = started.state;
  while (state.type === 'ACTIVE') {
    const active = state as ActiveQbGame;
    const pattern = active.patterns.find(({ id }) => id === active.pendingSnap.patternId)!;
    const fits = [...pattern.decisionFits].sort((left, right) => right.fit - left.fit);
    const choice = strategy === 'best_fit' ? fits[0]! : fits.at(-1)!;
    const resolved = resolveQbSnap(active, choice.decisionId);
    if (!resolved.ok) throw new Error(resolved.reason);
    state = resolved.state;
  }
  const complete = state as CompleteQbGame;
  const projected = projectQbWorldAlphaResult(complete.summary, fixture);
  if (!projected.ok) throw new Error(projected.reason);
  return {
    nextPlayer: complete.nextPlayer,
    stats: complete.summary.statLine,
    grade: complete.summary.gradeScore,
    keySnapCount: complete.keyPlayLog.length,
    worldResult: projected.result,
    rng: complete.rng,
  };
}

function finishRb(
  player: RbPlayerGameState,
  fixture: WorldAlphaFixtureMechanics,
  playerProgramId: ProgramId,
  weekIndex: number,
  opportunities: number,
  rng: RngState,
  strategy: PositionDecisionStrategy,
): GameExecution {
  const isHome = fixture.homeProgramId === playerProgramId;
  const opponentProgramId = isHome ? fixture.awayProgramId : fixture.homeProgramId;
  const started = startRbGame({
    gameId: `game_rb_report_${weekIndex}`,
    weekIndex,
    playerProgramId,
    opponentProgramId,
    isHome,
    opportunityCount: opportunities,
    playerTeamRating: 72,
    opponentDefenseRating: 68,
    opponentOffenseRating: 69,
    player,
    patterns: rbAlphaPatterns,
    decisions: rbAlphaDecisions,
    equippedSkills: [rbAlphaSkills[0]!, rbAlphaSkills[4]!],
    eventModifiers: { clueBonus: 0, decisionScoreFlat: 0, contactReductionPermille: 0 },
    rng,
  });
  if (!started.ok) throw new Error(started.reason);
  let state = started.state;
  while (state.type === 'ACTIVE') {
    const active = state as ActiveRbGame;
    const pattern = active.patterns.find(({ id }) => id === active.pendingSnap.patternId)!;
    const fits = [...pattern.decisionFits].sort((left, right) => right.fit - left.fit);
    const choice = strategy === 'best_fit' ? fits[0]! : fits.at(-1)!;
    const resolved = resolveRbSnap(active, choice.decisionId);
    if (!resolved.ok) throw new Error(resolved.reason);
    state = resolved.state;
  }
  const complete = state as CompleteRbGame;
  const projected = projectRbWorldAlphaResult(complete.summary, fixture);
  if (!projected.ok) throw new Error(projected.reason);
  return {
    nextPlayer: complete.nextPlayer,
    stats: complete.summary.statLine,
    grade: complete.summary.gradeScore,
    keySnapCount: complete.keyPlayLog.length,
    worldResult: projected.result,
    rng: complete.rng,
  };
}

function finishCb(
  player: CbPlayerGameState,
  fixture: WorldAlphaFixtureMechanics,
  playerProgramId: ProgramId,
  weekIndex: number,
  opportunities: number,
  rng: RngState,
  strategy: PositionDecisionStrategy,
): GameExecution {
  const isHome = fixture.homeProgramId === playerProgramId;
  const opponentProgramId = isHome ? fixture.awayProgramId : fixture.homeProgramId;
  const started = startCbGame({
    gameId: `game_cb_report_${weekIndex}`,
    weekIndex,
    playerProgramId,
    opponentProgramId,
    isHome,
    opportunityCount: opportunities,
    playerTeamRating: 72,
    opponentDefenseRating: 68,
    opponentOffenseRating: 69,
    player,
    patterns: cbAlphaPatterns,
    decisions: cbAlphaDecisions,
    equippedSkills: [cbAlphaSkills[0]!, cbAlphaSkills[4]!],
    eventModifiers: { clueBonus: 0, decisionScoreFlat: 0, targetReductionPermille: 0 },
    rng,
  });
  if (!started.ok) throw new Error(started.reason);
  let state = started.state;
  while (state.type === 'ACTIVE') {
    const active = state as ActiveCbGame;
    const pattern = active.patterns.find(({ id }) => id === active.pendingSnap.patternId)!;
    const fits = [...pattern.decisionFits].sort((left, right) => right.fit - left.fit);
    const choice = strategy === 'best_fit' ? fits[0]! : fits.at(-1)!;
    const resolved = resolveCbSnap(active, choice.decisionId);
    if (!resolved.ok) throw new Error(resolved.reason);
    state = resolved.state;
  }
  const complete = state as CompleteCbGame;
  const projected = projectCbWorldAlphaResult(complete.summary, fixture);
  if (!projected.ok) throw new Error(projected.reason);
  return {
    nextPlayer: complete.nextPlayer,
    stats: complete.summary.statLine,
    grade: complete.summary.gradeScore,
    keySnapCount: complete.keyPlayLog.length,
    worldResult: projected.result,
    rng: complete.rng,
  };
}

function addStats(
  positionId: AddedAlphaPositionId,
  totals: number[],
  stats: GameExecution['stats'],
): void {
  const values =
    positionId === 'position_qb'
      ? Object.values(stats as QbGameStatLine)
      : positionId === 'position_rb'
        ? Object.values(stats as RbGameStatLine)
        : Object.values(stats as CbGameStatLine);
  values.forEach((value, index) => {
    totals[index] = totals[index]! + value;
  });
}

function statLine(positionId: AddedAlphaPositionId, totals: readonly number[]): PositionStatLineV1 {
  return {
    model: 'position_stat_line_v1',
    positionId,
    entries: POSITION_STAT_IDS[positionId].map((statId, index) => ({
      statId,
      value: totals[index] ?? 0,
    })),
  };
}

function roundTrip(lifecycle: PositionCareerLifecycleV1): PositionCareerLifecycleV1 {
  const parsed = parsePositionCareerLifecycleJson(JSON.stringify(lifecycle));
  if (parsed === null) throw new Error('position_lifecycle_round_trip_failed');
  return parsed;
}

function roomPlayer(
  player: CreatedPositionPlayerProfile,
  attributes: CreatedPositionPlayerProfile['attributes'],
  state: PlayerState,
): CreatedPositionPlayerProfile {
  const overall = derivePositionOverall(player.positionId, attributes);
  if (!overall.ok) throw new Error('position_overall_failed');
  return { ...player, attributes, state, overall: overall.overall };
}

export function executePositionAlphaCareer(
  input: ExecutePositionAlphaCareerInput,
): ExecutedPositionAlphaCareer {
  const mechanicsResult = buildPositionCreationMechanics({
    positionId: input.positionId,
    archetypeId: input.archetypeId,
    recruitingBackgroundId: input.recruitingBackgroundId,
    personalityTraitIds: ['personality_disciplined', 'personality_leader'],
  });
  if (!mechanicsResult.ok) return fail(input, 'creation_mechanics');
  const created = createPositionPlayerProfile({
    careerSeed: input.seed,
    identity: {
      appearance: defaultWrAppearance,
      archetypeId: input.archetypeId,
      displayName: `M7 ${input.positionId}`,
      heightCm: input.positionId === 'position_qb' ? 190 : 183,
      personalityTraitIds: ['personality_disciplined', 'personality_leader'],
      positionId: input.positionId,
      recruitingBackgroundId: input.recruitingBackgroundId,
      weightKg: input.positionId === 'position_rb' ? 98 : 91,
    },
    mechanics: mechanicsResult.mechanics,
  });
  if (!created.ok) return fail(input, 'create_player');
  const player = created.player;
  const roomMechanics = buildPositionRoomMechanics(input.positionId);
  if (roomMechanics === undefined) return fail(input, 'room_mechanics');
  const recruiting = derivePositionRecruitingProfile(player, roomMechanics, 0);
  if (recruiting === undefined) return fail(input, 'recruiting');
  let careerRng = createRng(`${input.seed}:career`);
  let currentPlayer = player;
  const firstRoom = generatePositionRoom(
    currentPlayer,
    careerRng,
    rosterNameMechanicsPool,
    roomMechanics,
    {
      programId: input.initialProgramId,
      roomTalentMean: 66,
      roomTalentSpread: 9,
      trustBase: 50,
      practiceFormBase: 50,
      experienceReadinessBase: 50,
      playerCoachTrustBonus: 0,
      playerPracticeForm: 50,
      playerExperienceReadiness: 45,
    },
  );
  if (!firstRoom.ok) return fail(input, 'initial_room');
  careerRng = firstRoom.generated.rng;
  let roleId = firstRoom.generated.context.projection.roleId;
  let depthRank = firstRoom.generated.context.projection.rank;
  let interactiveSnapMaximum = firstRoom.generated.context.projection.interactiveSnapMaximum;
  const initialRoleId = roleId;
  const initialLifecycle = createPositionCareerLifecycle(
    {
      careerId: `career_m7_${input.scenarioId.replace(/[^a-z0-9]+/gu, '_')}`,
      playerId: player.id,
      displayName: player.displayName,
      appearance: player.appearance,
      positionId: input.positionId,
      archetypeId: input.archetypeId,
      careerSeed: input.seed,
    },
    input.initialProgramId,
    player.state,
  );
  if (initialLifecycle === null) return fail(input, 'lifecycle_create');
  let roundTrips = 1;
  let lifecycle: PositionCareerLifecycleV1 = roundTrip(initialLifecycle);
  let totalGames = 0;
  let totalSnaps = 0;
  let gradeTotal = 0;
  const riskValues: number[] = [];
  const eligibilityTags = new Set<string>();
  const seasonLines: PositionStatLineV1[] = [];
  let worldRngDrawCount = 0;
  let secondSeasonRoleId = roleId;

  for (let seasonIndex = 0; seasonIndex < 2; seasonIndex += 1) {
    const seasonStartingRoleId = roleId;
    const seasonStartingDepthRank = depthRank;
    const worldCreated = createWorldAlphaSeason(
      worldAlphaMechanicsDefinition,
      createRng(`${input.seed}:world:${seasonIndex}`),
      seasonIndex,
      lifecycle.currentProgramId,
    );
    if (!worldCreated.ok) return fail(input, `world_create_${seasonIndex}`);
    let world: WorldAlphaSeasonState = worldCreated.value;
    const totals = POSITION_STAT_IDS[input.positionId].map(() => 0);
    let seasonWins = 0;
    let seasonLosses = 0;
    let seasonTies = 0;
    let seasonGrade = 0;
    const proficiencyUses = createPositionTrainingProficiencyUses(input.positionId);
    let trainingState = {
      positionId: input.positionId,
      attributes: currentPlayer.attributes,
      proficiencyUses,
      state: {
        body: lifecycle.playerState.body,
        preparation: lifecycle.playerState.preparation,
        confidence: lifecycle.playerState.confidence,
      },
    };
    for (let roundIndex = 0; roundIndex < 12; roundIndex += 1) {
      const action = positionAlphaContent.trainingActions.filter(
        ({ positionId }) => positionId === input.positionId,
      )[roundIndex % 3]!;
      const trained = resolvePositionTrainingAction(trainingState, action, developmentWeekConfig);
      if (!trained.ok) return fail(input, `training_${seasonIndex}_${roundIndex}`);
      trainingState = trained.next;
      currentPlayer = roomPlayer(currentPlayer, trainingState.attributes, {
        ...lifecycle.playerState,
        ...trainingState.state,
      });
      const round = worldAlphaMechanicsDefinition.regularSeasonRounds[roundIndex]!;
      const fixture = round.fixtures.find(
        ({ homeProgramId, awayProgramId }) =>
          homeProgramId === lifecycle.currentProgramId ||
          awayProgramId === lifecycle.currentProgramId,
      )!;
      const opportunityCount = Math.min(5, Math.max(1, interactiveSnapMaximum));
      const gamePlayer = {
        id: currentPlayer.id,
        positionId: input.positionId,
        attributes: currentPlayer.attributes,
        state: {
          body: currentPlayer.state.body,
          preparation: currentPlayer.state.preparation,
          confidence: currentPlayer.state.confidence,
          coachTrust: currentPlayer.state.coachTrust,
        },
      };
      const game =
        input.positionId === 'position_qb'
          ? finishQb(
              gamePlayer as QbPlayerGameState,
              fixture,
              lifecycle.currentProgramId,
              roundIndex,
              opportunityCount,
              careerRng,
              input.decisionStrategy,
            )
          : input.positionId === 'position_rb'
            ? finishRb(
                gamePlayer as RbPlayerGameState,
                fixture,
                lifecycle.currentProgramId,
                roundIndex,
                opportunityCount,
                careerRng,
                input.decisionStrategy,
              )
            : finishCb(
                gamePlayer as CbPlayerGameState,
                fixture,
                lifecycle.currentProgramId,
                roundIndex,
                opportunityCount,
                careerRng,
                input.decisionStrategy,
              );
      careerRng = game.rng;
      currentPlayer = roomPlayer(currentPlayer, game.nextPlayer.attributes, {
        ...lifecycle.playerState,
        ...game.nextPlayer.state,
      });
      addStats(input.positionId, totals, game.stats);
      totalGames += 1;
      totalSnaps += game.keySnapCount;
      gradeTotal += game.grade;
      seasonGrade += game.grade;
      if (game.worldResult.winnerProgramId === lifecycle.currentProgramId) seasonWins += 1;
      else if (game.worldResult.winnerProgramId === null) seasonTies += 1;
      else seasonLosses += 1;
      const relationship = resolvePositionRelationshipWeek(
        input.positionId,
        seasonIndex * 20 + roundIndex,
        lifecycle.relationships,
        [action.id, action.id, action.id],
        positionLifecycleMechanics,
      );
      if (relationship === null) return fail(input, `relationship_${seasonIndex}_${roundIndex}`);
      const nextLifecycle = advancePositionLifecycleWeek(
        lifecycle,
        {
          ...currentPlayer.state,
          coachTrust: Math.max(
            0,
            Math.min(100, currentPlayer.state.coachTrust + relationship.coachTrustModifier),
          ),
        },
        relationship,
      );
      if (nextLifecycle === null) return fail(input, `lifecycle_week_${seasonIndex}_${roundIndex}`);
      lifecycle = roundTrip(nextLifecycle);
      roundTrips += 1;
      const injury = derivePositionInjuryExposure(
        {
          positionId: input.positionId,
          body: lifecycle.playerState.body,
          durability: currentPlayer.attributes.attribute_durability!.rating,
          workloadSnapPermille: opportunityCount * 180,
          recentTrainingLoad: Math.max(
            0,
            -trained.evidence.bodyAfter + trained.evidence.bodyBefore,
          ),
          currentInjury: null,
        },
        positionLifecycleMechanics,
      );
      if (injury === null) return fail(input, `injury_${seasonIndex}_${roundIndex}`);
      riskValues.push(injury.totalRiskPermille);
      const line = statLine(input.positionId, totals);
      const eligibility = derivePositionEligibilityContext(
        input.positionId,
        roleId,
        lifecycle.playerState.brand,
        Math.round(lifecycle.playerState.gpa * 1_000),
        line,
        lifecycle.relationships,
      );
      if (eligibility === null) return fail(input, `eligibility_${seasonIndex}_${roundIndex}`);
      eligibility.tagIds.forEach((tagId) => eligibilityTags.add(tagId));
      const resolved = resolveNextWorldAlphaRegularRound(
        world,
        worldAlphaMechanicsDefinition,
        game.worldResult,
      );
      if (!resolved.ok) return fail(input, `world_round_${seasonIndex}_${roundIndex}`);
      world = resolved.value.state;
    }
    const postseason = initializeWorldAlphaPostseason(world, worldAlphaMechanicsDefinition);
    if (!postseason.ok) return fail(input, `postseason_init_${seasonIndex}`);
    world = postseason.value;
    while (world.postseason.type === 'ACTIVE') {
      const round = world.postseason.rounds[world.postseason.currentRoundIndex];
      const fixture = round.fixtures.find(
        ({ homeProgramId, awayProgramId }) =>
          homeProgramId === lifecycle.currentProgramId ||
          awayProgramId === lifecycle.currentProgramId,
      );
      let result: WorldAlphaPlayerGameResult | null = null;
      if (fixture !== undefined) {
        const gamePlayer = {
          id: currentPlayer.id,
          positionId: input.positionId,
          attributes: currentPlayer.attributes,
          state: {
            body: currentPlayer.state.body,
            preparation: currentPlayer.state.preparation,
            confidence: currentPlayer.state.confidence,
            coachTrust: currentPlayer.state.coachTrust,
          },
        };
        const game =
          input.positionId === 'position_qb'
            ? finishQb(
                gamePlayer as QbPlayerGameState,
                fixture,
                lifecycle.currentProgramId,
                12 + totalGames,
                5,
                careerRng,
                input.decisionStrategy,
              )
            : input.positionId === 'position_rb'
              ? finishRb(
                  gamePlayer as RbPlayerGameState,
                  fixture,
                  lifecycle.currentProgramId,
                  12 + totalGames,
                  5,
                  careerRng,
                  input.decisionStrategy,
                )
              : finishCb(
                  gamePlayer as CbPlayerGameState,
                  fixture,
                  lifecycle.currentProgramId,
                  12 + totalGames,
                  5,
                  careerRng,
                  input.decisionStrategy,
                );
        careerRng = game.rng;
        result = game.worldResult;
        addStats(input.positionId, totals, game.stats);
        totalGames += 1;
        totalSnaps += game.keySnapCount;
        gradeTotal += game.grade;
        seasonGrade += game.grade;
        if (game.worldResult.winnerProgramId === lifecycle.currentProgramId) seasonWins += 1;
        else if (game.worldResult.winnerProgramId === null) seasonTies += 1;
        else seasonLosses += 1;
        currentPlayer = roomPlayer(currentPlayer, game.nextPlayer.attributes, {
          ...lifecycle.playerState,
          ...game.nextPlayer.state,
        });
      }
      const resolved = resolveNextWorldAlphaPostseasonRound(
        world,
        worldAlphaMechanicsDefinition,
        result,
      );
      if (!resolved.ok) return fail(input, `postseason_round_${seasonIndex}`);
      world = resolved.value;
    }
    worldRngDrawCount += world.rng.drawCount;
    const worldOffseason = projectWorldAlphaOffseason(world, worldAlphaMechanicsDefinition);
    if (!worldOffseason.ok) return fail(input, `world_offseason_${seasonIndex}`);
    const projected = projectPositionOffseason(
      worldOffseason.value,
      input.positionId,
      lifecycle.currentProgramId,
      roleId === 'depth_role_starter'
        ? 1
        : roleId === 'depth_role_rotation'
          ? 3
          : roleId === 'depth_role_reserve'
            ? 5
            : 7,
      lifecycle.relationships,
      [],
      careerRng,
      positionLifecycleMechanics,
    );
    if (projected === null) return fail(input, `position_offseason_${seasonIndex}`);
    careerRng = projected.rng;
    const line = statLine(input.positionId, totals);
    seasonLines.push(line);
    const summary: PositionSeasonSummaryV1 = {
      model: 'position_season_summary_v1',
      seasonIndex,
      seasonId: `season_m7_${input.scenarioId.replace(/[^a-z0-9]+/gu, '_')}_${seasonIndex}`,
      programId: lifecycle.currentProgramId,
      positionId: input.positionId,
      outcomeId:
        world.postseason.type === 'COMPLETE' &&
        world.postseason.championProgramId === lifecycle.currentProgramId
          ? 'season_outcome_champion'
          : 'season_outcome_regular_season_complete',
      gamesPlayed: seasonWins + seasonLosses + seasonTies,
      wins: seasonWins,
      losses: seasonLosses,
      ties: seasonTies,
      stats: line,
      averagePerformanceGrade: Math.round(
        seasonGrade / Math.max(1, seasonWins + seasonLosses + seasonTies),
      ),
      startingDepthRank: seasonStartingDepthRank,
      startingRoleId: seasonStartingRoleId,
      finalDepthRank: depthRank,
      finalRoleId: roleId,
      injuryOutcomeIds: [],
      injuryWeeksMissed: 0,
      ownedSkillIds: [],
      equippedSkillIds: [null, null, null],
    };
    const reviewed = attachPositionSeasonSummary(lifecycle, summary, projected);
    if (reviewed === null) return fail(input, `season_summary_${seasonIndex}`);
    lifecycle = roundTrip(reviewed);
    roundTrips += 1;
    const selectedProgramId =
      seasonIndex === 0 && input.offseasonPolicy === 'first_transfer'
        ? projected.options[1].programId
        : lifecycle.currentProgramId;
    const committed = commitPositionOffseason(
      lifecycle,
      selectedProgramId,
      positionLifecycleMechanics,
    );
    if (committed === null) return fail(input, `offseason_commit_${seasonIndex}`);
    lifecycle = roundTrip(committed);
    roundTrips += 1;
    if (seasonIndex === 0) {
      const regenerated = generatePositionRoom(
        roomPlayer(currentPlayer, currentPlayer.attributes, lifecycle.playerState),
        careerRng,
        rosterNameMechanicsPool,
        roomMechanics,
        {
          programId: lifecycle.currentProgramId,
          roomTalentMean: 68,
          roomTalentSpread: 9,
          trustBase: 50,
          practiceFormBase: 50,
          experienceReadinessBase: 55,
          playerCoachTrustBonus: 0,
          playerPracticeForm: 55,
          playerExperienceReadiness: 60,
        },
      );
      if (!regenerated.ok) return fail(input, 'second_room');
      careerRng = regenerated.generated.rng;
      roleId = regenerated.generated.context.projection.roleId;
      depthRank = regenerated.generated.context.projection.rank;
      interactiveSnapMaximum = regenerated.generated.context.projection.interactiveSnapMaximum;
      secondSeasonRoleId = roleId;
    }
  }
  const meta = completePositionCareer(
    lifecycle,
    {
      schemaVersion: 2,
      revision: 0,
      alumni: [],
      unlockedOptionIds: [],
      programFamiliarity: [],
    },
    9,
  );
  if (meta === null) return fail(input, 'career_complete');
  return {
    scenarioId: input.scenarioId,
    seed: input.seed,
    positionId: input.positionId,
    archetypeId: input.archetypeId,
    recruitingBackgroundId: input.recruitingBackgroundId,
    recruitTierId: recruiting.recruitTierId,
    initialProgramId: input.initialProgramId,
    selectedProgramId: lifecycle.currentProgramId,
    initialRoleId,
    secondSeasonRoleId,
    offseasonPolicy: input.offseasonPolicy,
    decisionStrategy: input.decisionStrategy,
    gameCount: totalGames,
    totalKeySnaps: totalSnaps,
    averageGrade: Math.round(gradeTotal / Math.max(1, totalGames)),
    injuryRiskMinimumPermille: Math.min(...riskValues),
    injuryRiskMaximumPermille: Math.max(...riskValues),
    eligibilityTagIds: [...eligibilityTags].sort(),
    relationshipValues: lifecycle.relationships.map(({ value }) => value),
    seasonStatTotals: seasonLines,
    lifecycleRoundTripCount: roundTrips,
    careerRngDrawCount: careerRng.drawCount,
    worldRngDrawCount,
    worldArchiveSeasonCount: 2,
    meta,
    lifecycle,
  };
}
