import type {
  SnapBoardFrame,
  SnapLookActor,
  SnapLookMoveId,
  SnapLookStance,
  VNextPositionId,
} from '@project-saturday/game-core';

/**
 * Pure schematic geometry for the Tactical Board. Formations and technique paths are original
 * schematic drawings of the athlete's authored choice; every outcome fact (line of scrimmage,
 * line to gain, ball spot, result, turnover, score) comes from the saved frame. No randomness.
 */
export const BOARD_H = 220;
export const MID = 110;
export const YARD = 10;

export interface Pt {
  readonly x: number;
  readonly y: number;
}
export type PathKind = 'route' | 'throw' | 'read';
export interface TechniquePath {
  readonly points: readonly Pt[];
  readonly kind: PathKind;
}
export type ActorMap = Partial<Record<SnapLookActor, Pt>>;

export interface Scene {
  readonly width: number;
  readonly start: number;
  readonly x: (yard: number) => number;
  readonly los: number;
  readonly firstDown: number | null;
  readonly offense: readonly Pt[];
  readonly defense: readonly Pt[];
  readonly qb: Pt;
  readonly rb: Pt;
  readonly wr: Pt;
  readonly wr2: Pt;
  readonly cb: Pt;
  readonly lb: Pt;
  readonly edge: Pt;
  readonly safeties: readonly Pt[];
  readonly athlete: Pt;
  readonly playerOnOffense: boolean;
  readonly gapLabels: readonly Pt[];
  /** Every named player on the board (M11 looks move them by name). */
  readonly actors: ActorMap;
}

export function isDefense(positionId: VNextPositionId): boolean {
  return (
    positionId === 'position_cb' || positionId === 'position_lb' || positionId === 'position_edge'
  );
}

const ATHLETE_ACTOR: Readonly<Record<VNextPositionId, SnapLookActor>> = {
  position_qb: 'qb',
  position_rb: 'rb',
  position_wr: 'wr1',
  position_cb: 'cb_top',
  position_lb: 'mike',
  position_edge: 'de_top',
};

/** Where each named player stands for a look's stance (schematic, original drawing). */
function alignActors(los: number, stance: SnapLookStance): ActorMap {
  const formation = stance.formation ?? 'spread';
  const back = stance.back ?? (formation === 'empty' ? 'none' : 'offset');
  const wr1 = {
    x: los - 8,
    y: stance.split === 'reduced' ? 64 : stance.split === 'wide' ? 30 : 46,
  };
  const qb = { x: los - 40, y: MID };
  const rb =
    back === 'none'
      ? { x: los - 14, y: 152 }
      : back === 'pistol'
        ? { x: los - 60, y: MID }
        : back === 'wide'
          ? { x: los - 34, y: MID - 44 }
          : { x: los - 56, y: MID + 16 };
  const te = formation === 'tight' ? { x: los - 6, y: MID - 38 } : { x: los - 6, y: MID + 38 };
  const actors: ActorMap = {
    lt: { x: los - 6, y: MID - 24 },
    lg: { x: los - 6, y: MID - 12 },
    c: { x: los - 6, y: MID },
    rg: { x: los - 6, y: MID + 12 },
    rt: { x: los - 6, y: MID + 24 },
    qb,
    rb,
    te,
    wr1,
    wr2: { x: los - 8, y: 190 },
    slot: formation === 'tight' ? { x: los - 12, y: 150 } : { x: los - 14, y: 78 },
  };
  const edgeY = stance.edge === 'wide' ? MID - 48 : stance.edge === 'tight' ? MID - 32 : MID - 40;
  actors.de_top = { x: los + 8, y: edgeY };
  actors.dt1 = { x: los + 8, y: MID - 10 };
  actors.dt2 = { x: los + 8, y: MID + 10 };
  actors.de_bot = { x: los + 8, y: MID + 34 };
  const backers = stance.backers ?? 'normal';
  const depth = backers === 'shallow' ? 30 : backers === 'deep' ? 62 : 46;
  actors.mike = backers === 'mugged' ? { x: los + 12, y: MID - 5 } : { x: los + depth, y: MID };
  actors.will = backers === 'mugged' ? { x: los + 12, y: MID + 5 } : { x: los + depth, y: 80 };
  actors.sam = { x: los + depth, y: 140 };
  const corner = stance.corner;
  const cbX =
    corner === 'press'
      ? wr1.x + 14
      : corner === 'off'
        ? los + 54
        : corner === 'squat'
          ? los + 28
          : los + 36;
  const lean = stance.leverage === 'inside' ? 12 : stance.leverage === 'outside' ? -10 : 0;
  actors.cb_top = { x: cbX, y: wr1.y + lean };
  actors.cb_bot = { x: los + 40, y: 188 };
  actors.nickel =
    stance.nickel === 'walked_up'
      ? { x: los + 10, y: 70 }
      : stance.nickel === 'inside'
        ? { x: los + 40, y: 92 }
        : { x: los + 34, y: 68 };
  const shell = stance.shell ?? (stance.front === 'loaded' ? 'one_high' : 'two_high');
  if (shell === 'one_high') {
    actors.fs = { x: los + 146, y: MID };
    actors.ss = { x: los + 64, y: 152 };
  } else if (shell === 'zero') {
    actors.fs = { x: los + 40, y: 84 };
    actors.ss = { x: los + 40, y: 138 };
  } else if (shell === 'robber') {
    actors.fs = { x: los + 146, y: MID };
    actors.ss = { x: los + 56, y: MID + 10 };
  } else {
    actors.fs = { x: los + 124, y: 70 };
    actors.ss = { x: los + 124, y: 150 };
  }
  if (stance.front === 'loaded') actors.ss = { x: los + 26, y: 150 };
  return actors;
}

const OFFENSE_ACTORS: readonly SnapLookActor[] = [
  'lt',
  'lg',
  'c',
  'rg',
  'rt',
  'qb',
  'rb',
  'te',
  'wr1',
  'wr2',
  'slot',
];

export function buildScene(
  frame: SnapBoardFrame,
  positionId: VNextPositionId,
  compact: boolean,
): Scene {
  const window = compact ? 24 : 30;
  const width = window * YARD;
  const situation = frame.kind === 'LIVE' ? frame.situation : null;
  const losYards = situation?.lineOfScrimmageYards ?? 35;
  const start = Math.max(-10, Math.min(110 - window, losYards - Math.round(window / 3)));
  const x = (yard: number) => (yard - start) * YARD;
  const los = x(losYards);
  const actors = alignActors(los, frame.look?.stance ?? {});
  const at = (actor: SnapLookActor) => actors[actor]!;
  const offense = OFFENSE_ACTORS.map(at);
  const defense = (Object.keys(actors) as SnapLookActor[])
    .filter((actor) => !OFFENSE_ACTORS.includes(actor))
    .map(at);
  const firstDown =
    situation !== null && situation.firstDownYards < 100 ? x(situation.firstDownYards) : null;
  return {
    width,
    start,
    x,
    los,
    firstDown,
    offense,
    defense,
    qb: at('qb'),
    rb: at('rb'),
    wr: at('wr1'),
    wr2: at('wr2'),
    cb: at('cb_top'),
    lb: at('mike'),
    edge: at('de_top'),
    safeties: [at('fs'), at('ss')],
    athlete: at(ATHLETE_ACTOR[positionId]),
    playerOnOffense: situation === null ? !isDefense(positionId) : situation.offense === 'PLAYER',
    gapLabels: [
      { x: los + 4, y: MID - 6 },
      { x: los + 4, y: MID - 18 },
      { x: los + 4, y: MID - 32 },
    ],
    actors,
  };
}

/** One opponent (or teammate) movement from a look: a schematic arrow, never an outcome. */
export interface LookArrow {
  readonly actor: SnapLookActor;
  readonly d: string;
  /** Pre-snap motion or alignment intent (always visible) vs. a movement a tell exposed. */
  readonly kind: 'presnap' | 'read';
  readonly offense: boolean;
}

function sideline(p: Pt): number {
  return p.y < MID ? 16 : BOARD_H - 16;
}
function towardMiddle(p: Pt, amount: number): number {
  return p.y < MID ? p.y + amount : p.y - amount;
}
function towardSideline(p: Pt, amount: number): number {
  return p.y < MID ? p.y - amount : p.y + amount;
}

function lookTarget(scene: Scene, p: Pt, to: SnapLookMoveId): Pt[] {
  const { los, qb } = scene;
  switch (to) {
    case 'blitz_a':
      return [
        { x: los + 2, y: towardMiddle(p, 2) },
        { x: qb.x + 12, y: MID + (p.y < MID ? -4 : 4) },
      ];
    case 'blitz_edge':
      return [
        { x: los - 4, y: towardSideline(p, 6) },
        { x: qb.x + 6, y: p.y < MID ? qb.y - 12 : qb.y + 12 },
      ];
    case 'rush_outside':
      return [
        { x: los - 24, y: towardSideline(p, 16) },
        { x: qb.x + 2, y: p.y < MID ? qb.y - 18 : qb.y + 18 },
      ];
    case 'rush_inside':
      return [{ x: qb.x + 14, y: (p.y + MID) / 2 }];
    case 'crash':
      return [{ x: los - 10, y: towardMiddle(p, Math.abs(p.y - MID) - 8) }];
    case 'loop':
      return [
        { x: los + 8, y: MID },
        { x: los - 16, y: p.y < MID ? MID + 10 : MID - 10 },
      ];
    case 'drop_deep':
      return [{ x: p.x + 60, y: p.y }];
    case 'drop_hook':
      return [{ x: los + 42, y: (p.y + MID) / 2 }];
    case 'drop_flat':
      return [{ x: los + 22, y: sideline(p) + (p.y < MID ? 14 : -14) }];
    case 'rotate_down':
      return [{ x: los + 28, y: p.y * 0.7 + MID * 0.3 }];
    case 'rotate_middle':
      return [{ x: p.x + 16, y: MID }];
    case 'bail':
      return [{ x: p.x + 56, y: p.y }];
    case 'press_jam':
      return [{ x: scene.wr.x + 10, y: scene.wr.y }];
    case 'sink_flat':
      return [{ x: p.x + 16, y: towardSideline(p, 18) }];
    case 'spy':
      return [
        { x: p.x - 10, y: MID - 12 },
        { x: los + 18, y: MID + 4 },
      ];
    case 'close':
      return [{ x: los + 14, y: p.y + (MID - p.y) * 0.6 }];
    case 'pursue':
      return [{ x: p.x - 8, y: towardSideline(p, 30) }];
    case 'route_vertical':
      return [{ x: p.x + 150, y: p.y }];
    case 'route_in':
      return [
        { x: p.x + 60, y: p.y },
        { x: p.x + 64, y: towardMiddle(p, 44) },
      ];
    case 'route_out':
      return [
        { x: p.x + 50, y: p.y },
        { x: p.x + 52, y: towardSideline(p, 24) },
      ];
    case 'route_dig':
      return [
        { x: p.x + 100, y: p.y },
        { x: p.x + 102, y: towardMiddle(p, 56) },
      ];
    case 'route_curl':
      return [
        { x: p.x + 82, y: p.y },
        { x: p.x + 72, y: towardMiddle(p, 8) },
      ];
    case 'route_corner':
      return [
        { x: p.x + 70, y: p.y },
        { x: p.x + 118, y: sideline(p) },
      ];
    case 'route_flat':
      return [{ x: los + 16, y: sideline(p) }];
    case 'route_cross':
      return [
        { x: p.x + 30, y: p.y },
        { x: los + 62, y: p.y < MID ? MID + 40 : MID - 40 },
      ];
    case 'wheel':
      return [
        { x: los + 8, y: sideline(p) },
        { x: los + 100, y: sideline(p) },
      ];
    case 'leak':
      return [
        { x: los - 4, y: towardSideline(p, 30) },
        { x: los + 30, y: p.y < MID ? MID - 60 : MID + 60 },
      ];
    case 'dive':
      return [{ x: los + 14, y: MID }];
    case 'stretch':
      return [
        { x: p.x + 12, y: MID - 40 },
        { x: los + 10, y: 34 },
      ];
    case 'counter':
      return [
        { x: p.x + 4, y: p.y + 12 },
        { x: los + 12, y: MID - 30 },
      ];
    case 'pull_top':
      return [
        { x: p.x - 14, y: p.y },
        { x: los + 4, y: MID - 46 },
      ];
    case 'fire':
      return [{ x: p.x + 20, y: p.y }];
    case 'reach_top':
      return [{ x: p.x + 8, y: p.y - 16 }];
    case 'slide_top':
      return [{ x: p.x - 4, y: p.y - 12 }];
    case 'slide_away':
      return [{ x: p.x - 4, y: p.y + 12 }];
    case 'down_block':
      return [{ x: p.x + 6, y: towardMiddle(p, 14) }];
    case 'kickout':
      return [{ x: los + 4, y: MID - 46 }];
    case 'motion_across':
      return [{ x: p.x - 6, y: MID + (MID - p.y) }];
    case 'rollout_top':
      return [
        { x: p.x - 6, y: p.y - 20 },
        { x: p.x + 14, y: 40 },
      ];
    case 'rollout_away':
      return [
        { x: p.x - 6, y: p.y + 20 },
        { x: p.x + 14, y: BOARD_H - 40 },
      ];
    case 'fake':
      return [{ x: p.x - 6, y: p.y + 14 }];
    case 'screen_release':
      return [{ x: los + 20, y: towardSideline(p, 30) }];
    case 'set_deep':
      return [{ x: p.x - 24, y: towardSideline(p, 8) }];
    case 'set_short':
      return [{ x: p.x - 6, y: p.y }];
    case 'scramble':
      return [
        { x: p.x + 4, y: p.y - 30 },
        { x: los + 10, y: 34 },
      ];
    case 'stall':
      return [{ x: p.x + 8, y: p.y }];
  }
}

/** Arrows for the look's revealed movements (the frame already filtered them by tells read). */
export function lookArrows(scene: Scene, frame: SnapBoardFrame): readonly LookArrow[] {
  const look = frame.look;
  if (look === null) return [];
  return look.moves.flatMap((move) => {
    const from = scene.actors[move.actor];
    if (from === undefined) return [];
    const points = [from, ...lookTarget(scene, from, move.to)];
    return [
      {
        actor: move.actor,
        d: pathD({ points, kind: 'route' }),
        kind: move.reveal === 0 ? ('presnap' as const) : ('read' as const),
        offense: OFFENSE_ACTORS.includes(move.actor),
      },
    ];
  });
}

const route = (...points: Pt[]): TechniquePath => ({ points, kind: 'route' });
const throwTo = (from: Pt, to: Pt): TechniquePath => ({ points: [from, to], kind: 'throw' });
const read = (from: Pt, to: Pt): TechniquePath => ({ points: [from, to], kind: 'read' });
const at = (p: Pt, dx: number, dy: number): Pt => ({ x: p.x + dx, y: p.y + dy });

/** Schematic drawing of each authored technique (never an outcome). */
export function techniquePath(scene: Scene, decisionId: string, index: number): TechniquePath {
  const { los, qb: q, rb: r, wr: w, cb: c, lb: l, edge: e } = scene;
  const id = decisionId.replace(/^key_snap_decision_(qb_|rb_|cb_|lb_|edge_)?/u, '');
  switch (id) {
    // WR release / route / catch point / after the catch
    case 'speed_release':
      return route(w, at(w, 90, 4));
    case 'hand_clear':
      return route(w, at(w, 18, 6), at(w, 88, 6));
    case 'patient_feint':
      return route(w, at(w, 10, 18), at(w, 22, 0), at(w, 88, -2));
    case 'stack_defender':
      return route(w, at(w, 60, 6), at(w, 150, 2));
    case 'settle_window':
      return route(w, at(w, 62, 4), at(w, 56, 36));
    case 'cross_face':
      return route(w, at(w, 44, 4), at(w, 74, 72));
    case 'attack_high_point':
      return route(w, at(w, 70, 4), at(w, 98, -2));
    case 'late_hands':
      return route(w, at(w, 70, 4), at(w, 96, 10));
    case 'secure_frame':
      return route(w, at(w, 60, 4), at(w, 80, 22));
    case 'burst_upfield':
      return route(w, at(w, 60, 4), at(w, 132, 6));
    case 'cutback_lane':
      return route(w, at(w, 60, 4), at(w, 104, 52));
    case 'protect_ball':
      return route(w, at(w, 60, 4), at(w, 86, 12));
    // RB run craft / contact / protection
    case 'press_landmark':
      return route(r, { x: los + 2, y: MID - 18 }, { x: los + 42, y: MID - 26 });
    case 'cut_back':
      return route(r, { x: los - 2, y: MID - 14 }, { x: los + 38, y: MID + 32 });
    case 'bounce_edge':
      return route(r, { x: los - 10, y: MID - 42 }, { x: los + 42, y: MID - 64 });
    case 'finish_forward':
      return route(r, { x: los + 44, y: MID + 6 });
    case 'make_miss':
      return route(r, { x: los + 22, y: MID }, { x: los + 46, y: MID - 26 });
    case 'cover_ball':
      return route(r, { x: los + 28, y: MID + 4 });
    case 'scan_inside':
      return route(r, at(r, 20, -10));
    case 'square_anchor':
      return route(r, at(r, 24, 20));
    case 'release_late':
      return route(r, at(r, 14, -2), { x: los + 30, y: MID + 60 });
    case 'settle_checkdown':
      return route(r, { x: los + 18, y: MID + 56 });
    case 'turn_upfield':
      return route(r, { x: los + 18, y: MID + 56 }, { x: los + 62, y: MID + 60 });
    case 'secure_boundary':
      return route(r, { x: los + 18, y: MID + 56 }, { x: los + 42, y: MID + 86 });
    // QB pre-snap / pocket / throw / scramble
    case 'confirm_shell':
      return read(q, scene.safeties[0]!);
    case 'redirect_protection':
      return read(q, { x: los - 8, y: MID - 34 });
    case 'vary_cadence':
      return read(q, { x: los - 10, y: MID });
    case 'climb_pocket':
      return route(q, at(q, 20, 0));
    case 'reset_platform':
      return route(q, at(q, -16, 10));
    case 'escape_edge':
      return route(q, at(q, 6, -46), { x: los + 32, y: MID - 72 });
    case 'take_checkdown':
      return throwTo(q, { x: los + 14, y: MID + 60 });
    case 'attack_layered_window':
      return throwTo(q, { x: los + 82, y: MID - 32 });
    case 'challenge_boundary':
      return throwTo(q, { x: los + 122, y: 24 });
    case 'slide_early':
      return route(q, { x: los + 30, y: MID - 12 });
    case 'reach_marker':
      return route(q, { x: (scene.firstDown ?? los + 60) + 6, y: MID - 22 });
    case 'extend_boundary':
      return route(q, at(q, 10, -52), { x: q.x + 60, y: 4 });
    // CB leverage / coverage / ball / tackle
    case 'press_jam':
      return route(c, { x: w.x + 12, y: w.y + 4 });
    case 'shade_inside':
      return route(c, at(c, 0, 18));
    case 'bail_depth':
      return route(c, at(c, 72, 6));
    case 'mirror_release':
      return route(c, at(c, 62, 2));
    case 'undercut_break':
      return route(c, at(c, 40, 44));
    case 'handoff_zone':
      return route(c, at(c, 52, 32));
    case 'play_ball':
      return route(c, at(c, 64, -6));
    case 'play_hands':
      return route(c, at(c, 56, 6));
    case 'close_catch':
      return route(c, at(c, 30, 16));
    case 'breakdown_tackle':
      return route(c, at(c, 20, 20));
    case 'drive_boundary':
      return route(c, at(c, 10, -12));
    case 'attack_strip':
      return route(c, at(c, 34, 10));
    // LB key / fit / drop / blitz (the defense faces the offense, so attacking is toward -x)
    case 'trust_guard':
      return route(l, at(l, -20, -18));
    case 'trigger_downhill':
      return route(l, { x: los + 4, y: MID - 12 });
    case 'read_backfield':
      return route(l, at(l, -8, 0));
    case 'fill_gap':
      return route(l, { x: los + 6, y: MID - 18 });
    case 'spill_outside':
      return route(l, { x: los + 10, y: MID - 50 }, { x: los - 6, y: MID - 66 });
    case 'scrape_over':
      return route(l, at(l, -10, -40), { x: los + 2, y: MID - 62 });
    case 'hook_curl_depth':
      return route(l, at(l, 40, -24));
    case 'match_back':
      return route(l, at(l, 10, 50), at(l, 60, 64));
    case 'rob_crosser':
      return route(l, at(l, 30, -6));
    case 'a_gap_mug':
      return route(l, { x: los + 2, y: MID - 6 }, { x: q.x + 10, y: MID });
    case 'delay_blitz':
      return route(l, at(l, 0, 10), { x: los, y: MID + 14 }, { x: q.x + 8, y: MID + 4 });
    case 'peel_with_back':
      return route(l, { x: los + 10, y: MID + 30 }, { x: los + 30, y: MID + 60 });
    // EDGE rush / contain / option / finish
    case 'speed_dip':
      return route(e, { x: los - 20, y: MID - 52 }, { x: q.x + 4, y: q.y - 8 });
    case 'long_arm':
      return route(e, at(e, -18, 4), { x: q.x + 10, y: q.y - 14 });
    case 'contain_rush':
      return route(e, at(e, -30, -10), at(e, -44, 6));
    case 'set_hard_edge':
      return route(e, at(e, -6, -6));
    case 'squeeze_down':
      return route(e, at(e, -8, 22));
    case 'chase_flat':
      return route(e, at(e, -20, 30), { x: los - 6, y: MID + 40 });
    case 'take_dive':
      return route(e, { x: los - 14, y: MID - 8 });
    case 'take_quarterback':
      return route(e, at(e, -24, -6));
    case 'slow_play':
      return route(e, at(e, -4, -14), at(e, -28, -20));
    case 'wrap_sack':
      return route(e, { x: q.x + 6, y: q.y - 6 });
    case 'strip_swipe':
      return route(e, { x: q.x + 8, y: q.y - 14 }, at(q, 2, -2));
    case 'get_hands_up':
      return route(e, at(e, -10, 6));
    default:
      return route(scene.athlete, at(scene.athlete, 60, [-30, 0, 30][index % 3]!));
  }
}

export function pathD(path: TechniquePath): string {
  const [first, ...rest] = path.points;
  if (first === undefined) return '';
  if (path.kind === 'throw' && rest.length === 1) {
    const end = rest[0]!;
    return `M${first.x} ${first.y} Q${(first.x + end.x) / 2} ${Math.min(first.y, end.y) - 46} ${end.x} ${end.y}`;
  }
  return `M${first.x} ${first.y} ${rest.map((p) => `L${p.x} ${p.y}`).join(' ')}`;
}

export interface ResultMotion {
  /** Athlete movement (the chosen technique, then any real gain). */
  readonly athlete: string | null;
  /** Ball flight / carry ending at the saved spot. */
  readonly ball: string | null;
  readonly end: Pt;
  readonly tag: 'td' | 'int' | 'fumble' | 'sack' | 'pbu' | 'drop' | 'incomplete' | null;
}

function clampX(scene: Scene, value: number) {
  return Math.max(6, Math.min(scene.width - 6, value));
}

/** Motion that replays only saved facts: the chosen technique, the saved spot and outcome. */
export function resultMotion(
  scene: Scene,
  frame: Extract<SnapBoardFrame, { kind: 'LIVE' }>,
  positionId: VNextPositionId,
): ResultMotion | null {
  const result = frame.result;
  if (result === null) return null;
  const index = frame.decisionIds.indexOf(result.decisionId);
  const technique = techniquePath(scene, result.decisionId, index);
  const last = technique.points.at(-1)!;
  const spotX =
    result.ballEndYards === null
      ? null
      : clampX(scene, scene.x(Math.max(-5, Math.min(105, result.ballEndYards))));
  const tag: ResultMotion['tag'] =
    result.outcome === 'TOUCHDOWN'
      ? 'td'
      : result.playResultId === 'INTERCEPTION'
        ? 'int'
        : result.outcome === 'TURNOVER'
          ? 'fumble'
          : result.playResultId === 'SACK'
            ? 'sack'
            : result.playResultId === 'PASS_DEFENDED'
              ? 'pbu'
              : result.playResultId === 'DROP'
                ? 'drop'
                : result.playResultId === 'INCOMPLETE' || result.playResultId === 'INCOMPLETION'
                  ? 'incomplete'
                  : null;
  const techniqueD = pathD(technique);
  if (positionId === 'position_wr') {
    if (result.playResultId === 'NOT_TARGETED') {
      return {
        athlete: techniqueD,
        ball: pathD(throwTo(scene.qb, scene.wr2)),
        end: scene.wr2,
        tag: null,
      };
    }
    const catchPoint = last;
    const end =
      result.playResultId === 'INTERCEPTION'
        ? { x: catchPoint.x + 6, y: catchPoint.y + 8 }
        : catchPoint;
    const carry =
      result.playResultId === 'RECEPTION' && spotX !== null && spotX > catchPoint.x
        ? `${techniqueD} L${spotX} ${catchPoint.y}`
        : techniqueD;
    return {
      athlete: carry,
      ball: pathD(throwTo(scene.qb, end)),
      end:
        result.playResultId === 'RECEPTION' && spotX !== null
          ? { x: Math.max(spotX, catchPoint.x), y: catchPoint.y }
          : end,
      tag,
    };
  }
  if (positionId === 'position_cb') {
    const target = { x: scene.cb.x + 50, y: scene.cb.y + 10 };
    const end =
      result.playResultId === 'COMPLETION_ALLOWED' && spotX !== null
        ? { x: spotX, y: target.y }
        : result.playResultId === 'INTERCEPTION' && spotX !== null
          ? { x: spotX, y: target.y }
          : target;
    return {
      athlete:
        result.playResultId === 'INTERCEPTION' ? `${techniqueD} L${end.x} ${end.y}` : techniqueD,
      ball: result.playResultId === 'NO_TARGET' ? null : pathD(throwTo(scene.qb, target)),
      end,
      tag,
    };
  }
  if (positionId === 'position_lb' || positionId === 'position_edge') {
    // Front seven: the technique, then the saved spot; pass results draw the saved throw.
    const end = spotX === null ? last : { x: spotX, y: last.y };
    const thrown = ['PASS_DEFENDED', 'INTERCEPTION', 'PRESSURE', 'GAIN_ALLOWED'].includes(
      result.playResultId,
    );
    return {
      athlete: techniqueD,
      ball: thrown ? pathD(throwTo(scene.qb, end)) : null,
      end,
      tag,
    };
  }
  if (technique.kind === 'throw') {
    const end =
      result.playResultId === 'COMPLETION' && spotX !== null
        ? { x: Math.max(spotX, last.x - 20), y: last.y }
        : last;
    return { athlete: null, ball: pathD(throwTo(scene.qb, end)), end, tag };
  }
  if (technique.kind === 'read') {
    // Pre-snap choices change the snap itself; the saved result is drawn at the saved spot.
    const end = { x: spotX ?? scene.los + 20, y: MID - 30 };
    return { athlete: null, ball: pathD(throwTo(scene.qb, end)), end, tag };
  }
  const carryEnd = { x: spotX ?? last.x, y: last.y };
  return { athlete: `${techniqueD} L${carryEnd.x} ${carryEnd.y}`, ball: null, end: carryEnd, tag };
}
