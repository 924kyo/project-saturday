import {
  createShippedPositionAlphaSession,
  defaultWrAppearance,
  offenseStyleMechanicsDefinitions,
  positionAlphaContent,
  programMechanicsDefinitions,
  recruitingMechanicsConfig,
  rosterNameMechanicsPool,
  rotationPolicyMechanicsDefinitions,
  worldAlphaContent,
} from '@project-saturday/game-content';
import { beginRecruiting, commitProgramChoice, type PositionId } from '@project-saturday/game-core';

import { createWrCareerFixture } from '../builders/wr-career.js';

export const M7_5_ROSTER_SEEDS = Object.freeze(
  Array.from({ length: 32 }, (_, index) => `m7-5-roster-${String(index + 1).padStart(3, '0')}`),
);

const POSITION_CASES = [
  ['position_qb', 'archetype_qb_field_general'],
  ['position_rb', 'archetype_rb_power_back'],
  ['position_cb', 'archetype_cb_press_man'],
] as const;

interface NamePair {
  readonly familyNameId: string;
  readonly givenNameId: string;
}

export interface RosterIdentitySample {
  readonly familyTokenMaximum: number;
  readonly fullNameIds: readonly string[];
  readonly givenTokenMaximum: number;
  readonly positionId: PositionId;
  readonly programId: string;
  readonly reproduction: string;
  readonly rngDrawCount: number;
  readonly seed: string;
}

export interface M7_5RosterIdentityReport {
  readonly reportId: 'm7_5_roster_identity_v1';
  readonly sampleCount: number;
  readonly seedCount: number;
  readonly positionCounts: Readonly<Record<PositionId, number>>;
  readonly givenNamePoolSize: number;
  readonly familyNamePoolSize: number;
  readonly duplicateFullNameRosterCount: number;
  readonly repeatedGivenTokenRosterCount: number;
  readonly repeatedFamilyTokenRosterCount: number;
  readonly maximumGivenTokenFrequency: number;
  readonly maximumFamilyTokenFrequency: number;
  readonly samples: readonly RosterIdentitySample[];
}

function maximumFrequency(values: readonly string[]): number {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Math.max(...counts.values());
}

function sample(
  seed: string,
  positionId: PositionId,
  programId: string,
  rngDrawCount: number,
  names: readonly NamePair[],
): RosterIdentitySample {
  const fullNameIds = names.map(
    ({ givenNameId, familyNameId }) => `${givenNameId}|${familyNameId}`,
  );
  return Object.freeze({
    familyTokenMaximum: maximumFrequency(names.map(({ familyNameId }) => familyNameId)),
    fullNameIds: Object.freeze(fullNameIds),
    givenTokenMaximum: maximumFrequency(names.map(({ givenNameId }) => givenNameId)),
    positionId,
    programId,
    reproduction: `seed=${JSON.stringify(seed)} position=${positionId} program=${programId}`,
    rngDrawCount,
    seed,
  });
}

function wrSample(seed: string, seedIndex: number): RosterIdentitySample {
  const created = createWrCareerFixture({ careerSeed: seed });
  const recruiting = beginRecruiting(
    created,
    recruitingMechanicsConfig,
    programMechanicsDefinitions,
    offenseStyleMechanicsDefinitions,
  );
  if (!recruiting.ok || recruiting.career.recruitingState.type !== 'CHOOSING') {
    throw new Error(`roster_report.wr_recruiting:${seed}`);
  }
  const offer = recruiting.career.recruitingState.offers[seedIndex % 5];
  if (offer === undefined) throw new Error(`roster_report.wr_offer:${seed}`);
  const committed = commitProgramChoice(
    recruiting.career,
    offer.programId,
    programMechanicsDefinitions,
    offenseStyleMechanicsDefinitions,
    rotationPolicyMechanicsDefinitions,
    rosterNameMechanicsPool,
  );
  if (!committed.ok || committed.career.programContext === null) {
    throw new Error(`roster_report.wr_commit:${seed}`);
  }
  return sample(
    seed,
    'position_wr',
    offer.programId,
    committed.career.rng.drawCount - recruiting.career.rng.drawCount,
    committed.career.programContext.competitors,
  );
}

function addedPositionSample(
  seed: string,
  seedIndex: number,
  positionCase: (typeof POSITION_CASES)[number],
): RosterIdentitySample {
  const [positionId, archetypeId] = positionCase;
  const program =
    worldAlphaContent.programProfiles[seedIndex % worldAlphaContent.programProfiles.length];
  if (program === undefined) throw new Error(`roster_report.program:${seed}`);
  const created = createShippedPositionAlphaSession({
    careerSeed: seed,
    programId: program.id,
    identity: {
      appearance: defaultWrAppearance,
      archetypeId,
      displayName: 'Roster Report Athlete',
      heightCm: 188,
      personalityTraitIds: ['personality_disciplined', 'personality_leader'],
      positionId,
      recruitingBackgroundId: 'background_late_bloomer',
      weightKg: 92,
    },
  });
  if (!created.ok) throw new Error(`roster_report.position_create:${seed}:${positionId}`);
  return sample(
    seed,
    positionId,
    program.id,
    created.session.careerRng.drawCount,
    created.session.room.competitors,
  );
}

export function runM7_5RosterIdentityReport(): M7_5RosterIdentityReport {
  const samples = M7_5_ROSTER_SEEDS.flatMap((seed, seedIndex) => [
    wrSample(seed, seedIndex),
    ...POSITION_CASES.map((positionCase) =>
      addedPositionSample(`${seed}-${positionCase[0]}`, seedIndex, positionCase),
    ),
  ]);
  // The M7.5 artifact covers the four positions that existed then; M8 positions are out of scope.
  const positionCounts = Object.fromEntries(
    positionAlphaContent.positions
      .filter(({ id }) => ['position_wr', 'position_qb', 'position_rb', 'position_cb'].includes(id))
      .map(({ id }) => [id, samples.filter(({ positionId }) => positionId === id).length]),
  ) as Readonly<Record<PositionId, number>>;
  return Object.freeze({
    reportId: 'm7_5_roster_identity_v1',
    sampleCount: samples.length,
    seedCount: M7_5_ROSTER_SEEDS.length,
    positionCounts,
    givenNamePoolSize: rosterNameMechanicsPool.givenNameIds.length,
    familyNamePoolSize: rosterNameMechanicsPool.familyNameIds.length,
    duplicateFullNameRosterCount: samples.filter(
      ({ fullNameIds }) => new Set(fullNameIds).size !== fullNameIds.length,
    ).length,
    repeatedGivenTokenRosterCount: samples.filter(({ givenTokenMaximum }) => givenTokenMaximum > 1)
      .length,
    repeatedFamilyTokenRosterCount: samples.filter(
      ({ familyTokenMaximum }) => familyTokenMaximum > 1,
    ).length,
    maximumGivenTokenFrequency: Math.max(
      ...samples.map(({ givenTokenMaximum }) => givenTokenMaximum),
    ),
    maximumFamilyTokenFrequency: Math.max(
      ...samples.map(({ familyTokenMaximum }) => familyTokenMaximum),
    ),
    samples: Object.freeze(samples),
  });
}

export function formatM7_5RosterIdentityReport(report: M7_5RosterIdentityReport): string {
  return JSON.stringify(report);
}
