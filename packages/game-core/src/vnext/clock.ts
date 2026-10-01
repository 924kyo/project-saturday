import { createRng, nextUint32, type RngSeed } from '../random/rng.js';
import type { VNextGameState } from './types.js';

/**
 * M12 (playtest report): four-snap games always read Q1 3:00 → Q2 6:00 → Q3 9:00 → Q4 12:00, because
 * the kernels space key snaps evenly. VNext re-times each pending snap inside its even slot from a
 * named stream (`:vnext:clock:<season>:<week>:<snap>`), so a game reads like a particular game.
 *
 * The clock is presentation-relevant context only: no kernel rule reads it and the pending-context
 * matcher ignores it, so in-progress saves stay valid. The kernels' own RNG is untouched.
 */
export const VNEXT_CLOCK_TUNING = Object.freeze({
  /** A snap moves within ± this share of the even spacing (keeps snaps in order). */
  jitterSharePermille: 440,
  /** Never closer than this to kickoff or the final whistle (seconds). */
  edgeSeconds: 45,
});

interface PendingWithContext {
  readonly snapIndex: number;
  readonly tacticalContext?: {
    readonly clock: { readonly period: 1 | 2 | 3 | 4; readonly secondsRemaining: number };
  } & Record<string, unknown>;
}

/** Elapsed game seconds for key snap `index` of `count`, re-timed from `seed`. */
export function snapElapsedSecondsVNext(seed: string, index: number, count: number): number {
  const spacing = 3600 / (count + 1);
  const base = Math.floor(spacing * (index + 1));
  const span = Math.floor((spacing * VNEXT_CLOCK_TUNING.jitterSharePermille) / 1000);
  const draw = nextUint32(createRng(seed)).value % (2 * span + 1);
  const edge = VNEXT_CLOCK_TUNING.edgeSeconds;
  return Math.max(edge, Math.min(3600 - edge, base + draw - span));
}

export function clockFromElapsedVNext(elapsed: number): {
  readonly period: 1 | 2 | 3 | 4;
  readonly secondsRemaining: number;
} {
  const period = Math.min(4, Math.floor(elapsed / 900) + 1) as 1 | 2 | 3 | 4;
  const remaining = 900 - (elapsed - (period - 1) * 900);
  return { period, secondsRemaining: Math.max(1, Math.min(900, remaining)) };
}

/** Re-times the engine's pending snap (no-op when there is none). */
export function withVariedClockVNext(
  engine: VNextGameState,
  seed: RngSeed,
  seasonIndex: number,
  weekIndex: number,
): VNextGameState {
  const game = engine.game as unknown as {
    readonly type: string;
    readonly pendingSnap?: PendingWithContext;
    readonly input?: { readonly opportunityCount?: number };
  };
  const pending = game.pendingSnap;
  const context = pending?.tacticalContext;
  const count = game.input?.opportunityCount;
  if (game.type !== 'ACTIVE' || pending === undefined || context === undefined) return engine;
  if (typeof count !== 'number' || count < 1) return engine;
  const elapsed = snapElapsedSecondsVNext(
    `${String(seed)}:vnext:clock:${seasonIndex}:${weekIndex}:${pending.snapIndex}`,
    pending.snapIndex,
    count,
  );
  return {
    ...engine,
    game: {
      ...engine.game,
      pendingSnap: {
        ...pending,
        tacticalContext: { ...context, clock: clockFromElapsedVNext(elapsed) },
      },
    },
  } as unknown as VNextGameState;
}
