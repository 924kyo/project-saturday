import * as core from '@project-saturday/game-core';
import * as content from '@project-saturday/game-content';
import { createWrCareerFixture } from './builders/wr-career.js';
import { matchesJsonEvidence } from './json-evidence.js';
import { verifyWrReviewEvidence } from './verify-wr-review.js';

const mechanics: core.WrTacticalMechanicsV1 = {
  tuning: content.gameTuning,
  families: content.keySnapFamilyMechanicsDefinitions,
  patterns: content.keySnapPatternMechanicsDefinitions,
  skills: content.skillMechanicsDefinitions,
};
type CareerResult =
  | { readonly ok: true; readonly career: core.CareerRunV7 }
  | { readonly ok: false; readonly reason: string };
type SessionResult =
  | { readonly ok: true; readonly session: core.CareerSessionV7 }
  | { readonly ok: false; readonly reason: string };
const MAX_BYTES = 1_000_000;
const MAX_OPERATION_MS = 1_000;
let sharedMeta = core.migrateMetaProfileV1ToWrV2(core.createEmptyMetaProfile());
const initialRegistry = core.createWrMetaRegistryV1(sharedMeta);
if (initialRegistry === null) throw new Error('Missing initial registry');
let sharedRegistry = initialRegistry.registry;
let legacyMetaForMixedCheck: core.MetaProfileV1 | undefined;

for (const locale of ['ko-KR', 'en-US'] as const)
  for (const policy of ['stay', 'transfer'] as const) {
    const scenario = `m7-5-wr-v8:${locale}:${policy}`;
    let maxCommandMs = 0;
    let maxParseMs = 0;
    let maxDomainBytes = 0;
    let maxEnvelopeBytes = 0;
    let reloads = 0;
    let snapChoices = 0;
    let eventChoices = 0;
    let injuryChoices = 0;
    let terminalReviewBytes = 0;
    let metaBytes = 0;
    let registryBytes = 0;
    let capacityRegistryBytes = 0;
    let capacityOperationMs = 0;
    const phases = new Set<string>();
    function timed<T>(operation: () => T): T {
      const start = performance.now();
      const result = operation();
      const elapsed = performance.now() - start;
      maxCommandMs = Math.max(maxCommandMs, elapsed);
      if (elapsed >= MAX_OPERATION_MS) throw new Error(`${scenario}: command ${elapsed} ms`);
      return result;
    }
    function reload(candidate: core.CareerSessionV8): core.CareerSessionV8 {
      const json = JSON.stringify(candidate);
      const bytes = Buffer.byteLength(json, 'utf8');
      const envelopeBytes = Buffer.byteLength(
        JSON.stringify({
          saveVersion: 8,
          contentVersion: String(content.CONTENT_COMPATIBILITY_VERSION),
          createdAt: '2026-09-14T00:00:00.000Z',
          updatedAt: '2026-09-14T00:00:00.000Z',
          payload: candidate,
          checksum: 'fnv1a32:00000000',
        }),
        'utf8',
      );
      if (bytes >= MAX_BYTES || envelopeBytes >= MAX_BYTES)
        throw new Error(
          `${scenario}: ${candidate.career.phase.type} envelope ${envelopeBytes} bytes`,
        );
      maxDomainBytes = Math.max(maxDomainBytes, bytes);
      maxEnvelopeBytes = Math.max(maxEnvelopeBytes, envelopeBytes);
      const start = performance.now();
      const parsed = core.parseCareerSessionV8(json, mechanics);
      const elapsed = performance.now() - start;
      maxParseMs = Math.max(maxParseMs, elapsed);
      if (elapsed >= MAX_OPERATION_MS) throw new Error(`${scenario}: parse ${elapsed} ms`);
      if (!parsed.ok || !matchesJsonEvidence(parsed.session, candidate))
        throw new Error(
          `${scenario}: week ${candidate.career.weekIndex} ${candidate.career.phase.type} reload mismatch: ${JSON.stringify(parsed.ok ? 'equality' : parsed)}`,
        );
      reloads += 1;
      if (reloads > 2_000) throw new Error(`${scenario}: unbounded career`);
      phases.add(candidate.career.phase.type);
      return parsed.session;
    }
    let session = reload(
      core.migrateCareerSessionV7ToV8(
        core.createCareerSession(
          createWrCareerFixture({
            careerSeed: scenario,
            displayName: locale === 'ko-KR' ? '토요일 검증 선수' : 'Saturday Profile Athlete',
          }),
        ),
      ),
    );
    function careerStep<T extends CareerResult>(command: (source: core.CareerRunV7) => T): void {
      const result = timed(() => core.runCareerCommandV8(session.career, mechanics, command));
      if ('reason' in result)
        throw new Error(`${scenario}: ${session.career.phase.type} career ${result.reason}`);
      session = reload({ ...session, career: result.career });
    }
    function sessionStep<T extends SessionResult>(
      command: (source: core.CareerSessionV7) => T,
      acknowledge = false,
    ) {
      const result = timed(() =>
        acknowledge
          ? core.acknowledgePostGameSessionV8(session, mechanics, command)
          : core.runSessionCommandV8(session, mechanics, command),
      );
      if ('reason' in result)
        throw new Error(`${scenario}: ${session.career.phase.type} session ${result.reason}`);
      session = reload(result.session);
      return result;
    }
    function gameStep(command: (source: core.CareerRunV8) => core.GameCommandResultV8): void {
      const result = timed(() => command(session.career));
      if (!result.ok)
        throw new Error(`${scenario}: ${session.career.phase.type} game ${result.reason}`);
      session = reload({ ...session, career: result.career });
    }
    careerStep((career) =>
      core.beginRecruiting(
        career,
        content.recruitingMechanicsConfig,
        content.programMechanicsDefinitions,
        content.offenseStyleMechanicsDefinitions,
      ),
    );
    if (session.career.recruitingState.type !== 'CHOOSING')
      throw new Error('Missing recruiting offers');
    const initialProgram = session.career.recruitingState.offers[0]!.programId;
    careerStep((career) =>
      core.commitProgramChoice(
        career,
        initialProgram,
        content.programMechanicsDefinitions,
        content.offenseStyleMechanicsDefinitions,
        content.rotationPolicyMechanicsDefinitions,
        content.rosterNameMechanicsPool,
      ),
    );
    sessionStep(content.bootstrapShippedSeason);
    sessionStep(content.bootstrapShippedOffFieldSystems);

    function acceptSkill(): void {
      if (session.career.phase.type !== 'SKILL_BREAKTHROUGH') return;
      const chosen = session.career.phase.offer.offeredSkillIds[0];
      careerStep((career) => core.chooseSkillBreakthrough(career, chosen));
    }
    function planning(): void {
      sessionStep(content.prepareShippedOffFieldPlanningBoundary);
      const nil = session.career.offFieldCareerState.nil;
      if ('bootstrapStatus' in nil && nil.bootstrapStatus === 'ACTIVE') {
        if (
          nil.activeObligation !== null &&
          nil.activeObligation.lastResolvedWeekIndex !== session.career.weekIndex
        )
          sessionStep((current) => content.resolveShippedNilObligation(current, 'FULFILL'));
        const offer = nil.pendingOffers[0];
        if (offer !== undefined) {
          sessionStep((current) => content.decideShippedNilOffer(current, offer.offerId, 'ACCEPT'));
          const accepted = session.career.offFieldCareerState.nil;
          if (
            'bootstrapStatus' in accepted &&
            accepted.bootstrapStatus === 'ACTIVE' &&
            accepted.activeObligation !== null &&
            accepted.activeObligation.lastResolvedWeekIndex !== session.career.weekIndex
          )
            sessionStep((current) => content.resolveShippedNilObligation(current, 'FULFILL'));
        }
      }
      const owned = session.career.player.skillState.acquisitions
        .map(({ selectedSkillId }) => selectedSkillId)
        .slice(0, 4);
      for (const [slotIndex, skillId] of owned.entries()) {
        if (session.career.player.skillState.equippedSkillIds[slotIndex] !== skillId)
          careerStep((career) => core.setEquippedSkillSlot(career, slotIndex, skillId));
      }
    }
    function week(attemptNil: boolean): void {
      planning();
      let actions: readonly core.WeeklyActionId[] = [];
      careerStep((career) => {
        const preferred: readonly core.WeeklyActionId[] = [
          'action_route_drills',
          career.weekIndex % 2 === 0 ? 'action_film_study' : 'action_study_hall',
          'action_recovery',
        ];
        actions = preferred.map((id) =>
          core.isWeeklyActionAvailableForCurrentInjury(career, id) ? id : 'action_recovery',
        );
        return core.commitWeeklyActionPlan(
          career,
          actions,
          content.weeklyActionDefinitions.map(({ id }) => id),
        );
      });
      for (const id of actions)
        careerStep((career) =>
          core.resolveNextWeeklyAction(
            career,
            content.weeklyActionDefinitions.find((definition) => definition.id === id)!,
            content.developmentWeekConfig,
            content.skillMechanicsDefinitions,
            content.offenseStyleMechanicsDefinitions,
            content.rotationPolicyMechanicsDefinitions,
          ),
        );
      sessionStep(content.settleShippedCompletedWeekOffField);
      sessionStep(content.selectShippedWeeklyEvent);
      if (session.career.phase.type === 'EVENT_CHOICE') {
        const choice = session.career.phase.pendingEvent.choiceIds[0]!;
        sessionStep((current) => content.resolveShippedEventChoice(current, choice));
        eventChoices += 1;
      }
      sessionStep(content.assessShippedWeeklyInjury);
      if (session.career.phase.type === 'INJURY_CHOICE') {
        sessionStep((current) =>
          content.resolveShippedInjuryChoice(current, 'injury_choice_play_limited'),
        );
        injuryChoices += 1;
      }
      if (attemptNil) sessionStep(content.attemptShippedWeeklyNilOffer);
    }
    function currentPhase(): core.CareerRunV8['phase']['type'] {
      return session.career.phase.type;
    }
    function game(postseason: boolean): void {
      sessionStep(
        postseason
          ? content.prepareNextShippedPostseasonGame
          : content.prepareNextShippedSeasonGame,
      );
      gameStep((career) => core.startGameV8(career, mechanics));
      while (session.career.phase.type === 'KEY_SNAP') {
        const choice = session.career.phase.pendingSnap.decisionIds[0];
        gameStep((career) => core.resolveKeySnapV8(career, choice, mechanics));
        if (currentPhase() !== 'SNAP_RESOLVED') throw new Error('Missing saved resolved phase');
        gameStep((career) => core.continueResolvedSnapV8(career, mechanics));
        snapChoices += 1;
      }
      if (session.career.phase.type !== 'POST_GAME') throw new Error('Missing post-game');
      sessionStep(
        postseason
          ? content.completeShippedPostseasonRound
          : content.completeShippedRegularSeasonRound,
        true,
      );
      acceptSkill();
    }
    for (let season = 0; season < 2; season += 1) {
      for (let camp = 0; camp < 3; camp += 1) {
        week(season === 0);
        sessionStep(content.advanceShippedCampRound);
        acceptSkill();
      }
      for (let round = 0; round < 12; round += 1) {
        week(round < 9);
        game(false);
      }
      planning();
      sessionStep(content.initializeShippedPostseason);
      let postseasonRounds = 0;
      while (
        session.world.calendar.type === 'ACTIVE' &&
        session.world.calendar.postseason.type === 'ACTIVE'
      ) {
        if (postseasonRounds++ >= 2) throw new Error('Unbounded postseason');
        week(false);
        game(true);
      }
      planning();
      if (season === 1) {
        const evidence = timed(() => verifyWrReviewEvidence(session));
        terminalReviewBytes = Buffer.byteLength(JSON.stringify(evidence), 'utf8');
      }
      const review = timed(() =>
        season === 1
          ? core.enterWrTwoSeasonReviewV8(session)
          : core.runSessionCommandV8(session, mechanics, content.enterShippedSeasonReview),
      );
      if (!review.ok) {
        throw new Error(`${scenario}: season ${season} review ${review.reason}`);
      }
      session = reload(review.session);
      if (season === 1) {
        const invalidLegacyCompletion = core.runSessionCommandV8(session, mechanics, (current) =>
          content.completeShippedCareer(current, core.createEmptyMetaProfile()),
        );
        if (invalidLegacyCompletion.ok || invalidLegacyCompletion.session !== session)
          throw new Error('Current two-season review entered a single-season completion');
        const indexed = timed(() =>
          core.completeWrTwoSeasonSessionAndRegistryV8(
            session,
            sharedRegistry,
            content.CONTENT_COMPATIBILITY_VERSION,
          ),
        );
        if (!indexed.ok) throw new Error(`${scenario}: registry completion ${indexed.reason}`);
        const exhaustedRegistry = { ...sharedRegistry, revision: Number.MAX_SAFE_INTEGER };
        const rejectedIndex = core.completeWrTwoSeasonSessionAndRegistryV8(
          session,
          exhaustedRegistry,
          content.CONTENT_COMPATIBILITY_VERSION,
        );
        if (
          rejectedIndex.ok ||
          rejectedIndex.session !== session ||
          rejectedIndex.registry !== exhaustedRegistry
        )
          throw new Error('Failed registry completion changed either input');
        const capacityIds = Array.from({ length: 1000 }, (_, index) => ({
          careerId: `career_capacity_${String(index).padStart(4, '0')}`,
          alumniId: `alumni_career_capacity_${String(index).padStart(4, '0')}`,
          recordSchemaVersion: 1,
          programIds: ['program_gulf_meridian'],
        }));
        const capacityFamiliarity = new Map(
          sharedRegistry.programFamiliarity.map(({ programId, completedCareers }) => [
            programId,
            completedCareers,
          ]),
        );
        capacityFamiliarity.set(
          'program_gulf_meridian',
          (capacityFamiliarity.get('program_gulf_meridian') ?? 0) + 1000,
        );
        const capacity = core.parseWrMetaRegistryV1({
          ...sharedRegistry,
          revision: sharedRegistry.revision + 1000,
          alumni: [...sharedRegistry.alumni, ...capacityIds].sort((a, b) =>
            a.alumniId < b.alumniId ? -1 : a.alumniId > b.alumniId ? 1 : 0,
          ),
          programFamiliarity: [...capacityFamiliarity.entries()]
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([programId, completedCareers]) => ({ programId, completedCareers })),
        });
        if (capacity === null) throw new Error('Invalid capacity index fixture');
        const capacityStart = performance.now();
        const capacityCompleted = core.completeWrTwoSeasonSessionAndRegistryV8(
          session,
          capacity,
          content.CONTENT_COMPATIBILITY_VERSION,
        );
        capacityOperationMs = performance.now() - capacityStart;
        capacityRegistryBytes = Buffer.byteLength(
          JSON.stringify(capacityCompleted.ok ? capacityCompleted.registry : null),
          'utf8',
        );
        if (
          !capacityCompleted.ok ||
          capacityOperationMs >= MAX_OPERATION_MS ||
          capacityRegistryBytes >= MAX_BYTES ||
          capacityCompleted.registry.alumni.length !== capacity.alumni.length + 1
        )
          throw new Error('Lightweight 1,000-entry capacity registration failed');
        const exhaustedMeta = { ...sharedMeta, revision: Number.MAX_SAFE_INTEGER };
        const rejectedPublication = core.completeWrTwoSeasonSessionAndMetaV8(
          session,
          exhaustedMeta,
          content.CONTENT_COMPATIBILITY_VERSION,
        );
        if (
          rejectedPublication.ok ||
          rejectedPublication.session !== session ||
          rejectedPublication.meta !== exhaustedMeta
        )
          throw new Error('Failed meta publication changed the review or input profile');
        const retired = timed(() =>
          core.completeWrTwoSeasonSessionAndMetaV8(
            session,
            sharedMeta,
            content.CONTENT_COMPATIBILITY_VERSION,
          ),
        );
        if (!retired.ok) throw new Error(`${scenario}: retirement ${retired.reason}`);
        const indexedReload = core.parseWrMetaRegistryV1(JSON.stringify(indexed.registry));
        const equivalentIndex = core.createWrMetaRegistryV1(retired.meta);
        if (
          indexedReload === null ||
          equivalentIndex === null ||
          !matchesJsonEvidence(indexedReload, equivalentIndex.registry) ||
          !matchesJsonEvidence(indexed.session, retired.session) ||
          !matchesJsonEvidence(indexed.alumni, retired.alumni)
        )
          throw new Error('Indexed and full-profile completion diverged');
        sharedRegistry = indexedReload;
        registryBytes = Buffer.byteLength(JSON.stringify(sharedRegistry), 'utf8');
        for (const programId of retired.alumni.programIds) {
          const previous =
            sharedMeta.programFamiliarity.find((entry) => entry.programId === programId)
              ?.completedCareers ?? 0;
          const next = retired.meta.programFamiliarity.find(
            (entry) => entry.programId === programId,
          )?.completedCareers;
          if (next !== previous + 1)
            throw new Error('Familiarity did not credit each distinct experienced program once');
        }
        if (legacyMetaForMixedCheck !== undefined) {
          const migratedLegacy = core.migrateMetaProfileV1ToWrV2(legacyMetaForMixedCheck);
          const mixed = core.registerWrTwoSeasonAlumniV2(migratedLegacy, retired.alumni);
          const duplicateLegacy = migratedLegacy.alumni.some(
            ({ careerId }) => careerId === retired.alumni.careerId,
          );
          if (
            duplicateLegacy
              ? mixed !== null
              : mixed === null ||
                !matchesJsonEvidence(
                  mixed.alumni.find(({ schemaVersion }) => schemaVersion === 1),
                  migratedLegacy.alumni[0],
                )
          )
            throw new Error('Mixed meta lost legacy history or accepted a duplicate career');
        }
        session = reload(retired.session);
        const metaJson = JSON.stringify(retired.meta);
        const restoredMeta = timed(() => core.parseWrMetaProfileV2(metaJson));
        metaBytes = Buffer.byteLength(metaJson, 'utf8');
        if (
          metaBytes >= MAX_BYTES ||
          restoredMeta === null ||
          !matchesJsonEvidence(restoredMeta, retired.meta) ||
          restoredMeta.alumni.length !== sharedMeta.alumni.length + 1 ||
          sharedMeta.alumni.some(
            (previous) =>
              !matchesJsonEvidence(
                previous,
                restoredMeta.alumni.find(({ careerId }) => careerId === previous.careerId),
              ),
          )
        )
          throw new Error('Meta reload lost a current or previous alumnus');
        sharedMeta = restoredMeta;
        break;
      }
      if (season === 0) {
        if (legacyMetaForMixedCheck === undefined) {
          // A read-only alternate one-season ending supplies a genuine legacy fixture.
          const branch = core.runSessionCommandV8(session, mechanics, (current) =>
            content.completeShippedCareer(current, core.createEmptyMetaProfile()),
          );
          if (!branch.ok) throw new Error('Missing historical one-season fixture');
          legacyMetaForMixedCheck = branch.meta;
        }
        sessionStep(content.projectShippedOffseason);
        const offseason = session.career.offFieldCareerState.offseason;
        if (offseason.status !== 'PROJECTED') throw new Error('Missing offseason projection');
        const selected =
          policy === 'stay'
            ? initialProgram
            : offseason.transferProjection.transferOptions[0].programId;
        sessionStep((current) => content.decideShippedOffseason(current, selected));
        sessionStep(content.bootstrapShippedNextSeason);
        if (session.career.programId !== selected) throw new Error('Incorrect current membership');
      }
    }
    const beforeNewCareer = JSON.stringify(sharedMeta);
    if (
      session.career.phase.type !== 'CAREER_COMPLETE' ||
      !sharedMeta.alumni.some(({ careerId }) => careerId === session.career.id) ||
      core.parseWrMetaProfileV2(sharedMeta) === null
    )
      throw new Error('Missing valid final alumni');
    const repeated = core.completeWrTwoSeasonSessionAndMetaV8(
      session,
      sharedMeta,
      content.CONTENT_COMPATIBILITY_VERSION,
    );
    if (repeated.ok || repeated.session !== session || repeated.meta !== sharedMeta)
      throw new Error('Repeated completion changed prior state');
    const fresh = core.migrateCareerSessionV7ToV8(
      core.createCareerSession(createWrCareerFixture({ careerSeed: `${scenario}:new` })),
    );
    if (fresh.career.id === session.career.id || JSON.stringify(sharedMeta) !== beforeNewCareer)
      throw new Error('Invalid fresh career identity');
    reload(fresh);
    process.stdout.write(
      `${JSON.stringify({
        profileId: 'm7_5_wr_v8_current_life_v1',
        status: 'DOMAIN_VERIFIED',
        scenario,
        locale,
        policy,
        exactReloads: reloads,
        snapChoices,
        eventChoices,
        injuryChoices,
        phases: [...phases].sort(),
        gamesPlayed: session.career.gameCareerState.gamesPlayed,
        finalProgramId: session.career.programId,
        alumniCount: sharedMeta.alumni.length,
        metaBytes,
        registryBytes,
        capacityRegistryBytes,
        capacityOperationMs: Math.round(capacityOperationMs * 1000) / 1000,
        terminalReviewBytes,
        maxDomainBytes,
        maxEnvelopeBytes,
        maxCommandMs: Math.round(maxCommandMs * 1000) / 1000,
        maxParseMs: Math.round(maxParseMs * 1000) / 1000,
        checksumScope:
          'fixed-length size estimate only; browser codec/atomic storage and B6 UI verification remain required',
      })}\n`,
    );
  }
