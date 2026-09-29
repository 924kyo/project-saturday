import { isDeepStrictEqual } from 'node:util';
import * as content from '@project-saturday/game-content';
import * as core from '@project-saturday/game-core';

const POSITION_CASES = [
  ['position_qb', 'archetype_qb_field_general'],
  ['position_rb', 'archetype_rb_power_back'],
  ['position_cb', 'archetype_cb_press_man'],
] as const;
const MAX_COMMAND_MS = 1_000;
const MAX_SAVE_BYTES = 1_000_000;
const browserLife = process.argv.includes('--browser-life');
const seedOffset = process.argv.includes('--seed-offset=3') ? 3 : 0;
const onlyQb = process.argv.includes('--qb-only');
const wireV3 = process.argv.includes('--wire-v3');
if (
  process.argv
    .slice(2)
    .some(
      (argument) =>
        !['--browser-life', '--seed-offset=3', '--qb-only', '--wire-v3'].includes(argument),
    ) ||
  (!browserLife && seedOffset !== 0)
)
  throw new Error(
    'Supported profile options: --browser-life [--seed-offset=3] [--qb-only] [--wire-v3]',
  );

for (const [positionId, archetypeId] of POSITION_CASES) {
  if (onlyQb && positionId !== 'position_qb') continue;
  const browserSeedIndex = POSITION_CASES.findIndex(([id]) => id === positionId) + 1 + seedOffset;
  const careerSeed = browserLife
    ? `career-seed:77777777-7777-4777-8777-${String(browserSeedIndex).padStart(12, '0')}`
    : `direct-${positionId}`;
  const identity = {
    displayName: browserLife
      ? `${seedOffset === 0 ? 'ko-KR' : 'en-US'} ${positionId} career`
      : 'Archive Probe',
    positionId,
    archetypeId,
    recruitingBackgroundId: browserLife
      ? content.positionAlphaContent.creationMechanics.backgroundProfiles.find(
          (background) => background.positionId === positionId,
        )!.id
      : ('background_late_bloomer' as const),
    personalityTraitIds: ['personality_disciplined', 'personality_leader'] as const,
    appearance: content.defaultWrAppearance,
    heightCm: 188,
    weightKg: 92,
  };
  const mechanics = content.buildShippedPositionAlphaSessionCommandMechanics({ identity });
  if (mechanics === null) throw new Error('Invalid current mechanics');
  const created = content.createShippedPositionAlphaSession({
    careerSeed,
    programId: 'program_ember_peak_polytechnic',
    identity,
  });
  if (!created.ok) throw new Error(created.reason);
  const initial = core.migratePositionAlphaSessionV1ToV2(created.session, mechanics);
  if (initial === null) throw new Error('Invalid current migration');
  let maxPersistedBytes = 0;
  let maxEnvelopeBytes = 0;
  let maxPageBytes = 0;
  let maxPageExpandedChars = 0;
  let maxCommandMs = 0;
  let commandCount = 0;
  let fallbackCount = 0;

  function run(command: () => core.PositionAlphaCommandResultV2): core.PositionAlphaSessionV2 {
    const start = performance.now();
    const result = command();
    const elapsedMs = performance.now() - start;
    if (!result.ok) throw new Error(result.reason);
    if (elapsedMs >= MAX_COMMAND_MS)
      throw new Error(`${positionId}: command exceeded ${MAX_COMMAND_MS} ms`);
    maxCommandMs = Math.max(maxCommandMs, elapsedMs);
    const wire = wireV3
      ? core.serializePositionAlphaSessionWireV3Json(result.session, mechanics!)
      : core.serializePositionAlphaSessionV2Json(result.session, mechanics!);
    if (wire === null)
      throw new Error(
        JSON.stringify({
          failure: 'wire_rejected',
          careerSeed,
          browserLife,
          wireVersion: wireV3 ? 3 : 2,
          positionId,
          revision: result.session.revision,
          phase: result.session.phase,
          regularExpandedChars: JSON.stringify(result.session.weekHistory).length,
          regularArchiveAccepted: core.packJsonArchiveV1(result.session.weekHistory) !== null,
          postseasonExpandedChars: JSON.stringify(result.session.postseasonHistory).length,
          postseasonArchiveAccepted:
            core.packJsonArchiveV1(result.session.postseasonHistory) !== null,
        }),
      );
    const size = Buffer.byteLength(wire, 'utf8');
    if (size >= MAX_SAVE_BYTES)
      throw new Error(`${positionId}: save exceeded ${MAX_SAVE_BYTES} bytes`);
    // Exact envelope byte overhead: checksum contents vary, but its fixed format does not.
    // This measures transport size, not checksum validity (covered by the storage codec tests).
    const payload = JSON.parse(wire) as core.PositionAlphaSessionWireV3;
    const envelopeBytes = Buffer.byteLength(
      JSON.stringify({
        saveVersion: wireV3 ? 3 : 2,
        contentVersion: String(content.CONTENT_COMPATIBILITY_VERSION),
        createdAt: '2026-09-14T00:00:00.000Z',
        updatedAt: '2026-09-14T00:00:00.000Z',
        payload,
        checksum: 'fnv1a32:00000000',
      }),
      'utf8',
    );
    if (envelopeBytes >= MAX_SAVE_BYTES)
      throw new Error(`${positionId}: envelope exceeded ${MAX_SAVE_BYTES} bytes`);
    maxEnvelopeBytes = Math.max(maxEnvelopeBytes, envelopeBytes);
    if (wireV3)
      for (const page of [...payload.weekHistory, ...payload.postseasonHistory]) {
        const decoded = core.unpackJsonArchiveV1(page);
        if (!decoded.ok) throw new Error('Invalid persisted history page');
        maxPageBytes = Math.max(maxPageBytes, Buffer.byteLength(JSON.stringify(page), 'utf8'));
        maxPageExpandedChars = Math.max(maxPageExpandedChars, JSON.stringify(decoded.value).length);
      }
    const restored = wireV3
      ? core.parsePositionAlphaSessionWireV3Json(wire, mechanics!)
      : core.parsePositionAlphaSessionV2Json(wire, mechanics!);
    if (restored === null || !isDeepStrictEqual(restored, result.session))
      throw new Error(`${positionId}: round-trip mismatch`);
    maxPersistedBytes = Math.max(maxPersistedBytes, size);
    commandCount += 1;
    if (commandCount > 2_000) throw new Error('Unbounded current career');
    return restored;
  }

  function playSeason(source: core.PositionAlphaSessionV2): core.PositionAlphaSessionV2 {
    let session = source;
    const plan = browserLife
      ? ['action_film_study', 'action_recovery', 'action_study_hall']
      : [
          mechanics!.trainingActions.find((action) => action.positionId === positionId)!.id,
          'action_film_study',
          'action_recovery',
        ];
    while (session.phase.type !== 'POSTSEASON_REVIEW') {
      if (session.skills.offeredSkillIds !== null) {
        const skillId = session.skills.offeredSkillIds[0];
        session = run(() => core.choosePositionAlphaSkillV2(session, skillId, mechanics!));
        continue;
      }
      if (session.phase.type === 'SEASON_REVIEW') {
        session = run(() => core.beginPositionAlphaPostseasonV2(session, mechanics!));
        continue;
      }
      if (session.phase.type === 'POSTSEASON_PLANNING') {
        if (session.world.postseason.type !== 'ACTIVE') throw new Error('Missing current bracket');
        const fixture = session.world.postseason.rounds[
          session.world.postseason.currentRoundIndex
        ].fixtures.some(({ homeProgramId, awayProgramId }) =>
          [homeProgramId, awayProgramId].includes(session.lifecycle.currentProgramId),
        );
        if (!fixture) {
          session = run(() => core.advancePositionAlphaPostseasonRoundV2(session, mechanics!));
          continue;
        }
      }
      if (browserLife) {
        const action = core.projectPositionAlphaNilChoicesV2(session, mechanics!)?.choices[0]
          ?.action;
        if (action !== undefined) {
          session = run(() => core.resolvePositionAlphaNilPlanningV2(session, action, mechanics!));
          continue;
        }
      }
      while (
        !browserLife &&
        session.nil !== undefined &&
        session.nil.state.pendingOffers.length > 0
      ) {
        if (session.phase.type !== 'WEEK_PLANNING' && session.phase.type !== 'POSTSEASON_PLANNING')
          throw new Error('Invalid NIL phase');
        const offer = session.nil.state.pendingOffers[0]!;
        const week = core.positionAlphaSourceCareerWeekIndexV2(session, session.phase.weekIndex);
        if (week === null) throw new Error('Invalid current date');
        session = run(() =>
          core.resolvePositionAlphaNilPlanningV2(
            session,
            week > offer.expiresAfterWeekIndex
              ? { type: 'EXPIRE' }
              : { type: 'DECLINE', offerId: offer.offerId },
            mechanics!,
          ),
        );
      }
      session = run(() => {
        const result = core.commitPositionAlphaFocusPlanV2(session, plan, mechanics!);
        if (result.ok) return result;
        fallbackCount += 1;
        return core.commitPositionAlphaFocusPlanV2(
          session,
          ['action_recovery', 'action_recovery', 'action_recovery'],
          mechanics!,
        );
      });
      while (session.gameDay.type !== 'POST_GAME') {
        const day = session.gameDay;
        session = run(() =>
          day.type === 'EVENT_CHOICE' && day.event !== null
            ? core.resolvePositionAlphaEventV2(session, day.event.choiceIds[0], mechanics!)
            : day.type === 'INJURY_CHOICE'
              ? core.resolvePositionAlphaInjuryChoiceV2(
                  session,
                  'injury_choice_rest_rehab',
                  mechanics!,
                )
              : day.type === 'ACTIVE_SNAP' && day.game?.game.type === 'ACTIVE'
                ? core.resolvePositionAlphaGameDaySnapV2(
                    session,
                    day.game.game.pendingSnap.decisionIds[0],
                    mechanics!,
                  )
                : core.advancePositionAlphaGameDayV2(session, mechanics!),
        );
      }
      session = run(() => core.settlePositionAlphaGameDayV2(session, mechanics!));
    }
    if (session.skills.offeredSkillIds !== null) {
      const skillId = session.skills.offeredSkillIds[0];
      session = run(() => core.choosePositionAlphaSkillV2(session, skillId, mechanics!));
    }
    return run(() => core.reviewPositionAlphaSeasonV2(session, mechanics!));
  }

  const first = playSeason(initial);
  process.stdout.write(
    `${JSON.stringify({ profileId: 'm7_current_wire_v2', wireVersion: wireV3 ? 3 : 2, careerSeed, browserLife, positionId, stage: 'first-review', maxPersistedBytes, commandCount })}\n`,
  );
  for (const option of first.lifecycle.offseason!.options.slice(0, 2)) {
    const startedAt = performance.now();
    const committed = run(() =>
      core.commitPositionAlphaOffseasonV2(first, option.programId, mechanics),
    );
    const reviewed = playSeason(committed);
    const completed = run(() => core.completePositionAlphaCareerV2(reviewed, mechanics));
    if (
      completed.phase.type !== 'CAREER_COMPLETE' ||
      !isDeepStrictEqual(completed.careerRng, reviewed.careerRng) ||
      !isDeepStrictEqual(completed.world, reviewed.world) ||
      !isDeepStrictEqual(completed.player, reviewed.player) ||
      !isDeepStrictEqual(completed.lifecycle.programHistory, reviewed.lifecycle.programHistory) ||
      !isDeepStrictEqual(
        completed.meta?.alumni[0]?.seasonSummaries,
        reviewed.lifecycle.completedSeasons,
      )
    )
      throw new Error('Invalid current retirement');
    if (core.completePositionAlphaCareerV2(completed, mechanics).ok)
      throw new Error('Repeated completion');
    process.stdout.write(
      `${JSON.stringify({
        profileId: 'm7_current_wire_v2',
        wireVersion: wireV3 ? 3 : 2,
        careerSeed,
        browserLife,
        positionId,
        kind: option.kind,
        programId: option.programId,
        stage: 'completed',
        maxPersistedBytes,
        maxEnvelopeBytes,
        ...(wireV3 ? { maxPageBytes, maxPageExpandedChars } : {}),
        maxCommandMs: Math.round(maxCommandMs * 1_000) / 1_000,
        commandCount,
        fallbackCount,
        elapsedMs: Math.round(performance.now() - startedAt),
        postseasonGames: completed.postseasonHistory.length,
        careerRng: completed.careerRng,
        worldRng: completed.world.rng,
      })}\n`,
    );
  }
}
