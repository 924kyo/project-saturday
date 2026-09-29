import 'fake-indexeddb/auto';

import { deleteDB } from 'idb';
import {
  advanceDevelopmentWeek,
  advanceHistoricalDevelopmentWeek,
  chooseSkillBreakthrough,
  commitHistoricalPreProgramWeeklyActionPlan,
  commitWeeklyActionPlan,
  createEmptyGameCareerState,
  createCareerSession,
  createEmptyMetaProfile,
  createWrCareer,
  migrateCareerRunV2ToV3,
  migrateCareerRunV3ToV4,
  migrateCareerRunV4ToV5,
  migrateCareerRunV5ToV6,
  migrateCareerRunV6ToV7,
  migrateCareerSessionV5ToV6,
  parseCareerRunV1,
  parseCareerRunV2,
  parseCareerRunV3,
  parseCareerRunV4,
  parseCareerRunV5,
  resolveNextWeeklyAction,
  setEquippedSkillSlot,
  type CareerRun,
  type CareerRunV1,
  type CareerRunV2,
  type CareerRunV3,
  type CareerRunV4,
  type CareerRunV5,
  type CareerSession,
  type CareerSessionV5,
  type CareerSessionV6,
  type MetaProfileV1,
  type WeeklyActionId,
  type WeeklyCommandResult,
  prepareWrTacticalGameV1,
  startWrTacticalGameV1,
  chooseWrTacticalSnapV1,
  advanceWrTacticalGameV1,
  projectWrTacticalCareerV8,
  migrateCareerSessionV7ToV8,
} from '@project-saturday/game-core';
import {
  developmentWeekConfig,
  buildWrCreationMechanics,
  defaultWrCreationIdentity,
  offenseStyleMechanicsDefinitions,
  rotationPolicyMechanicsDefinitions,
  skillMechanicsDefinitions,
  weeklyActionDefinitions,
  bootstrapShippedSeason,
  gameTuning,
  keySnapFamilyMechanicsDefinitions,
  keySnapPatternMechanicsDefinitions,
} from '@project-saturday/game-content/content';
import { describe, expect, it } from 'vitest';
import { createWrCareerEnvelopeV8, decodeWrCareerEnvelopeV8 } from './career-envelope-v8';
import { WrCareerPersistenceV8 } from './career-persistence-v8';

import { createTestCareer } from '../test/career-fixture';
import { completeShippedGame } from '../test/game-fixture';
import {
  createCompletedSeasonFixture,
  createSeasonDecisionFixtures,
  createSecondSeasonFixture,
} from '../test/season-fixture';
import {
  beginCareerRecruiting,
  commitCareerProgramChoice,
  prepareCareerGame,
  resolveCareerKeySnap,
  startCareerGame,
} from '../career/career-ui';
import {
  CAREER_SNAPSHOT_RETENTION,
  CURRENT_CAREER_SAVE_VERSION,
  CURRENT_CAREER_STORAGE_ID,
  CareerPersistence,
  CareerCompletionPersistence,
  META_PROFILE_SAVE_VERSION,
  META_PROFILE_STORAGE_ID,
  MetaProfilePersistence,
  SHIPPED_CAREER_CONTENT_VERSION,
  canonicalStringify,
  computeSaveChecksum,
  validateCareerSaveEnvelope,
  validateMetaSaveEnvelope,
  type SaveChecksumFields,
} from './career-persistence';
import {
  MemoryStorageAdapter,
  IndexedDbStorageAdapter,
  type SaveEnvelope,
  type StorageAdapter,
  type StorageEntry,
  type StorageStoreName,
} from './storage';

const CONTENT_VERSION = SHIPPED_CAREER_CONTENT_VERSION;
const PLAN = [
  'action_route_drills',
  'action_recovery',
  'action_study_hall',
] as const satisfies readonly [WeeklyActionId, WeeklyActionId, WeeklyActionId];
const GAME_MIGRATION_PLAN = [
  'action_extra_practice',
  'action_route_drills',
  'action_recovery',
] as const satisfies readonly [WeeklyActionId, WeeklyActionId, WeeklyActionId];
const AVAILABLE_ACTIONS = weeklyActionDefinitions.map(({ id }) => id);

function expectTransition(result: WeeklyCommandResult): CareerRun {
  if (!result.ok) {
    throw new Error(`Weekly fixture transition failed: ${result.reason}`);
  }
  return result.career;
}

function nextTransition(career: CareerRun): CareerRun {
  if (career.phase.type === 'PLAN_ACTIONS') {
    return expectTransition(
      career.recruitingState.type === 'NOT_STARTED'
        ? commitHistoricalPreProgramWeeklyActionPlan(career, PLAN, AVAILABLE_ACTIONS)
        : commitWeeklyActionPlan(career, PLAN, AVAILABLE_ACTIONS),
    );
  }
  if (career.phase.type === 'WEEK_END') {
    return expectTransition(advanceDevelopmentWeek(career, developmentWeekConfig));
  }
  if (career.phase.type !== 'RESOLVE_ACTIONS') {
    throw new Error(`Weekly fixture cannot advance phase ${career.phase.type}.`);
  }
  const actionId = career.phase.actionIds[career.phase.nextActionIndex];
  const definition = weeklyActionDefinitions.find(({ id }) => id === actionId);
  if (definition === undefined) {
    throw new Error(`Missing weekly fixture definition: ${actionId}`);
  }
  return expectTransition(resolveNextWeeklyAction(career, definition, developmentWeekConfig));
}

function advanceTransitions(career: CareerRun, count: number): CareerRun {
  let current = career;
  for (let index = 0; index < count; index += 1) {
    current = nextTransition(current);
  }
  return current;
}

function advanceUntilBreakthrough(career: CareerRun): CareerRun {
  let current = career;
  if (current.recruitingState.type === 'NOT_STARTED') {
    const recruiting = beginCareerRecruiting(current);
    if (!recruiting.ok) {
      throw new Error(`Recruiting fixture failed: ${recruiting.reason}`);
    }
    current = recruiting.career;
  }
  if (current.recruitingState.type === 'CHOOSING') {
    const committed = commitCareerProgramChoice(
      current,
      current.recruitingState.offers[0].programId,
    );
    if (!committed.ok) {
      throw new Error(`Program fixture failed: ${committed.reason}`);
    }
    current = committed.career;
  }
  for (let week = 0; week < 13; week += 1) {
    if (current.phase.type === 'PLAN_ACTIONS') {
      current = expectTransition(commitWeeklyActionPlan(current, PLAN, AVAILABLE_ACTIONS));
      for (let actionIndex = 0; actionIndex < 3; actionIndex += 1) {
        if (current.phase.type !== 'RESOLVE_ACTIONS') {
          throw new Error(`Expected action resolution, received ${current.phase.type}.`);
        }
        const actionId = current.phase.actionIds[current.phase.nextActionIndex];
        const definition = weeklyActionDefinitions.find(({ id }) => id === actionId);
        if (definition === undefined) {
          throw new Error(`Missing weekly fixture definition: ${actionId}`);
        }
        current = expectTransition(
          resolveNextWeeklyAction(
            current,
            definition,
            developmentWeekConfig,
            skillMechanicsDefinitions,
            offenseStyleMechanicsDefinitions,
            rotationPolicyMechanicsDefinitions,
          ),
        );
      }
    }
    if (current.phase.type !== 'WEEK_END') {
      throw new Error(`Expected week end before gauge advance, received ${current.phase.type}.`);
    }
    current = completeShippedGame(current);
    current = expectTransition(
      advanceDevelopmentWeek(
        current,
        developmentWeekConfig,
        skillMechanicsDefinitions,
        weeklyActionDefinitions,
      ),
    );
    if (current.phase.type === 'SKILL_BREAKTHROUGH') {
      return current;
    }
  }
  throw new Error('Expected a gauge-triggered breakthrough within thirteen weeks.');
}

function committedWeekEnd(seed: string): CareerRun {
  const identity = {
    ...defaultWrCreationIdentity,
    displayName: 'Migration Player',
    archetypeId: 'archetype_wr_route_technician',
    recruitingBackgroundId: 'background_legacy_recruit',
    personalityTraitIds: ['personality_competitive', 'personality_leader'],
  } as const;
  const mechanics = buildWrCreationMechanics(identity);
  if (!mechanics.ok) throw new Error('Game migration fixture mechanics failed.');
  const created = createWrCareer({ careerSeed: seed, identity, mechanics: mechanics.mechanics });
  if (!created.ok) {
    throw new Error(`Game migration fixture creation failed: ${JSON.stringify(created.issues)}`);
  }
  const recruiting = beginCareerRecruiting(created.career);
  if (!recruiting.ok || recruiting.career.recruitingState.type !== 'CHOOSING') {
    throw new Error('Game migration fixture could not begin recruiting.');
  }
  const committed = commitCareerProgramChoice(
    recruiting.career,
    recruiting.career.recruitingState.offers.find(
      ({ programId }) => programId === 'program_northstar_college',
    )?.programId ?? recruiting.career.recruitingState.offers.at(-1)!.programId,
  );
  if (!committed.ok) throw new Error(`Game migration fixture failed: ${committed.reason}`);
  let weekEnd = expectTransition(
    commitWeeklyActionPlan(committed.career, GAME_MIGRATION_PLAN, AVAILABLE_ACTIONS),
  );
  for (let actionIndex = 0; actionIndex < 3; actionIndex += 1) {
    if (weekEnd.phase.type !== 'RESOLVE_ACTIONS') {
      throw new Error(`Game migration fixture reached ${weekEnd.phase.type}.`);
    }
    const actionId = weekEnd.phase.actionIds[weekEnd.phase.nextActionIndex];
    const definition = weeklyActionDefinitions.find(({ id }) => id === actionId);
    if (definition === undefined) throw new Error(`Missing weekly fixture definition: ${actionId}`);
    weekEnd = expectTransition(
      resolveNextWeeklyAction(
        weekEnd,
        definition,
        developmentWeekConfig,
        skillMechanicsDefinitions,
        offenseStyleMechanicsDefinitions,
        rotationPolicyMechanicsDefinitions,
      ),
    );
  }
  if (weekEnd.phase.type !== 'WEEK_END') {
    throw new Error(`Game migration fixture reached ${weekEnd.phase.type}.`);
  }
  return weekEnd;
}

function committedPlanningCareer(seed: string): CareerRun {
  const created = createTestCareer(seed);
  const recruiting = beginCareerRecruiting(created);
  if (!recruiting.ok || recruiting.career.recruitingState.type !== 'CHOOSING') {
    throw new Error('Aggregate persistence fixture could not begin recruiting.');
  }
  const committed = commitCareerProgramChoice(
    recruiting.career,
    recruiting.career.recruitingState.offers[0].programId,
  );
  if (!committed.ok) throw new Error(`Aggregate persistence fixture failed: ${committed.reason}`);
  return committed.career;
}

function advancingClock(start = Date.parse('2026-08-31T00:00:00.000Z')): () => Date {
  let tick = 0;
  return () => {
    const value = new Date(start + tick * 1000);
    tick += 1;
    return value;
  };
}

function mutableEnvelope<T>(envelope: SaveEnvelope<T>): SaveEnvelope<T> {
  return structuredClone(envelope);
}

function resign<T>(envelope: SaveEnvelope<T>): SaveEnvelope<T> {
  const fields: SaveChecksumFields<T> = {
    saveVersion: envelope.saveVersion,
    contentVersion: envelope.contentVersion,
    createdAt: envelope.createdAt,
    updatedAt: envelope.updatedAt,
    payload: envelope.payload,
  };
  return { ...envelope, checksum: computeSaveChecksum(fields) };
}

function createLegacyCareerV2(current: CareerRun): CareerRunV2 {
  const legacy = structuredClone(current) as unknown as {
    gameCareerState?: unknown;
    weeklyExperienceVersion?: unknown;
    seasonCareerState?: unknown;
    offFieldCareerState?: unknown;
    programContext?: unknown;
    recruitingState?: unknown;
    schemaVersion: number;
    phase: {
      depthUpdate?: unknown;
      offer?: Record<string, unknown>;
      results?: Array<Record<string, unknown>>;
    };
    player: {
      skillState: {
        acquisitions: Array<Record<string, unknown>>;
        breakthroughGauge?: unknown;
      };
      state: { preparation?: unknown };
    };
  };
  legacy.schemaVersion = 2;
  delete legacy.gameCareerState;
  delete legacy.weeklyExperienceVersion;
  delete legacy.seasonCareerState;
  delete legacy.offFieldCareerState;
  delete legacy.player.state.preparation;
  delete legacy.player.skillState.breakthroughGauge;
  for (const acquisition of legacy.player.skillState.acquisitions) {
    delete acquisition['trigger'];
  }
  if (legacy.phase.offer !== undefined) {
    delete legacy.phase.offer['trigger'];
  }
  delete legacy.recruitingState;
  delete legacy.programContext;
  delete legacy.phase.depthUpdate;
  for (const result of legacy.phase.results ?? []) {
    delete result['practiceImpact'];
    const aggregates = result['skillEffectAggregates'] as Record<string, unknown> | undefined;
    if (aggregates !== undefined) {
      delete aggregates['preparationDeltaFlat'];
      delete aggregates['confidenceDeltaFlat'];
      delete aggregates['practiceImpactFlat'];
    }
    for (const field of [
      'preparationBefore',
      'basePreparationDelta',
      'requestedPreparationDelta',
      'actualPreparationDelta',
      'preparationAfter',
      'confidenceBefore',
      'baseConfidenceDelta',
      'requestedConfidenceDelta',
      'actualConfidenceDelta',
      'confidenceAfter',
    ]) {
      delete result[field];
    }
  }

  const parsed = parseCareerRunV2(legacy);
  if (!parsed.ok) {
    throw new Error(`Schema-v2 career fixture failed: ${parsed.reason}`);
  }
  return parsed.career;
}

function createLegacyCareerV3(current: CareerRun): CareerRunV3 {
  const legacy = structuredClone(current) as unknown as {
    gameCareerState?: unknown;
    weeklyExperienceVersion?: unknown;
    seasonCareerState?: unknown;
    offFieldCareerState?: unknown;
    schemaVersion: number;
    phase: { offer?: Record<string, unknown>; results?: Array<Record<string, unknown>> };
    player: {
      skillState: {
        acquisitions: Array<Record<string, unknown>>;
        breakthroughGauge?: unknown;
      };
      state: { preparation?: unknown };
    };
  };
  legacy.schemaVersion = 3;
  delete legacy.gameCareerState;
  delete legacy.weeklyExperienceVersion;
  delete legacy.seasonCareerState;
  delete legacy.offFieldCareerState;
  delete legacy.player.state.preparation;
  delete legacy.player.skillState.breakthroughGauge;
  for (const acquisition of legacy.player.skillState.acquisitions) {
    delete acquisition['trigger'];
  }
  if (legacy.phase.offer !== undefined) {
    delete legacy.phase.offer['trigger'];
  }
  for (const result of legacy.phase.results ?? []) {
    const aggregates = result['skillEffectAggregates'] as Record<string, unknown> | undefined;
    if (aggregates !== undefined) {
      delete aggregates['preparationDeltaFlat'];
      delete aggregates['confidenceDeltaFlat'];
      delete aggregates['practiceImpactFlat'];
    }
    for (const field of [
      'preparationBefore',
      'basePreparationDelta',
      'requestedPreparationDelta',
      'actualPreparationDelta',
      'preparationAfter',
      'confidenceBefore',
      'baseConfidenceDelta',
      'requestedConfidenceDelta',
      'actualConfidenceDelta',
      'confidenceAfter',
    ]) {
      delete result[field];
    }
  }
  const parsed = parseCareerRunV3(legacy);
  if (!parsed.ok) {
    throw new Error(`Schema-v3 career fixture failed: ${parsed.reason}`);
  }
  return parsed.career;
}

function createLegacyCareerV4(current: CareerRun): CareerRunV4 {
  const legacy = structuredClone(current) as unknown as {
    schemaVersion: number;
    seasonCareerState?: unknown;
    offFieldCareerState?: unknown;
  };
  legacy.schemaVersion = 4;
  delete legacy.seasonCareerState;
  delete legacy.offFieldCareerState;
  const parsed = parseCareerRunV4(legacy);
  if (!parsed.ok) {
    throw new Error(`Schema-v4 career fixture failed: ${parsed.reason}`);
  }
  return parsed.career;
}

function createLegacySessionV5(current: CareerSession): CareerSessionV5 {
  const legacyCareer = structuredClone(current.career) as unknown as {
    schemaVersion: number;
    offFieldCareerState?: unknown;
  };
  legacyCareer.schemaVersion = 5;
  delete legacyCareer.offFieldCareerState;
  const parsed = parseCareerRunV5(legacyCareer);
  if (!parsed.ok) {
    throw new Error(`Schema-v5 career fixture failed: ${parsed.reason}`);
  }
  return {
    schemaVersion: 5,
    career: parsed.career as CareerRunV5,
    world: structuredClone(current.world),
  };
}

function createLegacyCareer(current: CareerRun): CareerRunV1 {
  const legacy = structuredClone(createLegacyCareerV2(current)) as unknown as {
    lastPassiveBodyRecovery?: unknown;
    schemaVersion: number;
    recentWeeklyActionIds?: unknown;
    phase: {
      results?: Array<{
        appliedSkillEffects?: unknown;
        baseBodyDelta?: unknown;
        baseGpaDelta?: unknown;
        skillEffectAggregates?: unknown;
      }>;
    };
    player: { skillState?: unknown };
  };
  legacy.schemaVersion = 1;
  delete legacy.recentWeeklyActionIds;
  delete legacy.lastPassiveBodyRecovery;
  delete legacy.player.skillState;
  for (const result of legacy.phase.results ?? []) {
    delete result.baseBodyDelta;
    delete result.baseGpaDelta;
    delete result.skillEffectAggregates;
    delete result.appliedSkillEffects;
  }

  const parsed = parseCareerRunV1(legacy);
  if (!parsed.ok) {
    throw new Error(`Legacy career fixture failed: ${parsed.reason}`);
  }
  return parsed.career;
}

function withRevision(career: CareerRun, revision: number): CareerRun {
  const revised = structuredClone(career) as unknown as { revision: number };
  revised.revision = revision;
  return revised as unknown as CareerRun;
}

function createChoosingCareer(seed: string): CareerRun {
  const career = structuredClone(createTestCareer(seed)) as unknown as {
    recruitingState: unknown;
  };
  career.recruitingState = {
    type: 'CHOOSING',
    recruitAbilityScore: 60,
    backgroundModifier: 0,
    recruitScore: 60,
    recruitTierId: 'recruit_tier_priority',
    offers: [
      {
        programId: 'program_alpha',
        interest: 100,
        schemeFit: 90,
        priority: 290,
        projectedDepthBandId: 'projected_depth_band_starter_competition',
      },
      {
        programId: 'program_beta',
        interest: 90,
        schemeFit: 85,
        priority: 265,
        projectedDepthBandId: 'projected_depth_band_rotation_path',
      },
      {
        programId: 'program_gamma',
        interest: 80,
        schemeFit: 80,
        priority: 240,
        projectedDepthBandId: 'projected_depth_band_rotation_path',
      },
      {
        programId: 'program_delta',
        interest: 70,
        schemeFit: 75,
        priority: 215,
        projectedDepthBandId: 'projected_depth_band_reserve_path',
      },
      {
        programId: 'program_epsilon',
        interest: 60,
        schemeFit: 70,
        priority: 190,
        projectedDepthBandId: 'projected_depth_band_developmental',
      },
    ],
  };
  return career as unknown as CareerRun;
}

function createSignedEnvelope<T>(
  payload: T,
  saveVersion: number,
  updatedAt: string,
  createdAt = '2026-08-31T00:00:00.000Z',
  contentVersion = CONTENT_VERSION,
): SaveEnvelope<T> {
  const fields: SaveChecksumFields<T> = {
    saveVersion,
    contentVersion,
    createdAt,
    updatedAt,
    payload,
  };
  return { ...fields, checksum: computeSaveChecksum(fields) };
}

describe('staged WR v8 authenticated envelope codec', () => {
  const mechanics = {
    tuning: gameTuning,
    families: keySnapFamilyMechanicsDefinitions,
    patterns: keySnapPatternMechanicsDefinitions,
    skills: skillMechanicsDefinitions,
  };
  const stamp = '2026-09-14T00:00:00.000Z';

  it('keeps every original v1-v7 proof separate from the migrated domain session', () => {
    const career = createTestCareer();
    const session = createCareerSession(career);
    const payloads: readonly unknown[] = [
      createLegacyCareer(career),
      createLegacyCareerV2(career),
      createLegacyCareerV3(career),
      createLegacyCareerV4(career),
      createLegacySessionV5(session),
      { ...session, schemaVersion: 6, career: { ...career, schemaVersion: 6 } },
      session,
    ];
    for (const [index, payload] of payloads.entries()) {
      const envelope = createSignedEnvelope(payload, index + 1, stamp);
      const expected = structuredClone(envelope);
      const original = validateCareerSaveEnvelope(envelope, CONTENT_VERSION);
      expect(original.ok).toBe(true);
      if (!original.ok) throw new Error(original.reason);
      const decoded = decodeWrCareerEnvelopeV8(envelope, CONTENT_VERSION, mechanics);
      expect(decoded.ok).toBe(true);
      if (!decoded.ok) throw new Error(decoded.reason);
      expect(decoded.envelope).toEqual(expected);
      expect(decoded.envelope).not.toBe(envelope);
      expect(decoded.envelope.saveVersion).toBe(index + 1);
      expect(decoded.session).toEqual(migrateCareerSessionV7ToV8(original.envelope.payload));
      expect(Object.isFrozen(decoded.envelope)).toBe(true);
      expect(Object.isFrozen(envelope)).toBe(false);
      Reflect.set(envelope, 'checksum', 'fnv1a32:00000000');
      expect(decoded.envelope).toEqual(expected);
      expect(decodeWrCareerEnvelopeV8(envelope, CONTENT_VERSION, mechanics)).toEqual({
        ok: false,
        reason: 'envelope.checksum_mismatch',
      });
    }
    expect(CURRENT_CAREER_SAVE_VERSION).toBe(7);
  });

  it('authenticates, atomically saves, retries and reloads each current game boundary', async () => {
    const storage = new FaultingStorageAdapter(new MemoryStorageAdapter());
    const persistence = new WrCareerPersistenceV8(storage, mechanics, {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    let failedOnce = false;
    const prepared = prepareCareerGame(
      committedWeekEnd('career-seed:00000000-0000-4000-8000-000000000000'),
    );
    if (!prepared.ok) throw new Error(prepared.reason);
    const world = createCareerSession(prepared.career).world;
    const initial = prepareWrTacticalGameV1(prepared.career, mechanics);
    if (initial === undefined) throw new Error('Missing current preview');
    let game = initial;
    const seen = new Set<string>();
    for (let boundary = 0; boundary < 30; boundary += 1) {
      const career = projectWrTacticalCareerV8(game, mechanics);
      if (career === undefined) throw new Error('Missing current projection');
      const session = { schemaVersion: 8 as const, career, world };
      if (career.phase.type === 'SNAP_RESOLVED' && !failedOnce) {
        const before = await persistence.loadCareer();
        storage.failSnapshotPut = true;
        expect(await persistence.saveSession(session)).toEqual({
          ok: false,
          reason: 'career_save.storage_error',
          stage: 'write_session',
        });
        expect(await persistence.loadCareer()).toEqual(before);
        storage.failSnapshotPut = false;
        failedOnce = true;
      }
      const saved = await persistence.saveSession(session);
      expect(saved.ok).toBe(true);
      const reloaded = await persistence.loadCareer();
      expect(reloaded.ok && reloaded.session).toEqual(session);
      seen.add(career.phase.type);
      const envelope = createWrCareerEnvelopeV8(session, CONTENT_VERSION, stamp, stamp, mechanics);
      expect(envelope).not.toBeNull();
      const decoded = decodeWrCareerEnvelopeV8(
        JSON.parse(JSON.stringify(envelope)),
        CONTENT_VERSION,
        mechanics,
      );
      expect(decoded.ok).toBe(true);
      if (!decoded.ok) throw new Error(decoded.reason);
      expect(decoded.session).toEqual(session);
      expect(decoded.envelope).toEqual(envelope);
      expect(validateCareerSaveEnvelope(envelope, CONTENT_VERSION).ok).toBe(false);
      const forged = createSignedEnvelope(
        { ...session, career: { ...career, revision: career.revision + 1 } },
        8,
        stamp,
      );
      expect(decodeWrCareerEnvelopeV8(forged, CONTENT_VERSION, mechanics)).toEqual({
        ok: false,
        reason: 'envelope.invalid_career',
      });
      if (game.boundary.type === 'POST_GAME') break;
      const next =
        game.boundary.type === 'GAME_PREVIEW'
          ? startWrTacticalGameV1(game, mechanics)
          : game.boundary.type === 'KEY_SNAP'
            ? chooseWrTacticalSnapV1(game, game.boundary.pendingSnap.decisionIds[0], mechanics)
            : advanceWrTacticalGameV1(game, mechanics);
      if (next === undefined) throw new Error('Current game failed to advance');
      game = next;
    }
    expect([...seen].sort()).toEqual(['GAME_PREVIEW', 'KEY_SNAP', 'POST_GAME', 'SNAP_RESOLVED']);
    expect(failedOnce).toBe(true);
  });

  it('retains original v1-v7 proofs on transition and recovers current v8 snapshots', async () => {
    const career = createTestCareer();
    const session = createCareerSession(career);
    const payloads: readonly unknown[] = [
      createLegacyCareer(career),
      createLegacyCareerV2(career),
      createLegacyCareerV3(career),
      createLegacyCareerV4(career),
      createLegacySessionV5(session),
      { ...session, schemaVersion: 6, career: { ...career, schemaVersion: 6 } },
      session,
    ];
    for (const [index, payload] of payloads.entries()) {
      const storage = new MemoryStorageAdapter();
      const old = createSignedEnvelope(payload, index + 1, stamp);
      await storage.put('currentCareer', CURRENT_CAREER_STORAGE_ID, old);
      await storage.put('autosaveSnapshots', 'position-alpha:preserved', {
        namespace: 'other-position',
      });
      const writer = new WrCareerPersistenceV8(storage, mechanics, {
        contentVersion: CONTENT_VERSION,
        now: advancingClock(Date.parse(stamp)),
      });
      const loaded = await writer.loadCareer();
      if (!loaded.ok) throw new Error(loaded.reason);
      expect(loaded.envelope).toEqual(old);
      expect(loaded.session.schemaVersion).toBe(8);
      const collisionId = `${loaded.career.id}:${String(loaded.career.revision).padStart(16, '0')}:${stamp}`;
      const futureProof = createSignedEnvelope(loaded.session, 9, stamp);
      await storage.put('autosaveSnapshots', collisionId, futureProof);
      const next = {
        ...loaded.session,
        career: { ...loaded.career, revision: loaded.career.revision + 1 },
      };
      const saved = await writer.saveSession(next);
      expect(saved.ok).toBe(true);
      if (!saved.ok) throw new Error(saved.reason);
      expect(saved.envelope.saveVersion).toBe(8);
      expect(await storage.get('autosaveSnapshots', collisionId)).toEqual(futureProof);
      expect(
        (await storage.list('autosaveSnapshots')).some(
          ({ value }) => canonicalStringify(value) === canonicalStringify(old),
        ),
      ).toBe(true);
      expect(await storage.get('autosaveSnapshots', 'position-alpha:preserved')).toEqual({
        namespace: 'other-position',
      });
      expect(await writer.saveSession(next)).toMatchObject({ ok: true, snapshotId: null });
      expect(await writer.saveSession(loaded.session)).toMatchObject({
        ok: false,
        reason: 'career_save.stale_revision',
      });
      await storage.put('currentCareer', CURRENT_CAREER_STORAGE_ID, { corrupt: true });
      const recovered = await writer.loadCareer();
      expect(recovered).toMatchObject({ ok: true, source: 'snapshot', session: next });
      expect(await writer.saveSession(next)).toMatchObject({ ok: true, snapshotId: null });
      expect(await storage.get('currentCareer', CURRENT_CAREER_STORAGE_ID)).toEqual(saved.envelope);
      await storage.put(
        'currentCareer',
        CURRENT_CAREER_STORAGE_ID,
        createSignedEnvelope(next, 9, stamp),
      );
      expect(await writer.saveSession(next)).toMatchObject({
        ok: false,
        reason: 'career_save.protected_existing_save',
      });
    }
  });

  it('rejects malformed, future, mixed, oversized and unauthenticated current envelopes', () => {
    const session = migrateCareerSessionV7ToV8(createCareerSession(createTestCareer()));
    const envelope = createWrCareerEnvelopeV8(session, CONTENT_VERSION, stamp, stamp, mechanics);
    if (envelope === null) throw new Error('Missing neutral envelope');
    for (const malformed of [
      null,
      { ...envelope, extra: undefined },
      { ...envelope, saveVersion: 9 },
      { ...envelope, contentVersion: 'future' },
      { ...envelope, createdAt: '2027-01-01T00:00:00.000Z' },
      { ...envelope, updatedAt: 'not-a-date' },
      { ...envelope, checksum: 'fnv1a32:00000000' },
      createSignedEnvelope(
        { ...session, career: { ...session.career, schemaVersion: 7 } },
        8,
        stamp,
      ),
      createSignedEnvelope({ ...session, padding: 'x'.repeat(1_000_000) }, 8, stamp),
    ])
      expect(decodeWrCareerEnvelopeV8(malformed, CONTENT_VERSION, mechanics).ok).toBe(false);
    expect(
      createWrCareerEnvelopeV8(session, CONTENT_VERSION, stamp, 'invalid', mechanics),
    ).toBeNull();
    expect(createWrCareerEnvelopeV8(session, '', stamp, stamp, mechanics)).toBeNull();
  });
});

class FaultingStorageAdapter implements StorageAdapter {
  public readonly durability = 'memory' as const;
  public failCurrentGet = false;
  public failSnapshotList = false;
  public failSnapshotPut = false;
  public failCurrentPut = false;
  public failDelete = false;
  public readonly trace: string[] = [];

  public constructor(private readonly delegate: StorageAdapter) {}

  public async get<T>(storeName: StorageStoreName, id: string): Promise<T | undefined> {
    this.trace.push(`get:${storeName}`);
    if (storeName === 'currentCareer' && this.failCurrentGet) {
      throw new Error('current get failed');
    }
    return this.delegate.get<T>(storeName, id);
  }

  public put<T>(storeName: StorageStoreName, id: string, value: T): Promise<void> {
    this.trace.push(`put:${storeName}`);
    if (storeName === 'autosaveSnapshots' && this.failSnapshotPut) {
      return Promise.reject(new Error('snapshot put failed'));
    }
    if (storeName === 'currentCareer' && this.failCurrentPut) {
      return Promise.reject(new Error('current put failed'));
    }
    return this.delegate.put(storeName, id, value);
  }

  public putMany(entries: Parameters<StorageAdapter['putMany']>[0]): Promise<void> {
    this.trace.push('putMany');
    if (this.failSnapshotPut || this.failCurrentPut) {
      return Promise.reject(new Error('session transaction failed'));
    }
    return this.delegate.putMany(entries);
  }

  public list<T>(storeName: StorageStoreName): Promise<readonly StorageEntry<T>[]> {
    this.trace.push(`list:${storeName}`);
    if (storeName === 'autosaveSnapshots' && this.failSnapshotList) {
      return Promise.reject(new Error('snapshot list failed'));
    }
    return this.delegate.list<T>(storeName);
  }

  public delete(storeName: StorageStoreName, id: string): Promise<void> {
    this.trace.push(`delete:${storeName}`);
    if (this.failDelete) {
      return Promise.reject(new Error('delete failed'));
    }
    return this.delegate.delete(storeName, id);
  }

  public runExclusive<T>(lockName: string, operation: () => Promise<T>): Promise<T> {
    return this.delegate.runExclusive(lockName, operation);
  }

  public close(): Promise<void> {
    return this.delegate.close();
  }
}

describe('canonical save integrity', () => {
  it('sorts keys by code units and hashes Unicode bytes deterministically', () => {
    expect(canonicalStringify({ z: 1, a: '한', nested: { b: false, a: null } })).toBe(
      '{"a":"한","nested":{"a":null,"b":false},"z":1}',
    );

    const first = computeSaveChecksum({
      saveVersion: 1,
      contentVersion: CONTENT_VERSION,
      createdAt: '2026-08-31T00:00:00.000Z',
      updatedAt: '2026-08-31T00:00:00.000Z',
      payload: { b: 2, a: '한' },
    });
    const reordered = computeSaveChecksum({
      payload: { a: '한', b: 2 },
      updatedAt: '2026-08-31T00:00:00.000Z',
      createdAt: '2026-08-31T00:00:00.000Z',
      contentVersion: CONTENT_VERSION,
      saveVersion: 1,
    });
    expect(first).toBe(reordered);
    expect(first).toBe('fnv1a32:61c819df');
  });

  it('rejects non-JSON numbers, sparse arrays, and cycles', () => {
    expect(() => canonicalStringify(Number.NaN)).toThrow(TypeError);
    expect(() => canonicalStringify(new Array(1))).toThrow(TypeError);
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    expect(() => canonicalStringify(cyclic)).toThrow(TypeError);
  });
});

describe('career save schema migration', () => {
  it.each([
    ['PLAN_ACTIONS', 0],
    ['RESOLVE_ACTIONS', 1],
    ['RESOLVE_ACTIONS', 2],
    ['RESOLVE_ACTIONS', 3],
    ['WEEK_END', 4],
  ])('migrates a checksum-valid v1 %s phase fixture at transition %i', (phaseType, count) => {
    const current = advanceTransitions(createTestCareer(`legacy-phase-${count}`), count);
    expect(current.phase.type).toBe(phaseType);
    const legacy = createLegacyCareer(current);
    const rawEnvelope = createSignedEnvelope(legacy, 1, `2026-08-31T00:00:0${count}.000Z`);

    const validation = validateCareerSaveEnvelope(rawEnvelope, CONTENT_VERSION);
    expect(validation.ok).toBe(true);
    if (!validation.ok) {
      return;
    }
    expect(validation.envelope).toEqual(
      expect.objectContaining({
        saveVersion: CURRENT_CAREER_SAVE_VERSION,
        contentVersion: CONTENT_VERSION,
        createdAt: rawEnvelope.createdAt,
        updatedAt: rawEnvelope.updatedAt,
        payload: expect.objectContaining({
          schemaVersion: 7,
          career: expect.objectContaining({
            schemaVersion: 7,
            id: legacy.id,
            revision: legacy.revision,
            rng: legacy.rng,
            phase: expect.objectContaining({ type: legacy.phase.type }),
            programContext: null,
            recruitingState: { type: 'NOT_STARTED' },
            gameCareerState: createEmptyGameCareerState(),
          }),
          world: expect.objectContaining({
            schemaVersion: 1,
            careerId: legacy.id,
            calendar: { type: 'PENDING' },
          }),
        }),
      }),
    );
    expect(createLegacyCareer(validation.envelope.payload.career)).toEqual(legacy);
    expect(validation.envelope.payload.career.player.skillState).toEqual({
      acquisitions: [],
      breakthroughGauge: {
        lastProgress: null,
        model: 'gauge_v1',
        progress: 0,
        threshold: 100,
      },
      equippedSkillIds: [null, null, null, null],
    });
    expect(validation.envelope.checksum).toBe(
      computeSaveChecksum({
        saveVersion: validation.envelope.saveVersion,
        contentVersion: validation.envelope.contentVersion,
        createdAt: validation.envelope.createdAt,
        updatedAt: validation.envelope.updatedAt,
        payload: validation.envelope.payload,
      }),
    );
  });

  it.each([
    ['PLAN_ACTIONS', 0],
    ['RESOLVE_ACTIONS', 1],
    ['RESOLVE_ACTIONS', 2],
    ['RESOLVE_ACTIONS', 3],
    ['WEEK_END', 4],
  ])(
    'migrates a checksum-valid v2 %s phase fixture exactly at transition %i',
    (phaseType, count) => {
      const current = advanceTransitions(createTestCareer(`schema-v2-phase-${count}`), count);
      expect(current.phase.type).toBe(phaseType);
      const legacy = createLegacyCareerV2(current);
      const rawEnvelope = createSignedEnvelope(legacy, 2, `2026-08-31T00:01:0${count}.000Z`);

      const validation = validateCareerSaveEnvelope(rawEnvelope, CONTENT_VERSION);
      expect(validation.ok).toBe(true);
      if (!validation.ok) {
        return;
      }
      expect(validation.envelope).toEqual(
        expect.objectContaining({
          saveVersion: CURRENT_CAREER_SAVE_VERSION,
          contentVersion: CONTENT_VERSION,
          createdAt: rawEnvelope.createdAt,
          updatedAt: rawEnvelope.updatedAt,
          payload: createCareerSession(
            migrateCareerRunV6ToV7(
              migrateCareerRunV5ToV6(
                migrateCareerRunV4ToV5(migrateCareerRunV3ToV4(migrateCareerRunV2ToV3(legacy))),
              ),
            ),
          ),
        }),
      );
    },
  );

  it('migrates a checksum-valid v2 skill breakthrough without changing its pending offer', () => {
    const weekEnd = advanceTransitions(createTestCareer('schema-v2-breakthrough'), 4);
    const breakthrough = expectTransition(
      advanceHistoricalDevelopmentWeek(
        weekEnd,
        developmentWeekConfig,
        skillMechanicsDefinitions,
        weeklyActionDefinitions,
      ),
    );
    expect(breakthrough.phase.type).toBe('SKILL_BREAKTHROUGH');
    const legacy = createLegacyCareerV2(breakthrough);
    const rawEnvelope = createSignedEnvelope(legacy, 2, '2026-08-31T00:01:05.000Z');

    const validation = validateCareerSaveEnvelope(rawEnvelope, CONTENT_VERSION);
    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(validation.envelope.payload).toEqual(
        createCareerSession(
          migrateCareerRunV6ToV7(
            migrateCareerRunV5ToV6(
              migrateCareerRunV4ToV5(migrateCareerRunV3ToV4(migrateCareerRunV2ToV3(legacy))),
            ),
          ),
        ),
      );
      expect(validation.envelope.payload.career.phase).toEqual(legacy.phase);
    }
  });

  it('migrates strict v4 preview, key-snap, and post-game envelopes without changing phase evidence', () => {
    const weekEnd = committedWeekEnd('career-seed:00000000-0000-4000-8000-000000000000');
    const prepared = prepareCareerGame(weekEnd);
    if (!prepared.ok) throw new Error(prepared.reason);
    const started = startCareerGame(prepared.career);
    if (!started.ok) throw new Error(started.reason);
    expect(started.career.phase.type).toBe('KEY_SNAP');
    let completed = started.career;
    let snapCount = 0;
    while (completed.phase.type === 'KEY_SNAP') {
      const resolved = resolveCareerKeySnap(completed, completed.phase.pendingSnap.decisionIds[0]);
      if (!resolved.ok) throw new Error(resolved.reason);
      completed = resolved.career;
      snapCount += 1;
      if (snapCount > 12) throw new Error('Game migration fixture exceeded snap bound.');
    }
    expect(completed.phase.type).toBe('POST_GAME');

    for (const career of [prepared.career, started.career, completed]) {
      const legacy = createLegacyCareerV4(career);
      const envelope = createSignedEnvelope(
        legacy,
        4,
        `2026-08-31T00:02:${String(legacy.revision).padStart(2, '0')}.000Z`,
      );
      const validation = validateCareerSaveEnvelope(envelope, CONTENT_VERSION);
      expect(validation.ok).toBe(true);
      if (validation.ok) {
        expect(validation.envelope.payload.career.phase).toEqual(legacy.phase);
        expect(validation.envelope.payload.career.rng).toEqual(legacy.rng);
        expect(validation.envelope.payload.career.revision).toBe(legacy.revision);
        expect(validation.envelope.payload.world.calendar).toEqual({ type: 'PENDING' });
      }

      const legacySession = createLegacySessionV5(createCareerSession(career));
      const v5Envelope = createSignedEnvelope(
        legacySession,
        5,
        `2026-08-31T00:03:${String(legacySession.career.revision).padStart(2, '0')}.000Z`,
      );
      const v5Validation = validateCareerSaveEnvelope(v5Envelope, CONTENT_VERSION);
      expect(v5Validation.ok).toBe(true);
      if (v5Validation.ok) {
        expect(v5Validation.envelope.saveVersion).toBe(CURRENT_CAREER_SAVE_VERSION);
        expect(v5Validation.envelope.payload.schemaVersion).toBe(7);
        expect(v5Validation.envelope.payload.career.phase).toEqual(legacySession.career.phase);
        expect(v5Validation.envelope.payload.career.rng).toEqual(legacySession.career.rng);
        expect(v5Validation.envelope.payload.world).toEqual(legacySession.world);
      }
    }
  });

  it('migrates exact v5 weekly, contextual-decision, review, and completed sessions neutrally', () => {
    const weeklySessions = [0, 1, 2, 3, 4].map((transitionCount) =>
      createCareerSession(
        advanceTransitions(
          createTestCareer(`schema-v5-weekly-${transitionCount}`),
          transitionCount,
        ),
      ),
    );
    const decisions = createSeasonDecisionFixtures();
    const completed = createCompletedSeasonFixture('schema-v5-completed');
    const sessions = [
      ...weeklySessions,
      decisions.eventSession,
      decisions.injurySession,
      completed.reviewSession,
      completed.completedSession,
    ];
    expect(sessions.map(({ career }) => career.phase.type)).toEqual([
      'PLAN_ACTIONS',
      'RESOLVE_ACTIONS',
      'RESOLVE_ACTIONS',
      'RESOLVE_ACTIONS',
      'WEEK_END',
      'EVENT_CHOICE',
      'INJURY_CHOICE',
      'SEASON_REVIEW',
      'CAREER_COMPLETE',
    ]);

    for (const [index, session] of sessions.entries()) {
      const legacy = createLegacySessionV5(session);
      const rawEnvelope = createSignedEnvelope(
        legacy,
        5,
        `2026-08-31T00:04:${String(index).padStart(2, '0')}.000Z`,
      );
      const before = structuredClone(rawEnvelope);
      const validation = validateCareerSaveEnvelope(rawEnvelope, CONTENT_VERSION);
      expect(validation.ok).toBe(true);
      if (!validation.ok) continue;
      expect(validation.envelope).toEqual(
        expect.objectContaining({
          saveVersion: CURRENT_CAREER_SAVE_VERSION,
          createdAt: rawEnvelope.createdAt,
          updatedAt: rawEnvelope.updatedAt,
          payload: expect.objectContaining({ schemaVersion: 7 }),
        }),
      );
      expect(validation.envelope.payload.career.phase).toEqual(legacy.career.phase);
      expect(validation.envelope.payload.career.revision).toBe(legacy.career.revision);
      expect(validation.envelope.payload.career.rng).toEqual(legacy.career.rng);
      expect(validation.envelope.payload.career.seasonCareerState).toEqual(
        legacy.career.seasonCareerState,
      );
      expect(validation.envelope.payload.world).toEqual(legacy.world);
      expect(validation.envelope.payload.career.offFieldCareerState.offseason.status).toBe(
        'NOT_STARTED',
      );
      expect(rawEnvelope).toEqual(before);

      const legacyV6 = migrateCareerSessionV5ToV6(legacy);
      const v6Envelope = createSignedEnvelope(
        legacyV6,
        6,
        `2026-08-31T00:05:${String(index).padStart(2, '0')}.000Z`,
      );
      const v6Validation = validateCareerSaveEnvelope(v6Envelope, CONTENT_VERSION);
      expect(v6Validation.ok).toBe(true);
      if (!v6Validation.ok) continue;
      expect(v6Validation.envelope.saveVersion).toBe(CURRENT_CAREER_SAVE_VERSION);
      expect(v6Validation.envelope.payload.schemaVersion).toBe(7);
      expect(v6Validation.envelope.payload.career).toEqual({
        ...legacyV6.career,
        schemaVersion: 7,
      });
      expect(v6Validation.envelope.payload.world).toEqual(legacyV6.world);
    }
  }, 30_000);

  it('accepts only the exact v1-v6 legacy and v7 current envelope/payload tuples', () => {
    const current = createTestCareer('exact-version-tuples');
    const legacyV3 = createLegacyCareerV3(current);
    const legacyV4 = createLegacyCareerV4(current);
    const legacyV2 = createLegacyCareerV2(current);
    const legacyV1 = createLegacyCareer(current);
    const legacyV5 = createLegacySessionV5(createCareerSession(current));
    const legacyV6: CareerSessionV6 = migrateCareerSessionV5ToV6(legacyV5);

    expect(
      validateCareerSaveEnvelope(
        createSignedEnvelope(legacyV3, 3, '2026-08-31T00:00:01.000Z'),
        CONTENT_VERSION,
      ).ok,
    ).toBe(true);
    expect(
      validateCareerSaveEnvelope(
        createSignedEnvelope(legacyV5, 5, '2026-08-31T00:00:01.000Z'),
        CONTENT_VERSION,
      ).ok,
    ).toBe(true);
    expect(
      validateCareerSaveEnvelope(
        createSignedEnvelope(legacyV6, 6, '2026-08-31T00:00:01.000Z'),
        CONTENT_VERSION,
      ).ok,
    ).toBe(true);
    expect(
      validateCareerSaveEnvelope(
        createSignedEnvelope(
          createCareerSession(current),
          CURRENT_CAREER_SAVE_VERSION,
          '2026-08-31T00:00:01.000Z',
        ),
        CONTENT_VERSION,
      ).ok,
    ).toBe(true);
    expect(
      validateCareerSaveEnvelope(
        createSignedEnvelope(legacyV4, 4, '2026-08-31T00:00:01.000Z'),
        CONTENT_VERSION,
      ).ok,
    ).toBe(true);
    expect(
      validateCareerSaveEnvelope(
        createSignedEnvelope(legacyV2, 2, '2026-08-31T00:00:01.000Z'),
        CONTENT_VERSION,
      ).ok,
    ).toBe(true);
    expect(
      validateCareerSaveEnvelope(
        createSignedEnvelope(legacyV1, 1, '2026-08-31T00:00:01.000Z'),
        CONTENT_VERSION,
      ).ok,
    ).toBe(true);
    expect(
      validateCareerSaveEnvelope(
        createSignedEnvelope(createCareerSession(current), 5, '2026-08-31T00:00:01.000Z'),
        CONTENT_VERSION,
      ),
    ).toEqual({ ok: false, reason: 'envelope.unsupported_career_version' });
    expect(
      validateCareerSaveEnvelope(
        createSignedEnvelope(legacyV2, CURRENT_CAREER_SAVE_VERSION, '2026-08-31T00:00:01.000Z'),
        CONTENT_VERSION,
      ),
    ).toEqual({ ok: false, reason: 'envelope.unsupported_career_version' });
    expect(
      validateCareerSaveEnvelope(
        createSignedEnvelope(legacyV4, 2, '2026-08-31T00:00:01.000Z'),
        CONTENT_VERSION,
      ),
    ).toEqual({ ok: false, reason: 'envelope.unsupported_career_version' });
    expect(
      validateCareerSaveEnvelope(
        createSignedEnvelope(legacyV1, 1, '2026-08-31T00:00:01.000Z', undefined, 'future-content'),
        CONTENT_VERSION,
      ),
    ).toEqual({ ok: false, reason: 'envelope.incompatible_content' });
    expect(
      validateCareerSaveEnvelope(
        createSignedEnvelope(createCareerSession(current), 8, '2026-08-31T00:00:01.000Z'),
        CONTENT_VERSION,
      ),
    ).toEqual({ ok: false, reason: 'envelope.unsupported_save_version' });
  });

  it('checks each original v1/v2 checksum before parsing or chaining migrations', () => {
    const current = createTestCareer('legacy-checksum-first');
    for (const [saveVersion, payload] of [
      [1, createLegacyCareer(current)],
      [2, createLegacyCareerV2(current)],
    ] as const) {
      const rawEnvelope = createSignedEnvelope(
        payload,
        saveVersion,
        `2026-08-31T00:00:0${saveVersion}.000Z`,
      );
      const tampered = structuredClone(rawEnvelope) as unknown as SaveEnvelope<{
        schemaVersion: number;
      }>;
      tampered.payload.schemaVersion = 99;

      expect(validateCareerSaveEnvelope(tampered, CONTENT_VERSION)).toEqual({
        ok: false,
        reason: 'envelope.checksum_mismatch',
      });
    }
  });

  it('ranks and recovers mixed v1/v2/v3/v4 candidates by original timestamps and revisions', async () => {
    const storage = new MemoryStorageAdapter();
    const base = createTestCareer('mixed-ranking');
    const current = withRevision(base, 9);
    const newerV1 = createLegacyCareer(withRevision(base, 3));
    const newestV2 = createLegacyCareerV2(withRevision(base, 5));
    await storage.put('currentCareer', CURRENT_CAREER_STORAGE_ID, {
      ...createSignedEnvelope(createLegacyCareerV4(current), 4, '2026-08-31T00:00:01.000Z'),
      checksum: 'bad',
    });
    await storage.put(
      'autosaveSnapshots',
      'newer-v1',
      createSignedEnvelope(newerV1, 1, '2026-08-31T00:00:02.000Z'),
    );
    await storage.put(
      'autosaveSnapshots',
      'newest-v2',
      createSignedEnvelope(newestV2, 2, '2026-08-31T00:00:03.000Z'),
    );
    await storage.put(
      'autosaveSnapshots',
      'older-v3',
      createSignedEnvelope(createLegacyCareerV3(current), 3, '2026-08-31T00:00:01.500Z'),
    );

    const persistence = new CareerPersistence(storage, { contentVersion: CONTENT_VERSION });
    const loaded = await persistence.loadCareer();
    expect(loaded).toEqual(
      expect.objectContaining({
        ok: true,
        source: 'snapshot',
        recovered: true,
        career: expect.objectContaining({ schemaVersion: 7, revision: 5 }),
        skippedEntries: [
          {
            id: CURRENT_CAREER_STORAGE_ID,
            reason: 'envelope.invalid_shape',
            store: 'currentCareer',
          },
        ],
      }),
    );

    const tiedV1 = createLegacyCareer(withRevision(base, 10));
    await storage.put(
      'autosaveSnapshots',
      'tied-higher-revision-v1',
      createSignedEnvelope(tiedV1, 1, '2026-08-31T00:00:01.500Z'),
    );
    await storage.delete('autosaveSnapshots', 'newer-v1');
    await storage.delete('autosaveSnapshots', 'newest-v2');
    const tiedLoad = await persistence.loadCareer();
    expect(tiedLoad).toEqual(
      expect.objectContaining({
        ok: true,
        source: 'snapshot',
        career: expect.objectContaining({ revision: 10 }),
      }),
    );
  });

  it('does not eagerly rewrite v1/v2 loads and upgrades each on the next committed save', async () => {
    for (const legacyVersion of [1, 2] as const) {
      const memory = new MemoryStorageAdapter();
      const storage = new FaultingStorageAdapter(memory);
      const current = createTestCareer(`lazy-v${legacyVersion}-upgrade`);
      const legacy =
        legacyVersion === 1 ? createLegacyCareer(current) : createLegacyCareerV2(current);
      const rawEnvelope = createSignedEnvelope(
        legacy,
        legacyVersion,
        `2026-08-31T00:00:0${legacyVersion}.000Z`,
        '2026-08-30T00:00:00.000Z',
      );
      await memory.put('currentCareer', CURRENT_CAREER_STORAGE_ID, rawEnvelope);
      const persistence = new CareerPersistence(storage, {
        contentVersion: CONTENT_VERSION,
        now: () => new Date('2026-08-31T00:00:03.000Z'),
      });

      const loaded = await persistence.loadCareer();
      expect(loaded).toEqual(
        expect.objectContaining({
          ok: true,
          source: 'current',
          envelope: expect.objectContaining({ saveVersion: CURRENT_CAREER_SAVE_VERSION }),
          career: expect.objectContaining({ schemaVersion: 7 }),
        }),
      );
      expect(storage.trace).toEqual(['get:currentCareer', 'list:autosaveSnapshots']);
      expect(await memory.get('currentCareer', CURRENT_CAREER_STORAGE_ID)).toEqual(rawEnvelope);
      if (!loaded.ok) {
        continue;
      }

      const saved = await persistence.saveCareer(
        withRevision(loaded.career, loaded.career.revision + 1),
      );
      expect(saved).toEqual(
        expect.objectContaining({
          ok: true,
          envelope: expect.objectContaining({
            saveVersion: CURRENT_CAREER_SAVE_VERSION,
            createdAt: rawEnvelope.createdAt,
            payload: expect.objectContaining({
              schemaVersion: 7,
              career: expect.objectContaining({ schemaVersion: 7 }),
            }),
          }),
        }),
      );
      const upgraded = await memory.get<SaveEnvelope<CareerSession>>(
        'currentCareer',
        CURRENT_CAREER_STORAGE_ID,
      );
      expect(upgraded).toEqual(
        expect.objectContaining({ saveVersion: CURRENT_CAREER_SAVE_VERSION }),
      );
      expect(upgraded?.payload.schemaVersion).toBe(7);
    }
  });

  it('loads a signed v5 aggregate without rewriting it and upgrades on the next committed save', async () => {
    const memory = new MemoryStorageAdapter();
    const current = createCareerSession(createTestCareer('lazy-v5-upgrade'));
    const legacy = createLegacySessionV5(current);
    const rawEnvelope = createSignedEnvelope(
      legacy,
      5,
      '2026-08-31T00:00:05.000Z',
      '2026-08-30T00:00:00.000Z',
    );
    await memory.put('currentCareer', CURRENT_CAREER_STORAGE_ID, rawEnvelope);
    const persistence = new CareerPersistence(memory, {
      contentVersion: CONTENT_VERSION,
      now: () => new Date('2026-08-31T00:00:06.000Z'),
    });

    const loaded = await persistence.loadCareer();
    expect(loaded).toEqual(
      expect.objectContaining({
        ok: true,
        source: 'current',
        career: expect.objectContaining({ schemaVersion: 7 }),
        session: expect.objectContaining({ schemaVersion: 7, world: legacy.world }),
      }),
    );
    expect(await memory.get('currentCareer', CURRENT_CAREER_STORAGE_ID)).toEqual(rawEnvelope);
    if (!loaded.ok) return;

    const saved = await persistence.saveCareer(
      withRevision(loaded.career, loaded.career.revision + 1),
    );
    expect(saved).toEqual(
      expect.objectContaining({
        ok: true,
        envelope: expect.objectContaining({
          saveVersion: CURRENT_CAREER_SAVE_VERSION,
          createdAt: rawEnvelope.createdAt,
          payload: expect.objectContaining({ schemaVersion: 7 }),
        }),
      }),
    );
  });

  it('counts valid legacy snapshots with v4 saves for thirty-save retention', async () => {
    const storage = new MemoryStorageAdapter();
    const base = createTestCareer('mixed-retention');
    for (let revision = 0; revision < CAREER_SNAPSHOT_RETENTION; revision += 1) {
      const current = withRevision(base, revision);
      const saveVersion = (revision % 3) + 1;
      const payload =
        saveVersion === 1
          ? createLegacyCareer(current)
          : saveVersion === 2
            ? createLegacyCareerV2(current)
            : createLegacyCareerV3(current);
      await storage.put(
        'autosaveSnapshots',
        `mixed-${String(revision).padStart(2, '0')}`,
        createSignedEnvelope(
          payload,
          saveVersion,
          `2026-08-31T00:00:${String(revision).padStart(2, '0')}.000Z`,
        ),
      );
    }
    const persistence = new CareerPersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: () => new Date('2026-08-31T00:01:00.000Z'),
    });

    const saved = await persistence.saveCareer(withRevision(base, CAREER_SNAPSHOT_RETENTION));
    expect(saved).toEqual(expect.objectContaining({ ok: true, prunedSnapshotCount: 1 }));
    const snapshots =
      await storage.list<SaveEnvelope<CareerRun | CareerRunV1 | CareerRunV2>>('autosaveSnapshots');
    expect(snapshots).toHaveLength(CAREER_SNAPSHOT_RETENTION);
    expect(snapshots.some(({ id }) => id === 'mixed-00')).toBe(false);
    expect(snapshots.filter(({ value }) => value.saveVersion === 1)).toHaveLength(9);
    expect(snapshots.filter(({ value }) => value.saveVersion === 2)).toHaveLength(10);
    expect(snapshots.filter(({ value }) => value.saveVersion === 3)).toHaveLength(10);
    expect(snapshots.filter(({ value }) => value.saveVersion === 7)).toHaveLength(1);
  });
});

describe('career persistence', () => {
  it('snapshots caller-owned career data before saveCareer returns', async () => {
    type MutableCareerIdentity = {
      player: { displayName: string };
    };
    const storage = new MemoryStorageAdapter();
    const persistence = new CareerPersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    const mutableCareer = structuredClone(
      createTestCareer('caller-owned-snapshot'),
    ) as unknown as MutableCareerIdentity;
    const originalDisplayName = mutableCareer.player.displayName;

    const save = persistence.saveCareer(mutableCareer as unknown as CareerRun);
    mutableCareer.player.displayName = 'Mutated after saveCareer';

    expect((await save).ok).toBe(true);
    const loaded = await persistence.loadCareer();
    expect(loaded).toEqual(
      expect.objectContaining({
        ok: true,
        career: expect.objectContaining({
          player: expect.objectContaining({
            displayName: originalDisplayName,
          }),
        }),
      }),
    );
  });

  it('isolates nested v3 recruiting evidence from caller mutation while saving', async () => {
    type MutableChoosingCareer = {
      recruitingState: {
        offers: Array<{ interest: number }>;
      };
    };
    const storage = new MemoryStorageAdapter();
    const persistence = new CareerPersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    const mutableCareer = structuredClone(
      createChoosingCareer('nested-v3-snapshot'),
    ) as unknown as MutableChoosingCareer;
    const originalInterest = mutableCareer.recruitingState.offers[0]!.interest;

    const save = persistence.saveCareer(mutableCareer as unknown as CareerRun);
    mutableCareer.recruitingState.offers[0]!.interest = 1;

    expect((await save).ok).toBe(true);
    const loaded = await persistence.loadCareer();
    expect(loaded.ok).toBe(true);
    if (loaded.ok && loaded.career.recruitingState.type === 'CHOOSING') {
      expect(loaded.career.recruitingState.offers[0]?.interest).toBe(originalInterest);
      expect(loaded.career.recruitingState.offers).toHaveLength(5);
    }
  });

  it('writes snapshot and current atomically, preserves timestamps, and reloads a frozen exact career', async () => {
    const memory = new MemoryStorageAdapter();
    const storage = new FaultingStorageAdapter(memory);
    const persistence = new CareerPersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    const initial = createTestCareer();

    const savedInitial = await persistence.saveCareer(initial);
    expect(savedInitial.ok).toBe(true);
    expect(storage.trace).toEqual([
      'get:settings',
      'get:currentCareer',
      'list:autosaveSnapshots',
      'putMany',
    ]);
    if (!savedInitial.ok) {
      return;
    }
    expect(validateCareerSaveEnvelope(savedInitial.envelope, CONTENT_VERSION).ok).toBe(true);
    expect(savedInitial.envelope.createdAt).toBe('2026-08-31T00:00:00.000Z');

    const next = nextTransition(initial);
    const savedNext = await persistence.saveCareer(next);
    expect(savedNext.ok).toBe(true);
    if (!savedNext.ok) {
      return;
    }
    expect(savedNext.envelope.createdAt).toBe(savedInitial.envelope.createdAt);
    expect(savedNext.envelope.updatedAt).toBe('2026-08-31T00:00:01.000Z');

    const loaded = await persistence.loadCareer();
    expect(loaded).toEqual(
      expect.objectContaining({
        ok: true,
        source: 'current',
        recovered: false,
        career: next,
      }),
    );
    if (loaded.ok) {
      expect(Object.isFrozen(loaded.career)).toBe(true);
      expect(Object.isFrozen(loaded.career.phase)).toBe(true);
      expect(loaded.career.rng).toEqual(next.rng);
    }
  });

  it('round-trips every resumable development phase including queue, index, results, and RNG', async () => {
    const persistence = new CareerPersistence(new MemoryStorageAdapter(), {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    let career = createTestCareer('phase-round-trip');
    const expectedPhases = [
      'PLAN_ACTIONS',
      'RESOLVE_ACTIONS',
      'RESOLVE_ACTIONS',
      'RESOLVE_ACTIONS',
      'WEEK_END',
      'PLAN_ACTIONS',
    ] as const;

    for (const [index, expectedPhase] of expectedPhases.entries()) {
      expect(career.phase.type).toBe(expectedPhase);
      const saved = await persistence.saveCareer(career);
      expect(saved.ok).toBe(true);
      const loaded = await persistence.loadCareer();
      expect(loaded.ok).toBe(true);
      if (loaded.ok) {
        expect(loaded.career).toEqual(career);
        expect(loaded.career.rng).toEqual(career.rng);
        expect(loaded.career.phase).toEqual(career.phase);
      }
      if (index < expectedPhases.length - 1) {
        career = nextTransition(career);
      }
    }
  });

  it('round-trips an exact pending breakthrough, choice, and planning loadout commands', async () => {
    const persistence = new CareerPersistence(new MemoryStorageAdapter(), {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    const career = advanceUntilBreakthrough(createTestCareer('skill-phase-round-trip'));
    if (career.phase.type !== 'SKILL_BREAKTHROUGH') {
      throw new Error('Expected a narrowed pending breakthrough.');
    }
    const pendingRng = career.rng;
    const pendingOffer = career.phase.offer;

    expect((await persistence.saveCareer(career)).ok).toBe(true);
    const loadedOffer = await persistence.loadCareer();
    expect(loadedOffer.ok).toBe(true);
    if (!loadedOffer.ok || loadedOffer.career.phase.type !== 'SKILL_BREAKTHROUGH') {
      return;
    }
    expect(loadedOffer.career.phase.offer).toEqual(pendingOffer);
    expect(loadedOffer.career.rng).toEqual(pendingRng);

    const selectedSkillId = loadedOffer.career.phase.offer.offeredSkillIds[0];
    const chosen = chooseSkillBreakthrough(loadedOffer.career, selectedSkillId);
    if (!chosen.ok) {
      throw new Error(chosen.reason);
    }
    expect(chosen.career.rng).toEqual(pendingRng);
    expect((await persistence.saveCareer(chosen.career)).ok).toBe(true);
    const loadedChoice = await persistence.loadCareer();
    expect(loadedChoice.ok).toBe(true);
    if (!loadedChoice.ok) {
      return;
    }
    expect(loadedChoice.career).toEqual(chosen.career);
    expect(loadedChoice.career.player.skillState.equippedSkillIds).toEqual([
      selectedSkillId,
      null,
      null,
      null,
    ]);

    const cleared = setEquippedSkillSlot(loadedChoice.career, 0, null);
    if (!cleared.ok) {
      throw new Error(cleared.reason);
    }
    const moved = setEquippedSkillSlot(cleared.career, 2, selectedSkillId);
    if (!moved.ok) {
      throw new Error(moved.reason);
    }
    expect((await persistence.saveCareer(moved.career)).ok).toBe(true);
    const loadedLoadout = await persistence.loadCareer();
    expect(loadedLoadout.ok).toBe(true);
    if (loadedLoadout.ok) {
      expect(loadedLoadout.career).toEqual(moved.career);
      expect(loadedLoadout.career.rng).toEqual(pendingRng);
      expect(loadedLoadout.career.player.skillState.equippedSkillIds).toEqual([
        null,
        null,
        selectedSkillId,
        null,
      ]);
    }
  });

  it('continues identically after a mid-resolution save and reload', async () => {
    const uninterruptedStart = advanceTransitions(createTestCareer('reload-equivalence'), 2);
    const reloadStart = advanceTransitions(createTestCareer('reload-equivalence'), 2);
    const persistence = new CareerPersistence(new MemoryStorageAdapter(), {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    expect((await persistence.saveCareer(reloadStart)).ok).toBe(true);
    const loaded = await persistence.loadCareer();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) {
      return;
    }

    const uninterruptedFinal = advanceTransitions(uninterruptedStart, 3);
    const reloadedFinal = advanceTransitions(loaded.career, 3);
    expect(reloadedFinal).toEqual(uninterruptedFinal);
    expect(reloadedFinal.rng).toEqual(uninterruptedFinal.rng);
  });

  it('selects a newer valid snapshot when current is corrupt and leaves no partial transaction', async () => {
    const memory = new MemoryStorageAdapter();
    const persistence = new CareerPersistence(memory, {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    const initial = createTestCareer('snapshot-recovery');
    const next = nextTransition(initial);
    expect((await persistence.saveCareer(initial)).ok).toBe(true);
    const nextSave = await persistence.saveCareer(next);
    expect(nextSave.ok).toBe(true);

    const current = await memory.get<SaveEnvelope<CareerRun>>(
      'currentCareer',
      CURRENT_CAREER_STORAGE_ID,
    );
    expect(current).toBeDefined();
    if (current === undefined) {
      return;
    }
    await memory.put('currentCareer', CURRENT_CAREER_STORAGE_ID, {
      ...current,
      checksum: 'fnv1a32:00000000',
    });
    await memory.put('autosaveSnapshots', 'future-corrupt', {
      ...current,
      updatedAt: '2099-01-01T00:00:00.000Z',
    });

    const recoveredCorruption = await persistence.loadCareer();
    expect(recoveredCorruption).toEqual(
      expect.objectContaining({
        ok: true,
        source: 'snapshot',
        recovered: true,
        career: next,
        skippedEntries: expect.arrayContaining([
          expect.objectContaining({ reason: 'envelope.checksum_mismatch' }),
        ]),
      }),
    );

    const third = nextTransition(next);
    const faulting = new FaultingStorageAdapter(memory);
    faulting.failCurrentPut = true;
    const interrupted = await new CareerPersistence(faulting, {
      contentVersion: CONTENT_VERSION,
      now: () => new Date('2026-08-31T00:00:10.000Z'),
    }).saveCareer(third);
    expect(interrupted).toEqual({
      ok: false,
      reason: 'career_save.storage_error',
      stage: 'write_session',
    });
    const recoveredRejectedTransaction = await persistence.loadCareer();
    expect(recoveredRejectedTransaction).toEqual(
      expect.objectContaining({
        ok: true,
        source: 'snapshot',
        career: next,
      }),
    );
    expect((await persistence.saveCareer(next)).ok).toBe(true);
  });

  it('keeps the prior career when an atomic replacement transaction fails', async () => {
    const memory = new MemoryStorageAdapter();
    const firstCareer = withRevision(createTestCareer('long-first-career'), 20);
    const secondCareer = nextTransition(createTestCareer('short-second-career'));
    const firstPersistence = new CareerPersistence(memory, {
      contentVersion: CONTENT_VERSION,
      now: () => new Date('2026-08-31T05:00:00.000Z'),
    });
    expect((await firstPersistence.saveCareer(firstCareer)).ok).toBe(true);

    const interruptedStorage = new FaultingStorageAdapter(memory);
    interruptedStorage.failCurrentPut = true;
    const replacement = await new CareerPersistence(interruptedStorage, {
      contentVersion: CONTENT_VERSION,
      now: () => new Date('2026-08-31T04:00:00.000Z'),
    }).replaceCurrentCareer(secondCareer);
    expect(replacement).toEqual({
      ok: false,
      reason: 'career_save.storage_error',
      stage: 'write_session',
    });

    const recoveredWithOldCurrent = await firstPersistence.loadCareer();
    expect(recoveredWithOldCurrent).toEqual(
      expect.objectContaining({
        ok: true,
        source: 'current',
        career: firstCareer,
      }),
    );
    if (recoveredWithOldCurrent.ok) {
      expect(recoveredWithOldCurrent.envelope.updatedAt).toBe('2026-08-31T05:00:00.000Z');
    }

    await memory.delete('currentCareer', CURRENT_CAREER_STORAGE_ID);
    const recoveredWithoutCurrent = await firstPersistence.loadCareer();
    expect(recoveredWithoutCurrent).toEqual(
      expect.objectContaining({
        ok: true,
        source: 'snapshot',
        career: firstCareer,
      }),
    );
    expect(firstCareer.revision).toBeGreaterThan(secondCareer.revision);
  });

  it('clamps clock rollback to a monotonic global save timestamp', async () => {
    const storage = new MemoryStorageAdapter();
    const initial = createTestCareer('clock-rollback');
    const firstPersistence = new CareerPersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: () => new Date('2026-08-31T10:00:00.000Z'),
    });
    const firstSave = await firstPersistence.saveCareer(initial);
    expect(firstSave.ok).toBe(true);
    if (!firstSave.ok) {
      return;
    }

    const rollbackPersistence = new CareerPersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: () => new Date('2026-08-31T09:00:00.000Z'),
    });
    const secondSave = await rollbackPersistence.saveCareer(nextTransition(initial));
    expect(secondSave.ok).toBe(true);
    if (!secondSave.ok) {
      return;
    }
    expect(secondSave.envelope.createdAt).toBe(firstSave.envelope.createdAt);
    expect(secondSave.envelope.updatedAt).toBe('2026-08-31T10:00:00.001Z');
    expect(validateCareerSaveEnvelope(secondSave.envelope, CONTENT_VERSION).ok).toBe(true);

    const thirdSave = await rollbackPersistence.saveCareer(advanceTransitions(initial, 2));
    expect(thirdSave).toEqual(
      expect.objectContaining({
        ok: true,
        envelope: expect.objectContaining({ updatedAt: '2026-08-31T10:00:00.002Z' }),
      }),
    );
  });

  it('uses deterministic envelope failure ordering and never accepts mismatched data', async () => {
    const persistence = new CareerPersistence(new MemoryStorageAdapter(), {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    const saved = await persistence.saveCareer(createTestCareer('envelope-validation'));
    expect(saved.ok).toBe(true);
    if (!saved.ok) {
      return;
    }
    const valid = saved.envelope;

    expect(
      validateCareerSaveEnvelope(
        { ...valid, saveVersion: 8, contentVersion: 'wrong', checksum: 'broken' },
        CONTENT_VERSION,
      ),
    ).toEqual({ ok: false, reason: 'envelope.unsupported_save_version' });
    expect(
      validateCareerSaveEnvelope({ ...valid, contentVersion: 'wrong' }, CONTENT_VERSION),
    ).toEqual({ ok: false, reason: 'envelope.incompatible_content' });
    expect(
      validateCareerSaveEnvelope({ ...valid, updatedAt: 'not-a-time' }, CONTENT_VERSION),
    ).toEqual({ ok: false, reason: 'envelope.invalid_timestamp' });
    expect(
      validateCareerSaveEnvelope({ ...valid, checksum: 'fnv1a32:00000000' }, CONTENT_VERSION),
    ).toEqual({ ok: false, reason: 'envelope.checksum_mismatch' });
    expect(validateCareerSaveEnvelope({ ...valid, extra: true }, CONTENT_VERSION)).toEqual({
      ok: false,
      reason: 'envelope.invalid_shape',
    });

    const unsupportedCareer = mutableEnvelope(valid) as unknown as SaveEnvelope<{
      career: { schemaVersion: number };
    }>;
    unsupportedCareer.payload.career.schemaVersion = 8;
    expect(validateCareerSaveEnvelope(resign(unsupportedCareer), CONTENT_VERSION)).toEqual({
      ok: false,
      reason: 'envelope.unsupported_career_version',
    });

    const invalidCareer = mutableEnvelope(valid);
    const mutablePayload = invalidCareer.payload as unknown as {
      career: { player: { state: { body: number } } };
    };
    mutablePayload.career.player.state.body = 101;
    expect(validateCareerSaveEnvelope(resign(invalidCareer), CONTENT_VERSION)).toEqual({
      ok: false,
      reason: 'envelope.invalid_career',
    });
  });

  it('captures accessor-backed envelopes exactly once before checksum and payload validation', async () => {
    const persistence = new CareerPersistence(new MemoryStorageAdapter(), {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    const saved = await persistence.saveCareer(createTestCareer('envelope-accessor'));
    expect(saved.ok).toBe(true);
    if (!saved.ok) {
      return;
    }

    const accessorEnvelope = { ...saved.envelope } as Record<string, unknown>;
    let payloadReads = 0;
    Object.defineProperty(accessorEnvelope, 'payload', {
      enumerable: true,
      get: () => {
        payloadReads += 1;
        return payloadReads === 1 ? saved.envelope.payload : { schemaVersion: 99 };
      },
    });
    expect(validateCareerSaveEnvelope(accessorEnvelope, CONTENT_VERSION).ok).toBe(true);
    expect(payloadReads).toBe(1);
  });

  it('keeps exactly thirty newest snapshots', async () => {
    const storage = new MemoryStorageAdapter();
    const persistence = new CareerPersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    const career = createTestCareer('retention');
    let lastResult;
    for (let index = 0; index <= CAREER_SNAPSHOT_RETENTION; index += 1) {
      lastResult = await persistence.saveCareer(withRevision(career, index));
      expect(lastResult.ok).toBe(true);
    }

    const snapshots = await storage.list('autosaveSnapshots');
    expect(snapshots).toHaveLength(CAREER_SNAPSHOT_RETENTION);
    expect(lastResult).toEqual(expect.objectContaining({ ok: true, prunedSnapshotCount: 1 }));
    const revisions = snapshots
      .map(({ value }) => (value as SaveEnvelope<CareerSession>).payload.career.revision)
      .sort((left, right) => left - right);
    expect(revisions[0]).toBe(1);
    expect(revisions.at(-1)).toBe(CAREER_SNAPSHOT_RETENTION);
  });

  it('deletes corrupt snapshots before retention and preserves protected future snapshots outside the limit', async () => {
    const storage = new MemoryStorageAdapter();
    const persistence = new CareerPersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    const career = createTestCareer('classified-retention');
    const first = await persistence.saveCareer(career);
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    await storage.put('autosaveSnapshots', 'corrupt-future-time', {
      ...first.envelope,
      updatedAt: '2099-01-01T00:00:00.000Z',
    });
    await storage.put('autosaveSnapshots', 'protected-future-content', {
      ...first.envelope,
      contentVersion: 'future-content',
    });

    for (let index = 0; index < CAREER_SNAPSHOT_RETENTION; index += 1) {
      expect((await persistence.saveCareer(withRevision(career, index + 1))).ok).toBe(true);
    }

    const entries = await storage.list('autosaveSnapshots');
    expect(entries.some(({ id }) => id === 'corrupt-future-time')).toBe(false);
    expect(entries.some(({ id }) => id === 'protected-future-content')).toBe(true);
    const compatibleValid = entries.filter(
      ({ value }) => validateCareerSaveEnvelope(value, CONTENT_VERSION).ok,
    );
    expect(compatibleValid).toHaveLength(CAREER_SNAPSHOT_RETENTION);
    expect(entries).toHaveLength(CAREER_SNAPSHOT_RETENTION + 1);
  });

  it('serializes concurrent saves and rejects stale or conflicting revisions', async () => {
    const persistence = new CareerPersistence(new MemoryStorageAdapter(), {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    const revisionZero = createTestCareer('save-order');
    const revisionOne = nextTransition(revisionZero);
    const revisionTwo = nextTransition(revisionOne);
    const concurrent = await Promise.all([
      persistence.saveCareer(revisionZero),
      persistence.saveCareer(revisionOne),
      persistence.saveCareer(revisionTwo),
    ]);
    expect(concurrent.every(({ ok }) => ok)).toBe(true);
    const loaded = await persistence.loadCareer();
    expect(loaded).toEqual(expect.objectContaining({ ok: true, career: revisionTwo }));

    expect(await persistence.saveCareer(revisionOne)).toEqual({
      ok: false,
      reason: 'career_save.stale_revision',
    });
    const conflicting = structuredClone(revisionTwo) as {
      player: { displayName: string };
    } & CareerRun;
    conflicting.player.displayName = '다른 Player';
    expect(await persistence.saveCareer(conflicting)).toEqual({
      ok: false,
      reason: 'career_save.conflicting_revision',
    });
  });

  it('serializes separate persistence instances against the same storage lock', async () => {
    const storage = new MemoryStorageAdapter();
    const initial = createTestCareer('cross-instance-lock');
    const setup = new CareerPersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    expect((await setup.saveCareer(initial)).ok).toBe(true);

    const firstBranch = expectTransition(
      commitHistoricalPreProgramWeeklyActionPlan(initial, PLAN, AVAILABLE_ACTIONS),
    );
    const secondPlan = ['action_speed_work', 'action_film_study', 'action_recovery'] as const;
    const secondBranch = expectTransition(
      commitHistoricalPreProgramWeeklyActionPlan(initial, secondPlan, AVAILABLE_ACTIONS),
    );
    const firstInstance = new CareerPersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: () => new Date('2026-08-31T02:00:00.000Z'),
    });
    const secondInstance = new CareerPersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: () => new Date('2026-08-31T02:00:00.000Z'),
    });
    const results = await Promise.all([
      firstInstance.saveCareer(firstBranch),
      secondInstance.saveCareer(secondBranch),
    ]);

    expect(results.filter(({ ok }) => ok)).toHaveLength(1);
    expect(results).toContainEqual({
      ok: false,
      reason: 'career_save.conflicting_revision',
    });
    const loaded = await setup.loadCareer();
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect([firstBranch, secondBranch]).toContainEqual(loaded.career);
    }
  });

  it('protects future/content-incompatible current data unless replacement is explicit', async () => {
    for (const protectedEnvelope of [
      (valid: SaveEnvelope<CareerSession>) => ({ ...valid, saveVersion: 8 }),
      (valid: SaveEnvelope<CareerSession>) => ({ ...valid, contentVersion: 'future-content' }),
      (valid: SaveEnvelope<CareerSession>) => {
        const futureCareer = mutableEnvelope(valid) as unknown as SaveEnvelope<{
          career: { schemaVersion: number };
        }>;
        futureCareer.payload.career.schemaVersion = 8;
        return resign(futureCareer);
      },
    ]) {
      const storage = new MemoryStorageAdapter();
      const initial = createTestCareer('protected-current');
      const persistence = new CareerPersistence(storage, {
        contentVersion: CONTENT_VERSION,
        now: advancingClock(),
      });
      const saved = await persistence.saveCareer(initial);
      expect(saved.ok).toBe(true);
      if (!saved.ok) {
        continue;
      }
      await storage.put(
        'currentCareer',
        CURRENT_CAREER_STORAGE_ID,
        protectedEnvelope(saved.envelope),
      );
      const next = nextTransition(initial);
      expect(await persistence.saveCareer(next)).toEqual({
        ok: false,
        reason: 'career_save.protected_existing_save',
      });
      expect((await persistence.replaceCurrentCareer(next)).ok).toBe(true);
      expect((await persistence.loadCareer()).ok).toBe(true);
    }
  });

  it('reports storage stages, retains recoverable snapshots, and degrades reads explicitly', async () => {
    const memory = new MemoryStorageAdapter();
    const first = createTestCareer('storage-failures');
    const second = nextTransition(first);
    const basePersistence = new CareerPersistence(memory, {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    expect((await basePersistence.saveCareer(first)).ok).toBe(true);

    const snapshotFailure = new FaultingStorageAdapter(memory);
    snapshotFailure.failSnapshotPut = true;
    expect(
      await new CareerPersistence(snapshotFailure, {
        contentVersion: CONTENT_VERSION,
        now: advancingClock(),
      }).saveCareer(second),
    ).toEqual({
      ok: false,
      reason: 'career_save.storage_error',
      stage: 'write_session',
    });

    await memory.put('autosaveSnapshots', 'corrupt-retention-entry', { broken: true });
    const retentionFailure = new FaultingStorageAdapter(memory);
    retentionFailure.failDelete = true;
    const retained = await new CareerPersistence(retentionFailure, {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(Date.parse('2026-08-31T01:00:00.000Z')),
    }).saveCareer(second);
    expect(retained).toEqual(expect.objectContaining({ ok: true, retentionWarning: true }));

    const currentUnavailable = new FaultingStorageAdapter(memory);
    currentUnavailable.failCurrentGet = true;
    const snapshotLoad = await new CareerPersistence(currentUnavailable, {
      contentVersion: CONTENT_VERSION,
    }).loadCareer();
    expect(snapshotLoad).toEqual(
      expect.objectContaining({
        ok: true,
        source: 'snapshot',
        warnings: ['career_load.current_unavailable'],
      }),
    );

    const snapshotsUnavailable = new FaultingStorageAdapter(memory);
    snapshotsUnavailable.failSnapshotList = true;
    const currentLoad = await new CareerPersistence(snapshotsUnavailable, {
      contentVersion: CONTENT_VERSION,
    }).loadCareer();
    expect(currentLoad).toEqual(
      expect.objectContaining({
        ok: true,
        source: 'current',
        warnings: ['career_load.snapshots_unavailable'],
      }),
    );
  });

  it('distinguishes empty storage from invalid-only storage and rejects invalid saves', async () => {
    const storage = new MemoryStorageAdapter();
    const persistence = new CareerPersistence(storage, { contentVersion: CONTENT_VERSION });
    expect(await persistence.loadCareer()).toEqual({
      ok: false,
      reason: 'career_load.not_found',
      skippedEntries: [],
      warnings: [],
    });

    await storage.put('currentCareer', CURRENT_CAREER_STORAGE_ID, { saveVersion: 99 });
    expect(await persistence.loadCareer()).toEqual(
      expect.objectContaining({
        ok: false,
        reason: 'career_load.no_valid_save',
        skippedEntries: [
          {
            id: CURRENT_CAREER_STORAGE_ID,
            store: 'currentCareer',
            reason: 'envelope.invalid_shape',
          },
        ],
      }),
    );

    const invalid = structuredClone(createTestCareer('invalid-save')) as {
      player: { state: { body: number } };
    } & CareerRun;
    invalid.player.state.body = 101;
    expect(await persistence.saveCareer(invalid)).toEqual({
      ok: false,
      reason: 'career_save.invalid_career',
    });
    expect(await storage.list('autosaveSnapshots')).toHaveLength(0);
  });

  it('returns a stable failure when the injected clock throws or is invalid', async () => {
    const career = createTestCareer('clock-failure');
    const throwingClock = new CareerPersistence(new MemoryStorageAdapter(), {
      contentVersion: CONTENT_VERSION,
      now: () => {
        throw new Error('clock failed');
      },
    });
    expect(await throwingClock.saveCareer(career)).toEqual({
      ok: false,
      reason: 'career_save.invalid_clock',
    });

    const invalidClock = new CareerPersistence(new MemoryStorageAdapter(), {
      contentVersion: CONTENT_VERSION,
      now: () => new Date(Number.NaN),
    });
    expect(await invalidClock.saveCareer(career)).toEqual({
      ok: false,
      reason: 'career_save.invalid_clock',
    });
  });
});

describe('active aggregate and completion persistence', () => {
  it('saves and reloads an active career/world session without reconstructing the world', async () => {
    const pending = createCareerSession(committedPlanningCareer('aggregate-session-save'));
    const bootstrapped = bootstrapShippedSeason(pending);
    if (!bootstrapped.ok) throw new Error(bootstrapped.reason);
    const storage = new MemoryStorageAdapter();
    const persistence = new CareerPersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: () => new Date('2026-09-01T03:00:00.000Z'),
    });
    const saved = await persistence.replaceCurrentSession(bootstrapped.session);
    expect(saved.ok).toBe(true);
    const loaded = await persistence.loadCareer();
    expect(loaded).toEqual(
      expect.objectContaining({ ok: true, session: bootstrapped.session, recovered: false }),
    );
  });

  it('round-trips the exact transferred season-two session through IndexedDB', async () => {
    const fixture = createSecondSeasonFixture('season-two-indexeddb', 'TRANSFER');
    const databaseName = 'project-saturday-season-two-persistence';
    const storage = new IndexedDbStorageAdapter(databaseName);
    try {
      const persistence = new CareerPersistence(storage, {
        contentVersion: CONTENT_VERSION,
        now: () => new Date('2026-09-01T03:05:00.000Z'),
      });
      const saved = await persistence.replaceCurrentSession(fixture.nextSeasonSession);
      expect(saved).toEqual(expect.objectContaining({ ok: true }));
      const loaded = await persistence.loadCareer();
      expect(loaded).toEqual(
        expect.objectContaining({
          ok: true,
          recovered: false,
          session: fixture.nextSeasonSession,
          source: 'current',
        }),
      );
      expect(fixture.nextSeasonSession.world.completedSeasonHistory?.[0]?.calendar).toEqual(
        fixture.decisionSession.world.calendar,
      );
      expect(fixture.nextSeasonSession.career.programId).not.toBe(
        fixture.nextSeasonSession.career.offFieldCareerState.offseason.status === 'DECIDED'
          ? fixture.nextSeasonSession.career.offFieldCareerState.offseason.lastDecision
              .previousProgramId
          : null,
      );
    } finally {
      await storage.close();
      await deleteDB(databaseName);
    }
  });

  it('persists a world-only session transition without misclassifying it as a career conflict', async () => {
    const pending = createCareerSession(committedPlanningCareer('aggregate-world-revision'));
    const bootstrapped = bootstrapShippedSeason(pending);
    if (!bootstrapped.ok) throw new Error(bootstrapped.reason);
    const worldAdvanced = {
      ...bootstrapped.session,
      world: {
        ...bootstrapped.session.world,
        revision: bootstrapped.session.world.revision + 1,
      },
    } satisfies CareerSession;
    const storage = new MemoryStorageAdapter();
    const persistence = new CareerPersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });

    expect((await persistence.replaceCurrentSession(bootstrapped.session)).ok).toBe(true);
    expect((await persistence.saveSession(worldAdvanced)).ok).toBe(true);
    expect(await persistence.loadCareer()).toEqual(
      expect.objectContaining({ ok: true, session: worldAdvanced, recovered: false }),
    );
    expect(await persistence.saveSession(bootstrapped.session)).toEqual({
      ok: false,
      reason: 'career_save.stale_revision',
    });
  });

  it('rejects a non-complete pair before issuing the cross-store transaction', async () => {
    const pending = createCareerSession(committedPlanningCareer('completion-invalid-state'));
    const storage = new MemoryStorageAdapter();
    const persistence = new CareerCompletionPersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: () => new Date('2026-09-01T03:10:00.000Z'),
    });
    expect(await persistence.saveCompletedCareer(pending, createEmptyMetaProfile())).toEqual({
      ok: false,
      reason: 'career_completion_save.invalid_state',
    });
    expect(await storage.get('currentCareer', CURRENT_CAREER_STORAGE_ID)).toBeUndefined();
    expect(await storage.get('profile', META_PROFILE_STORAGE_ID)).toBeUndefined();
    expect(await storage.list('autosaveSnapshots')).toEqual([]);
  });

  it('publishes the final session, recovery snapshot, and alumni meta atomically', async () => {
    const fixture = createCompletedSeasonFixture();
    const storage = new MemoryStorageAdapter();
    const clock = advancingClock(Date.parse('2026-09-01T03:20:00.000Z'));
    const careerPersistence = new CareerPersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: clock,
    });
    expect((await careerPersistence.replaceCurrentSession(fixture.reviewSession)).ok).toBe(true);
    const completionPersistence = new CareerCompletionPersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: clock,
    });
    const saved = await completionPersistence.saveCompletedCareer(
      fixture.completedSession,
      fixture.completedMeta,
    );
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(validateCareerSaveEnvelope(saved.careerEnvelope, CONTENT_VERSION)).toEqual({
      ok: true,
      envelope: saved.careerEnvelope,
    });
    expect(validateMetaSaveEnvelope(saved.metaEnvelope, CONTENT_VERSION)).toEqual({
      ok: true,
      envelope: saved.metaEnvelope,
    });
    expect(await storage.get('currentCareer', CURRENT_CAREER_STORAGE_ID)).toEqual(
      saved.careerEnvelope,
    );
    expect(await storage.get('profile', META_PROFILE_STORAGE_ID)).toEqual(saved.metaEnvelope);
    expect(await storage.get('autosaveSnapshots', saved.snapshotId)).toEqual(saved.careerEnvelope);
  });

  it('leaves both prior records untouched when the completion transaction fails', async () => {
    const fixture = createCompletedSeasonFixture();
    const memory = new MemoryStorageAdapter();
    const clock = advancingClock(Date.parse('2026-09-01T03:30:00.000Z'));
    const careerPersistence = new CareerPersistence(memory, {
      contentVersion: CONTENT_VERSION,
      now: clock,
    });
    expect((await careerPersistence.replaceCurrentSession(fixture.reviewSession)).ok).toBe(true);
    const currentBefore = await memory.get('currentCareer', CURRENT_CAREER_STORAGE_ID);
    const snapshotsBefore = await memory.list('autosaveSnapshots');
    const faulting = new FaultingStorageAdapter(memory);
    faulting.failCurrentPut = true;
    const completionPersistence = new CareerCompletionPersistence(faulting, {
      contentVersion: CONTENT_VERSION,
      now: clock,
    });
    expect(
      await completionPersistence.saveCompletedCareer(
        fixture.completedSession,
        fixture.completedMeta,
      ),
    ).toEqual({ ok: false, reason: 'career_completion_save.storage_error' });
    expect(await memory.get('currentCareer', CURRENT_CAREER_STORAGE_ID)).toEqual(currentBefore);
    expect(await memory.get('profile', META_PROFILE_STORAGE_ID)).toBeUndefined();
    expect(await memory.list('autosaveSnapshots')).toEqual(snapshotsBefore);
  });
});

describe('meta profile persistence', () => {
  it('returns a frozen default without eager writes, then saves and reloads a checksummed profile', async () => {
    const storage = new MemoryStorageAdapter();
    const persistence = new MetaProfilePersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: () => new Date('2026-09-01T00:00:00.000Z'),
    });
    const initial = await persistence.loadMetaProfile();
    expect(initial).toEqual({
      ok: true,
      meta: createEmptyMetaProfile(),
      envelope: null,
      source: 'default',
    });
    expect(await storage.get('profile', META_PROFILE_STORAGE_ID)).toBeUndefined();
    if (!initial.ok) return;

    const saved = await persistence.saveMetaProfile(initial.meta);
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.envelope.saveVersion).toBe(META_PROFILE_SAVE_VERSION);
    expect(validateMetaSaveEnvelope(saved.envelope, CONTENT_VERSION)).toEqual({
      ok: true,
      envelope: saved.envelope,
    });
    expect(saved.envelope.checksum).toBe(
      computeSaveChecksum({
        saveVersion: saved.envelope.saveVersion,
        contentVersion: saved.envelope.contentVersion,
        createdAt: saved.envelope.createdAt,
        updatedAt: saved.envelope.updatedAt,
        payload: saved.envelope.payload,
      }),
    );
    const loaded = await persistence.loadMetaProfile();
    expect(loaded).toEqual({
      ok: true,
      meta: initial.meta,
      envelope: saved.envelope,
      source: 'stored',
    });
    if (loaded.ok) expect(Object.isFrozen(loaded.meta)).toBe(true);
  });

  it('enforces revision conflicts, caller isolation, and future-version protection', async () => {
    const storage = new MemoryStorageAdapter();
    const persistence = new MetaProfilePersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(Date.parse('2026-09-01T01:00:00.000Z')),
    });
    expect((await persistence.saveMetaProfile(createEmptyMetaProfile())).ok).toBe(true);
    const next = {
      ...createEmptyMetaProfile(),
      revision: 1,
      unlockedOptionIds: ['unlock_alumni_history'],
    } satisfies MetaProfileV1;
    const callerOwned = structuredClone(next) as {
      revision: number;
      unlockedOptionIds: string[];
    } & MetaProfileV1;
    const pending = persistence.saveMetaProfile(callerOwned);
    callerOwned.unlockedOptionIds[0] = 'unlock_mutated_after_call';
    const saved = await pending;
    expect(saved.ok).toBe(true);
    const loaded = await persistence.loadMetaProfile();
    expect(loaded).toEqual(expect.objectContaining({ ok: true, meta: next }));
    expect(await persistence.saveMetaProfile(createEmptyMetaProfile())).toEqual({
      ok: false,
      reason: 'meta_save.stale_revision',
    });
    expect(
      await persistence.saveMetaProfile({
        ...next,
        unlockedOptionIds: ['unlock_conflict'],
      }),
    ).toEqual({ ok: false, reason: 'meta_save.conflicting_revision' });

    if (!saved.ok) return;
    await storage.put('profile', META_PROFILE_STORAGE_ID, {
      ...saved.envelope,
      saveVersion: 2,
    });
    expect(await persistence.loadMetaProfile()).toEqual({
      ok: false,
      reason: 'meta_load.protected_save',
    });
    expect(
      await persistence.saveMetaProfile({
        ...next,
        revision: 2,
      }),
    ).toEqual({ ok: false, reason: 'meta_save.protected_existing_save' });
  });
});
