import { cloneSerializable, deepFreeze } from './immutable.js';
import { parseCareerRunV7, type CareerParseFailure } from './persistence.js';
import type { CareerRunV7 } from './types.js';
import {
  parseWrTacticalGameV1,
  type WrTacticalGameV1,
  type WrTacticalMechanicsV1,
} from '../games/tactical-wr-game-v1.js';
import { matchesExactWrEvidence, type WrResolvedSnapBoundaryV1 } from '../games/transitions.js';
import { utf8ByteLength } from './utf8.js';
import {
  parseWrTwoSeasonReviewV1,
  type WrTwoSeasonReviewV1,
} from '../season/wr-two-season-review.js';
import { createWrTwoSeasonAlumniV1 } from '../season/wr-two-season-alumni.js';

export const CAREER_SCHEMA_VERSION_V8 = 8 as const;

export type WrTacticalCareerPhaseV8 =
  | (Extract<CareerRunV7['phase'], { readonly type: 'GAME_PREVIEW' | 'KEY_SNAP' | 'POST_GAME' }> & {
      readonly rulesVersion: 'tactical_game_v1';
    })
  | {
      readonly type: 'SNAP_RESOLVED';
      readonly rulesVersion: 'tactical_game_v1';
      readonly result: WrResolvedSnapBoundaryV1;
    };

/** Unactivated WR boundary. Current public CareerRun remains v7. */
export interface CareerRunV8 extends Omit<CareerRunV7, 'schemaVersion' | 'phase'> {
  readonly schemaVersion: typeof CAREER_SCHEMA_VERSION_V8;
  readonly phase:
    | CareerRunV7['phase']
    | WrTacticalCareerPhaseV8
    | (Extract<CareerRunV7['phase'], { readonly type: 'SEASON_REVIEW' }> & {
        readonly rulesVersion: 'wr_two_season_review_v1';
      })
    | (Extract<CareerRunV7['phase'], { readonly type: 'CAREER_COMPLETE' }> & {
        readonly rulesVersion: 'wr_two_season_complete_v1';
      });
  readonly tacticalGame?: WrTacticalGameV1;
  readonly terminalReview?: WrTwoSeasonReviewV1;
  readonly terminalCompletion?: {
    readonly model: 'wr_two_season_complete_v1';
    readonly contentVersion: number;
    readonly alumniId: `alumni_${string}`;
  };
}

export function projectWrTwoSeasonCareerV8(
  value: unknown,
  completionContentVersion?: number,
): CareerRunV8 | undefined {
  const review = parseWrTwoSeasonReviewV1(value);
  if (review === null) return undefined;
  const summary = review.seasons[1].summary;
  const alumni =
    completionContentVersion === undefined
      ? null
      : createWrTwoSeasonAlumniV1(review, completionContentVersion);
  if (completionContentVersion !== undefined && alumni === null) return undefined;
  const career: CareerRunV8 = {
    ...review.source.career,
    schemaVersion: 8,
    revision: review.source.career.revision + (alumni === null ? 1 : 2),
    phase:
      alumni === null
        ? {
            type: 'SEASON_REVIEW',
            rulesVersion: 'wr_two_season_review_v1',
            seasonId: summary.seasonId,
            outcomeId: summary.outcomeId,
          }
        : {
            type: 'CAREER_COMPLETE',
            rulesVersion: 'wr_two_season_complete_v1',
            seasonId: summary.seasonId,
            outcomeId: summary.outcomeId,
            alumniId: alumni.alumniId,
          },
    terminalReview: review,
    ...(alumni === null
      ? {}
      : {
          terminalCompletion: {
            model: 'wr_two_season_complete_v1' as const,
            contentVersion: alumni.contentVersion,
            alumniId: alumni.alumniId,
          },
        }),
  };
  return utf8ByteLength(JSON.stringify(career)) < 1_000_000 ? deepFreeze(career) : undefined;
}

export type ParseCareerRunV8Result =
  { readonly ok: true; readonly career: CareerRunV8 } | CareerParseFailure;

function failure(reason: CareerParseFailure['reason']): CareerParseFailure {
  return deepFreeze({ ok: false, reason, issues: [] });
}

/** Exact v7 input only; detaches ownership and changes no game evidence or RNG. */
export function migrateCareerRunV7ToV8(career: CareerRunV7): CareerRunV8 {
  const parsed = parseCareerRunV7(career);
  if (!parsed.ok) throw new TypeError('career_migration.invalid_v7');
  return deepFreeze({ ...parsed.career, schemaVersion: CAREER_SCHEMA_VERSION_V8 });
}

function projectCurrentGame(game: WrTacticalGameV1): CareerRunV8 | undefined {
  const base = {
    ...game.source,
    schemaVersion: CAREER_SCHEMA_VERSION_V8,
    revision: game.revision,
    tacticalGame: game,
  };
  const rulesVersion = 'tactical_game_v1' as const;
  let career: CareerRunV8;
  switch (game.boundary.type) {
    case 'GAME_PREVIEW':
      if (game.source.phase.type !== 'GAME_PREVIEW') return undefined;
      career = { ...base, phase: { ...game.source.phase, rulesVersion } };
      break;
    case 'KEY_SNAP':
      career = {
        ...base,
        rng: game.boundary.rng,
        phase: {
          type: 'KEY_SNAP',
          rulesVersion,
          game: game.boundary.game,
          pendingSnap: game.boundary.pendingSnap,
        },
      };
      break;
    case 'SNAP_RESOLVED':
      career = {
        ...base,
        rng: game.boundary.result.nextRng,
        phase: { type: 'SNAP_RESOLVED', rulesVersion, result: game.boundary.result },
      };
      break;
    case 'POST_GAME':
      career = {
        ...base,
        ...game.boundary.completion,
        rng: game.boundary.rng,
        phase: { ...game.boundary.completion.phase, rulesVersion },
      };
      break;
  }
  // The final envelope still has its own byte guard; do not publish a domain
  // object already too large before envelope/checksum overhead.
  return utf8ByteLength(JSON.stringify(career)) < 1_000_000 ? deepFreeze(career) : undefined;
}

/** Explicit source-replayed current projection; never called by neutral migration. */
export function projectWrTacticalCareerV8(
  value: unknown,
  mechanics: WrTacticalMechanicsV1,
): CareerRunV8 | undefined {
  const game = parseWrTacticalGameV1(value, mechanics);
  return game === undefined ? undefined : projectCurrentGame(game);
}

/** Exact v8 reader: literal neutral migration or complete source-replayed current evidence. */
export function parseCareerRunV8(
  value: unknown,
  mechanics?: WrTacticalMechanicsV1,
): ParseCareerRunV8Result {
  let decoded = value;
  if (typeof value === 'string') {
    try {
      decoded = JSON.parse(value) as unknown;
    } catch {
      return failure('career_parse.invalid_json');
    }
  }
  let snapshot: unknown;
  try {
    snapshot = cloneSerializable(decoded);
  } catch {
    return failure('career_parse.invalid_career');
  }
  if (typeof snapshot !== 'object' || snapshot === null || Array.isArray(snapshot))
    return failure('career_parse.invalid_career');
  const record = snapshot as Readonly<Record<string, unknown>>;
  if (record['schemaVersion'] !== CAREER_SCHEMA_VERSION_V8)
    return failure(
      typeof record['schemaVersion'] === 'number'
        ? 'career_parse.unsupported_version'
        : 'career_parse.invalid_career',
    );
  if (Object.hasOwn(record, 'terminalReview')) {
    let contentVersion: number | undefined;
    if (Object.hasOwn(record, 'terminalCompletion')) {
      const completion = record['terminalCompletion'];
      if (
        typeof completion !== 'object' ||
        completion === null ||
        !('contentVersion' in completion) ||
        typeof completion.contentVersion !== 'number'
      )
        return failure('career_parse.invalid_career');
      contentVersion = completion.contentVersion;
    }
    const expected = projectWrTwoSeasonCareerV8(record['terminalReview'], contentVersion);
    return expected !== undefined && matchesExactWrEvidence(record, expected)
      ? deepFreeze({ ok: true, career: expected })
      : failure('career_parse.invalid_career');
  }
  if (Object.hasOwn(record, 'tacticalGame')) {
    if (mechanics === undefined) return failure('career_parse.invalid_career');
    const expected = projectWrTacticalCareerV8(record['tacticalGame'], mechanics);
    return expected !== undefined && matchesExactWrEvidence(record, expected)
      ? deepFreeze({ ok: true, career: expected })
      : failure('career_parse.invalid_career');
  }
  // Preserve every neutral field for the exact historical validator. Current
  // phase tags left without their required record fail here; no fields are stripped.
  const parsed = parseCareerRunV7({ ...record, schemaVersion: 7 });
  return parsed.ok
    ? deepFreeze({
        ok: true,
        career: { ...parsed.career, schemaVersion: CAREER_SCHEMA_VERSION_V8 },
      })
    : parsed;
}
