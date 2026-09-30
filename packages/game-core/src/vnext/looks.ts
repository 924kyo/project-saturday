import { createRng, nextUint32 } from '../random/rng.js';
import type {
  CareerVNext,
  CareerVNextMechanics,
  VNextGameState,
  VNextPositionId,
} from './types.js';

/**
 * Snap looks (M11): every Saturday decision hides one of several authored pictures of the same
 * situation. A look decides which technique wins, which tells the athlete can read and how the
 * opponents stand and move. The shipped kernels stay literal: VNext hands the owning kernel the
 * look's fits for the one snap it resolves, then restores the kernel's own pattern.
 *
 * Looks are derived, never saved: a named stream per season, week and slot picks them, so a saved
 * career replays the same look and no other stream moves.
 */

/** Board vocabulary shared by content validation and the renderer (semantic, never pixels). */
export const SNAP_LOOK_ACTORS = Object.freeze([
  'qb',
  'rb',
  'te',
  'wr1',
  'wr2',
  'slot',
  'lt',
  'lg',
  'c',
  'rg',
  'rt',
  'de_top',
  'de_bot',
  'dt1',
  'dt2',
  'mike',
  'will',
  'sam',
  'cb_top',
  'cb_bot',
  'nickel',
  'fs',
  'ss',
] as const);
export type SnapLookActor = (typeof SNAP_LOOK_ACTORS)[number];

export const SNAP_LOOK_STANCES = Object.freeze({
  shell: ['two_high', 'one_high', 'zero', 'robber'],
  corner: ['press', 'off', 'squat'],
  leverage: ['inside', 'outside', 'head_up'],
  nickel: ['apex', 'walked_up', 'inside'],
  backers: ['normal', 'shallow', 'mugged', 'deep'],
  edge: ['wide', 'tight'],
  front: ['even', 'loaded'],
  formation: ['spread', 'trips', 'tight', 'empty'],
  back: ['offset', 'pistol', 'wide', 'none'],
  split: ['wide', 'reduced'],
} as const);
export type SnapLookStanceKey = keyof typeof SNAP_LOOK_STANCES;
export type SnapLookStance = {
  readonly [K in SnapLookStanceKey]?: (typeof SNAP_LOOK_STANCES)[K][number];
};

export const SNAP_LOOK_MOVES = Object.freeze([
  'blitz_a',
  'blitz_edge',
  'rush_outside',
  'rush_inside',
  'crash',
  'loop',
  'drop_deep',
  'drop_hook',
  'drop_flat',
  'rotate_down',
  'rotate_middle',
  'bail',
  'press_jam',
  'sink_flat',
  'spy',
  'close',
  'pursue',
  'route_vertical',
  'route_in',
  'route_out',
  'route_dig',
  'route_curl',
  'route_corner',
  'route_flat',
  'route_cross',
  'wheel',
  'leak',
  'dive',
  'stretch',
  'counter',
  'pull_top',
  'fire',
  'reach_top',
  'slide_top',
  'slide_away',
  'down_block',
  'kickout',
  'motion_across',
  'rollout_top',
  'rollout_away',
  'fake',
  'screen_release',
  'set_deep',
  'set_short',
  'scramble',
  'stall',
] as const);
export type SnapLookMoveId = (typeof SNAP_LOOK_MOVES)[number];

export interface SnapLookMove {
  readonly actor: SnapLookActor;
  readonly to: SnapLookMoveId;
  /** Tells needed before the movement shows (0 = visible pre-snap). Results reveal everything. */
  readonly reveal: 0 | 1 | 2 | 3;
}

export interface SnapLookDefinitionVNext {
  readonly id: string;
  readonly positionId: VNextPositionId;
  readonly familyId: string;
  readonly nameKey: string;
  /** Ordered tells: earlier tells are the ones a thinly prepared athlete sees. */
  readonly tellKeys: readonly [string, string, string];
  /** Fits on the kernels' 0–100 scale, one per family decision; exactly one is the best read. */
  readonly fits: readonly { readonly decisionId: string; readonly fit: number }[];
  readonly weight: number;
  readonly stance: SnapLookStance;
  readonly moves: readonly SnapLookMove[];
}

export interface SnapLookCatalogVNext {
  readonly families: Readonly<
    Record<string, { readonly nameKey: string; readonly promptKey: string }>
  >;
  readonly looks: readonly SnapLookDefinitionVNext[];
}

export type SnapLookSlotVNext =
  | { readonly kind: 'LIVE'; readonly snapIndex: number }
  | { readonly kind: 'SIDELINE'; readonly repIndex: number };

export function bestDecisionOfLook(look: SnapLookDefinitionVNext): string {
  return [...look.fits].sort((left, right) => right.fit - left.fit)[0]!.decisionId;
}

/** The look hidden in one Saturday slot. Null when the family has no authored looks. */
export function snapLookVNext(
  career: Pick<CareerVNext, 'seed' | 'season' | 'athlete'>,
  weekIndex: number,
  slot: SnapLookSlotVNext,
  familyId: string,
  mechanics: Pick<CareerVNextMechanics, 'looks'>,
): SnapLookDefinitionVNext | null {
  const positionId = career.athlete.profile.positionId as VNextPositionId;
  const candidates = mechanics.looks.looks
    .filter((look) => look.positionId === positionId && look.familyId === familyId)
    .sort((left, right) => left.id.localeCompare(right.id));
  const total = candidates.reduce((sum, look) => sum + look.weight, 0);
  if (candidates.length === 0 || total <= 0) return null;
  const tag = slot.kind === 'LIVE' ? `live${slot.snapIndex}` : `rep${slot.repIndex}`;
  const roll =
    nextUint32(
      createRng(`${String(career.seed)}:vnext:look:${career.season.index}:${weekIndex}:${tag}`),
    ).value % total;
  let cursor = roll;
  for (const look of candidates) {
    if (cursor < look.weight) return look;
    cursor -= look.weight;
  }
  return candidates.at(-1)!;
}

type PatternLike = {
  readonly id: string;
  readonly decisionFits: readonly { readonly decisionId: string; readonly fit: number }[];
};
type ActiveLike = {
  readonly type: 'ACTIVE';
  readonly patterns: readonly PatternLike[];
  readonly input?: { readonly eventModifiers?: { readonly decisionScoreFlat?: number } };
};

/**
 * Playtest round 1: the read decides more of the play. The kernels weigh fit at a quarter of their
 * decision score, so a right read barely beat a wrong one. For the one snap it resolves, VNext adds
 * the read's edge to the kernel's decision score (the kernels' own event-modifier seam; the WR
 * kernel reads fit directly and takes a wider fit spread instead). The saved state is unchanged.
 */
export const READ_EDGE_VNEXT = Object.freeze({ SHARP: 12, SOLID: 0, MISSED: -12 });

function readEdge(fit: number): number {
  return fit >= 85
    ? READ_EDGE_VNEXT.SHARP
    : fit >= 65
      ? READ_EDGE_VNEXT.SOLID
      : READ_EDGE_VNEXT.MISSED;
}

/**
 * Resolves one live snap against the look: the owning kernel sees the look's fits for its pending
 * pattern only, and the returned state carries the kernel's original patterns again.
 */
export function resolveWithLookVNext(
  engine: VNextGameState,
  patternId: string,
  look: SnapLookDefinitionVNext | null,
  resolve: (state: VNextGameState) => VNextGameState | null,
  /** The call being made: its read quality adds the read edge for this one resolve. */
  decisionId?: string,
): VNextGameState | null {
  const game = engine.game as unknown as ActiveLike;
  if (look === null || game.type !== 'ACTIVE' || !Array.isArray(game.patterns))
    return resolve(engine);
  const original: readonly PatternLike[] = game.patterns;
  const pattern = original.find(({ id }) => id === patternId);
  if (
    pattern === undefined ||
    pattern.decisionFits.length !== look.fits.length ||
    !pattern.decisionFits.every(({ decisionId }) =>
      look.fits.some((entry) => entry.decisionId === decisionId),
    )
  )
    return resolve(engine);
  // Keep the kernel's decision order; only the fit values follow the look.
  const patched = original.map((entry) =>
    entry.id !== patternId
      ? entry
      : {
          ...entry,
          decisionFits: entry.decisionFits.map(({ decisionId }) => ({
            decisionId,
            fit: look.fits.find((fit) => fit.decisionId === decisionId)!.fit,
          })),
        },
  );
  const input = game.input;
  const modifiers = input?.eventModifiers;
  const chosenFit = look.fits.find((entry) => entry.decisionId === decisionId)?.fit;
  const edge =
    chosenFit !== undefined && typeof modifiers?.decisionScoreFlat === 'number'
      ? readEdge(chosenFit)
      : 0;
  const resolved = resolve({
    ...engine,
    game: {
      ...engine.game,
      patterns: patched,
      ...(edge === 0
        ? {}
        : {
            input: {
              ...input,
              eventModifiers: {
                ...modifiers,
                decisionScoreFlat: modifiers!.decisionScoreFlat! + edge,
              },
            },
          }),
    },
  } as unknown as VNextGameState);
  if (resolved === null) return null;
  // Hand back the kernel's own patterns and input: the look and the read edge were for this snap.
  const next = resolved.game as unknown as { patterns?: unknown; input?: unknown };
  return {
    ...resolved,
    game: {
      ...resolved.game,
      ...(Array.isArray(next.patterns) ? { patterns: original } : {}),
      ...(edge !== 0 && next.input !== undefined ? { input } : {}),
    },
  } as unknown as VNextGameState;
}
