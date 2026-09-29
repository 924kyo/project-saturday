import type { SnapBoardFrame, VNextPositionId } from '@project-saturday/game-core';

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
}

export function isDefense(positionId: VNextPositionId): boolean {
  return (
    positionId === 'position_cb' || positionId === 'position_lb' || positionId === 'position_edge'
  );
}

export function buildScene(
  frame: SnapBoardFrame,
  positionId: VNextPositionId,
  compact: boolean,
): Scene {
  const window = compact ? 30 : 40;
  const width = window * YARD;
  const situation = frame.kind === 'LIVE' ? frame.situation : null;
  const losYards = situation?.lineOfScrimmageYards ?? 35;
  const start = Math.max(-10, Math.min(110 - window, losYards - Math.round(window / 3)));
  const x = (yard: number) => (yard - start) * YARD;
  const los = x(losYards);
  const look = frame.kind === 'LIVE' ? frame.look : null;
  const qb = { x: los - 40, y: MID };
  const rb = { x: los - 58, y: MID + 16 };
  const wr = { x: los - 8, y: 46 };
  const wr2 = { x: los - 8, y: 178 };
  const offense: Pt[] = [
    ...[-24, -12, 0, 12, 24].map((dy) => ({ x: los - 6, y: MID + dy })),
    qb,
    rb,
    { x: los - 6, y: MID + 38 },
    wr,
    wr2,
    { x: los - 14, y: 76 },
  ];
  const press = look?.coverageId.includes('press') ?? false;
  const off = look?.coverageId.includes('off') ?? false;
  const leverage = look?.leverageId ?? '';
  const cb = {
    x: press ? los + 6 : off ? los + 48 : los + 36,
    y: leverage.includes('inside') ? wr.y + 14 : leverage.includes('outside') ? wr.y - 10 : wr.y,
  };
  const singleHigh = look?.coverageId.includes('single_high') ?? false;
  const safeties = singleHigh
    ? [
        { x: los + 146, y: MID },
        { x: los + 70, y: 150 },
      ]
    : [
        { x: los + 124, y: 70 },
        { x: los + 124, y: 150 },
      ];
  const edge = { x: los + 8, y: MID - 40 };
  const lb = { x: los + 46, y: MID };
  const defense: Pt[] = [
    edge,
    ...[-10, 10, 32].map((dy) => ({ x: los + 8, y: MID + dy })),
    { x: los + 46, y: 82 },
    lb,
    { x: los + 46, y: 138 },
    cb,
    { x: los + 44, y: 176 },
    ...safeties,
  ];
  const athlete =
    positionId === 'position_qb'
      ? qb
      : positionId === 'position_rb'
        ? rb
        : positionId === 'position_wr'
          ? wr
          : positionId === 'position_lb'
            ? lb
            : positionId === 'position_edge'
              ? edge
              : cb;
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
    qb,
    rb,
    wr,
    wr2,
    cb,
    lb,
    edge,
    safeties,
    athlete,
    playerOnOffense: situation === null ? !isDefense(positionId) : situation.offense === 'PLAYER',
    gapLabels: [
      { x: los + 4, y: MID - 6 },
      { x: los + 4, y: MID - 18 },
      { x: los + 4, y: MID - 32 },
    ],
  };
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
