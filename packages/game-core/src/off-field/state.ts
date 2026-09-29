import { deepFreeze } from '../player/immutable.js';
import type { OffFieldCareerStateV1 } from './types.js';

export function createPendingOffFieldCareerState(): OffFieldCareerStateV1 {
  return deepFreeze({
    model: 'off_field_v1',
    academics: {
      model: 'academic_v1',
      bootstrapStatus: 'PENDING',
      termIndex: 0,
      eligibilityStatus: 'PENDING',
      lastCheckpoint: null,
      checkpointHistory: [],
    },
    relationships: {
      model: 'relationships_v1',
      bootstrapStatus: 'PENDING',
      tracks: [],
      history: [],
    },
    nil: {
      model: 'nil_v1',
      fictionalFundsUsd: 0,
      pendingOffers: [],
      activeObligation: null,
      history: [],
    },
    offseason: {
      model: 'offseason_v1',
      status: 'NOT_STARTED',
      completedDecisionCount: 0,
      lastDecision: null,
    },
    programHistory: [],
  });
}
