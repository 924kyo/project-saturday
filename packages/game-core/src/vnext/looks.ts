import { SCENE_RULES_V2 } from '../games/tactical-alpha-v1.js';
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

/**
 * M12 look variety, for games kicked off after the update (`GameDayVNext.lookIds` present). The
 * looks a game used are saved, so the next pick reads saved facts instead of re-deriving earlier
 * slots:
 * - no look repeats inside the game (as before);
 * - looks from the athlete's last two games are avoided while a fresh one remains;
 * - the snap right after a look of the same family never shows the same first tell ("twin prompts",
 *   regression report), while another first tell remains.
 */
export interface SnapLookContextVNext {
  /** Looks already used by this game's earlier live snaps. */
  readonly usedLookIds: readonly string[];
  /** Looks from recent games, avoided while an alternative remains. */
  readonly avoidLookIds: readonly string[];
  /** The look of the previous live snap (null for the first). */
  readonly previousLookId: string | null;
}

function weightedPick(
  pool: readonly SnapLookDefinitionVNext[],
  seed: string,
): SnapLookDefinitionVNext {
  const weight = pool.reduce((sum, look) => sum + look.weight, 0);
  let cursor = nextUint32(createRng(seed)).value % weight;
  for (const look of pool) {
    if (cursor < look.weight) return look;
    cursor -= look.weight;
  }
  return pool.at(-1)!;
}

/** Keeps `filtered` only when it leaves at least one look. */
function narrow(
  pool: readonly SnapLookDefinitionVNext[],
  keep: (look: SnapLookDefinitionVNext) => boolean,
): readonly SnapLookDefinitionVNext[] {
  const filtered = pool.filter(keep);
  return filtered.length > 0 ? filtered : pool;
}

/** The look hidden in one Saturday slot. Null when the family has no authored looks. */
export function snapLookVNext(
  career: Pick<CareerVNext, 'seed' | 'season' | 'athlete'>,
  weekIndex: number,
  slot: SnapLookSlotVNext,
  familyId: string,
  mechanics: Pick<CareerVNextMechanics, 'looks'>,
  context?: SnapLookContextVNext,
): SnapLookDefinitionVNext | null {
  const positionId = career.athlete.profile.positionId as VNextPositionId;
  const candidates = mechanics.looks.looks
    .filter((look) => look.positionId === positionId && look.familyId === familyId)
    .sort((left, right) => left.id.localeCompare(right.id));
  const total = candidates.reduce((sum, look) => sum + look.weight, 0);
  if (candidates.length === 0 || total <= 0) return null;
  const live = slot.kind === 'LIVE';
  if (live && context !== undefined) {
    const previous = mechanics.looks.looks.find(({ id }) => id === context.previousLookId);
    // Priority: no repeat in the game, then no back-to-back twin, then freshness across games.
    let pool = narrow(candidates, (look) => !context.usedLookIds.includes(look.id));
    if (previous !== undefined && previous.familyId === familyId)
      pool = narrow(pool, (look) => look.tellKeys[0] !== previous.tellKeys[0]);
    pool = narrow(pool, (look) => !context.avoidLookIds.includes(look.id));
    return weightedPick(
      pool,
      `${String(career.seed)}:vnext:look:${career.season.index}:${weekIndex}:live${slot.snapIndex}`,
    );
  }
  // No look repeats inside one game (playtest round 2): slot k draws from the family's looks
  // minus those slots 0..k-1 would have drawn for it. It needs no game context and stays derived:
  // an earlier snap of this family got exactly that earlier pick, so it can never come back.
  // With five looks and at most five live snaps (or reps), a fresh look is always left.
  const last = live ? slot.snapIndex : slot.repIndex;
  const used = new Set<string>();
  let picked: SnapLookDefinitionVNext = candidates[0]!;
  for (let index = 0; index <= last; index += 1) {
    const open = candidates.filter((look) => !used.has(look.id));
    const pool = open.length > 0 ? open : candidates;
    const tag = live ? `live${index}` : `rep${index}`;
    picked = weightedPick(
      pool,
      `${String(career.seed)}:vnext:look:${career.season.index}:${weekIndex}:${tag}`,
    );
    used.add(picked.id);
  }
  return picked;
}

/** The look context for a live snap of a game that saves its looks (null for older games). */
export function liveLookContextVNext(
  game: {
    readonly lookIds?: readonly (string | null)[];
    readonly avoidLookIds?: readonly string[];
  },
  snapIndex: number,
): SnapLookContextVNext | undefined {
  if (game.lookIds === undefined) return undefined;
  const earlier = game.lookIds.slice(0, snapIndex);
  return {
    usedLookIds: earlier.filter((id): id is string => id !== null),
    avoidLookIds: game.avoidLookIds ?? [],
    previousLookId: earlier.at(-1) ?? null,
  };
}

/**
 * The look a live snap was played against: the saved one when the game records looks, otherwise
 * the pre-M12 derivation (identical to what that game resolved with).
 */
export function liveSnapLookVNext(
  career: Pick<CareerVNext, 'seed' | 'season' | 'athlete'>,
  game: {
    readonly weekIndex: number;
    readonly lookIds?: readonly (string | null)[];
    readonly avoidLookIds?: readonly string[];
  },
  snapIndex: number,
  familyId: string,
  mechanics: Pick<CareerVNextMechanics, 'looks'>,
): SnapLookDefinitionVNext | null {
  const saved = game.lookIds?.[snapIndex];
  if (saved !== undefined)
    return saved === null ? null : (mechanics.looks.looks.find(({ id }) => id === saved) ?? null);
  return snapLookVNext(
    career,
    game.weekIndex,
    { kind: 'LIVE', snapIndex },
    familyId,
    mechanics,
    liveLookContextVNext(game, snapIndex),
  );
}

type PatternLike = {
  readonly id: string;
  readonly decisionFits: readonly { readonly decisionId: string; readonly fit: number }[];
};
type ActiveLike = {
  readonly type: 'ACTIVE';
  readonly patterns: readonly PatternLike[];
  readonly input?: {
    readonly eventModifiers?: { readonly decisionScoreFlat?: number };
    readonly sceneRules?: string;
  };
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
  // For this one resolve the kernel sees the look's fits, the read edge and scene rules v2
  // (outcomes that never contradict the scene, and execution that follows the read); its stored
  // input and patterns are handed back.
  const patchedInput =
    input === undefined
      ? undefined
      : {
          ...input,
          sceneRules: SCENE_RULES_V2,
          ...(edge === 0
            ? {}
            : {
                eventModifiers: {
                  ...modifiers,
                  decisionScoreFlat: modifiers!.decisionScoreFlat! + edge,
                },
              }),
        };
  const resolved = resolve({
    ...engine,
    game: {
      ...engine.game,
      patterns: patched,
      ...(patchedInput === undefined ? {} : { input: patchedInput }),
    },
  } as unknown as VNextGameState);
  if (resolved === null) return null;
  const next = resolved.game as unknown as { patterns?: unknown; input?: unknown };
  return {
    ...resolved,
    game: {
      ...resolved.game,
      ...(Array.isArray(next.patterns) ? { patterns: original } : {}),
      ...(patchedInput !== undefined && next.input !== undefined ? { input } : {}),
    },
  } as unknown as VNextGameState;
}
