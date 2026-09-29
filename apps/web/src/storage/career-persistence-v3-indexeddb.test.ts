import 'fake-indexeddb/auto';
import {
  beginRecruiting,
  parseCareerRunV2,
  type CareerRun,
  type CareerRunV2,
  type CareerSession,
} from '@project-saturday/game-core';
import { deleteDB } from 'idb';
import { afterEach, describe, expect, it } from 'vitest';

import { createTestCareer } from '../test/career-fixture';
import {
  offenseStyleMechanicsDefinitions,
  programMechanicsDefinitions,
  recruitingMechanicsConfig,
} from '@project-saturday/game-content/content';
import {
  CURRENT_CAREER_SAVE_VERSION,
  CURRENT_CAREER_STORAGE_ID,
  CareerPersistence,
  SHIPPED_CAREER_CONTENT_VERSION,
  computeSaveChecksum,
  type SaveChecksumFields,
} from './career-persistence';
import { IndexedDbStorageAdapter, type SaveEnvelope, type StorageAdapter } from './storage';

const adapters: StorageAdapter[] = [];
const databaseNames: string[] = [];

afterEach(async () => {
  await Promise.all(adapters.splice(0).map((adapter) => adapter.close()));
  await Promise.all(databaseNames.splice(0).map((name) => deleteDB(name)));
});

function v2Career(current: CareerRun): CareerRunV2 {
  const legacy = structuredClone(current) as unknown as {
    gameCareerState?: unknown;
    weeklyExperienceVersion?: unknown;
    seasonCareerState?: unknown;
    offFieldCareerState?: unknown;
    schemaVersion: number;
    recruitingState?: unknown;
    programContext?: unknown;
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
    throw new Error(parsed.reason);
  }
  return parsed.career;
}

function signedV2Envelope(career: CareerRunV2): SaveEnvelope<CareerRunV2> {
  const fields: SaveChecksumFields<CareerRunV2> = {
    saveVersion: 2,
    contentVersion: SHIPPED_CAREER_CONTENT_VERSION,
    createdAt: '2026-08-31T00:00:00.000Z',
    updatedAt: '2026-08-31T00:00:00.000Z',
    payload: career,
  };
  return { ...fields, checksum: computeSaveChecksum(fields) };
}

describe('schema-v4 persistence through native IndexedDB structured cloning', () => {
  it('loads a signed raw v2 save without rewriting it, then upgrades on the next command save', async () => {
    const databaseName = `project-saturday-v3-${databaseNames.length}`;
    databaseNames.push(databaseName);
    const storage = new IndexedDbStorageAdapter(databaseName);
    adapters.push(storage);
    await storage.initialize();

    const rawLegacy = signedV2Envelope(v2Career(createTestCareer('indexeddb-v2-upgrade')));
    await storage.put('currentCareer', CURRENT_CAREER_STORAGE_ID, rawLegacy);
    const persistence = new CareerPersistence(storage, {
      contentVersion: SHIPPED_CAREER_CONTENT_VERSION,
      now: () => new Date('2026-08-31T00:00:01.000Z'),
    });

    const loaded = await persistence.loadCareer();
    expect(loaded).toEqual(expect.objectContaining({ ok: true, source: 'current' }));
    if (!loaded.ok) {
      return;
    }
    expect(loaded.career.schemaVersion).toBe(7);
    expect(loaded.career.recruitingState).toEqual({ type: 'NOT_STARTED' });
    expect(await storage.get('currentCareer', CURRENT_CAREER_STORAGE_ID)).toEqual(rawLegacy);

    const transition = beginRecruiting(
      loaded.career,
      recruitingMechanicsConfig,
      programMechanicsDefinitions,
      offenseStyleMechanicsDefinitions,
    );
    expect(transition.ok).toBe(true);
    if (!transition.ok) {
      return;
    }
    expect((await persistence.saveCareer(transition.career)).ok).toBe(true);

    const upgraded = await storage.get<SaveEnvelope<CareerSession>>(
      'currentCareer',
      CURRENT_CAREER_STORAGE_ID,
    );
    expect(upgraded?.saveVersion).toBe(CURRENT_CAREER_SAVE_VERSION);
    expect(upgraded?.payload.career).toEqual(transition.career);
    expect(upgraded?.payload.world.calendar).toEqual({ type: 'PENDING' });
    expect(upgraded?.createdAt).toBe(rawLegacy.createdAt);
    expect((await persistence.loadCareer()).ok).toBe(true);
  });
});
