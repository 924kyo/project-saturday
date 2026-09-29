import { migrateCareerRunV2ToV3, type CareerRunV3 } from '../../src/index.js';

import { CAREER_RUN_V2_PHASE_FIXTURE_CASES } from './career-run-v2.js';

export interface CareerRunV3PhaseFixtureCase {
  readonly name: string;
  readonly career: CareerRunV3;
}

/**
 * Deterministic strict-v3 snapshots for every phase that shipped before M4.
 * They intentionally originate from the checked-in literal v2 snapshots so
 * the migration seam remains covered without duplicating large player data.
 */
export const CAREER_RUN_V3_PHASE_FIXTURE_CASES = Object.freeze(
  CAREER_RUN_V2_PHASE_FIXTURE_CASES.map(({ name, career }) =>
    Object.freeze({ name, career: migrateCareerRunV2ToV3(career) }),
  ),
) satisfies readonly CareerRunV3PhaseFixtureCase[];

export const CAREER_RUN_V3_PHASE_FIXTURES = Object.freeze(
  Object.fromEntries(
    CAREER_RUN_V3_PHASE_FIXTURE_CASES.map(({ name, career }) => [name, career]),
  ) as Readonly<Record<string, CareerRunV3>>,
);
