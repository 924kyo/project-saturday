import type { SnapBoardFrame, VNextPositionId } from '@project-saturday/game-core';

/**
 * Original schematic field. Every drawn fact (line of scrimmage, line to gain, ball spot, result
 * endpoint, outcome) comes from the saved frame; formations are generic schematic alignments, not
 * tracked coordinates. No randomness: identical frames draw identically.
 */
export type PreviewKind =
  'PASS_SHORT' | 'PASS_DEEP' | 'RUN' | 'SAFE' | 'PROTECT' | 'COVER' | 'ATTACK';

const H = 220;
const MID = 110;
const YARD = 10;

interface Point {
  readonly x: number;
  readonly y: number;
}

function windowStart(los: number, window: number): number {
  return Math.max(-10, Math.min(110 - window, los - Math.round(window / 3)));
}

function Stripes({
  start,
  window,
}: {
  readonly start: number;
  readonly window: number;
}): React.JSX.Element {
  const W = window * YARD;
  const x = (yard: number) => (yard - start) * YARD;
  const bands = [];
  for (let yard = Math.floor(start / 5) * 5; yard < start + window; yard += 5) {
    bands.push(
      <rect
        fill={Math.floor(yard / 5) % 2 === 0 ? '#12492d' : '#0f4128'}
        height={H}
        key={`band-${yard}`}
        width={5 * YARD}
        x={x(yard)}
        y={0}
      />,
    );
  }
  const lines = [];
  for (let yard = Math.ceil(start / 5) * 5; yard <= start + window; yard += 5) {
    if (yard < 0 || yard > 100) continue;
    lines.push(
      <line
        key={`line-${yard}`}
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={yard % 10 === 0 ? 1.4 : 0.8}
        x1={x(yard)}
        x2={x(yard)}
        y1={8}
        y2={H - 8}
      />,
    );
    if (yard % 10 === 0 && yard > 0 && yard < 100) {
      const label = String(yard <= 50 ? yard : 100 - yard);
      lines.push(
        <text
          fill="rgba(255,255,255,0.55)"
          fontFamily="'Barlow Condensed', 'Arial Narrow', sans-serif"
          fontSize={16}
          fontWeight={700}
          key={`num-${yard}`}
          textAnchor="middle"
          x={x(yard)}
          y={32}
        >
          {label}
        </text>,
      );
    }
    for (const hashY of [78, 142])
      lines.push(
        <line
          key={`hash-${yard}-${hashY}`}
          stroke="rgba(255,255,255,0.35)"
          strokeWidth={1}
          x1={x(yard) - 3}
          x2={x(yard) + 3}
          y1={hashY}
          y2={hashY}
        />,
      );
  }
  const endZones = [];
  if (start < 0)
    endZones.push(
      <rect fill="rgba(0,0,0,0.28)" height={H} key="ez-own" width={x(0)} x={0} y={0} />,
    );
  if (start + window > 100)
    endZones.push(
      <rect
        fill="rgba(245,197,66,0.16)"
        height={H}
        key="ez-goal"
        width={W - x(100)}
        x={x(100)}
        y={0}
      />,
    );
  return (
    <g>
      {bands}
      {endZones}
      {lines}
      <rect
        fill="none"
        height={H - 12}
        stroke="rgba(255,255,255,0.8)"
        strokeWidth={2}
        width={W}
        x={0}
        y={6}
      />
    </g>
  );
}

interface Formation {
  readonly offense: readonly Point[];
  readonly defense: readonly Point[];
  readonly qb: Point;
  readonly rb: Point;
  readonly cb: Point;
  readonly oppQb: Point;
  readonly targets: readonly Point[];
}

function formation(los: number): Formation {
  const offense: Point[] = [-24, -12, 0, 12, 24].map((dy) => ({ x: los - 6, y: MID + dy }));
  const qb = { x: los - 40, y: MID };
  const rb = { x: los - 62, y: MID + 14 };
  offense.push(
    qb,
    rb,
    { x: los - 6, y: MID + 40 },
    { x: los - 8, y: 30 },
    { x: los - 8, y: 190 },
    { x: los - 16, y: 58 },
  );
  const cb = { x: los + 52, y: 32 };
  const defense: Point[] = [
    ...[-30, -10, 10, 30].map((dy) => ({ x: los + 8, y: MID + dy })),
    { x: los + 48, y: 82 },
    { x: los + 48, y: 110 },
    { x: los + 48, y: 138 },
    cb,
    { x: los + 52, y: 188 },
    { x: los + 128, y: 72 },
    { x: los + 128, y: 148 },
  ];
  return {
    offense,
    defense,
    qb,
    rb,
    cb,
    oppQb: qb,
    targets: [
      { x: los + 70, y: 46 },
      { x: los + 150, y: 34 },
      { x: los + 95, y: 150 },
    ],
  };
}

function previewAim(kind: PreviewKind, index: number, f: Formation, athlete: Point): Point {
  return kind === 'PASS_SHORT'
    ? f.targets[0]!
    : kind === 'PASS_DEEP'
      ? f.targets[1]!
      : kind === 'SAFE'
        ? { x: athlete.x + 70, y: 2 }
        : kind === 'RUN'
          ? { x: athlete.x + 90, y: MID + [-44, 0, 44][index % 3]! }
          : kind === 'PROTECT'
            ? { x: athlete.x + 30, y: MID - 30 + index * 30 }
            : kind === 'COVER'
              ? { x: athlete.x + [10, 70, 40][index % 3]!, y: [40, 36, 80][index % 3]! }
              : { x: athlete.x + 40, y: athlete.y + 20 };
}

function previewPath(kind: PreviewKind, index: number, f: Formation, athlete: Point): string {
  const aim = previewAim(kind, index, f, athlete);
  const control = { x: (athlete.x + aim.x) / 2, y: Math.min(athlete.y, aim.y) - 36 };
  return kind === 'RUN' || kind === 'PROTECT' || kind === 'COVER' || kind === 'ATTACK'
    ? `M${athlete.x} ${athlete.y} L${aim.x} ${aim.y}`
    : `M${athlete.x} ${athlete.y} Q${control.x} ${control.y} ${aim.x} ${aim.y}`;
}

export interface TacticalBoardProps {
  readonly frame: SnapBoardFrame;
  readonly positionId: VNextPositionId;
  readonly teamColor: string;
  readonly opponentColor: string;
  readonly athleteLabel: string;
  readonly summary: string;
  readonly banner?: string;
  readonly preview: { readonly kind: PreviewKind; readonly index: number } | null;
  /** Localized short outcome tag drawn at the result spot (e.g. TD, INT). */
  readonly outcomeLabel?: string | undefined;
  /** The chosen decision's route: throws that end without a gain finish at its aim point. */
  readonly resultAim?: { readonly kind: PreviewKind; readonly index: number } | undefined;
  /** Kind of motion used to replay the saved result. */
  readonly resultMotion?: 'THROW' | 'CARRY' | 'DEFEND' | undefined;
  readonly reducedMotion: boolean;
  /** Increment to replay the saved animation. */
  readonly replayKey?: number;
  /** Narrow screens show a tighter 30-yard window so markers stay legible. */
  readonly compact?: boolean;
}

export function TacticalBoard(props: TacticalBoardProps): React.JSX.Element {
  const { frame } = props;
  const situation = frame.kind === 'LIVE' ? frame.situation : null;
  const losYards = situation?.lineOfScrimmageYards ?? 35;
  const window = props.compact === true ? 30 : 40;
  const W = window * YARD;
  const start = windowStart(losYards, window);
  const x = (yard: number) => (yard - start) * YARD;
  const los = x(losYards);
  const f = formation(los);
  const playerOnOffense =
    situation === null ? props.positionId !== 'position_cb' : situation.offense === 'PLAYER';
  const offenseColor = playerOnOffense ? props.teamColor : props.opponentColor;
  const defenseColor = playerOnOffense ? props.opponentColor : props.teamColor;
  const athlete =
    props.positionId === 'position_qb' ? f.qb : props.positionId === 'position_rb' ? f.rb : f.cb;
  const firstDown =
    situation !== null && situation.firstDownYards < 100 ? x(situation.firstDownYards) : null;
  const result = frame.kind === 'LIVE' ? frame.result : null;
  const endYards =
    result === null
      ? null
      : (result.ballEndYards ??
        Math.max(
          -5,
          Math.min(
            105,
            losYards + (props.positionId === 'position_cb' ? result.yards : result.yards),
          ),
        ));
  const aim =
    props.resultAim === undefined
      ? null
      : previewAim(props.resultAim.kind, props.resultAim.index, f, athlete);
  const thrownWithoutGain =
    props.resultMotion === 'THROW' &&
    result !== null &&
    (result.yards <= 0 || result.ballEndYards === null);
  const end: Point | null =
    endYards === null
      ? null
      : thrownWithoutGain && aim !== null
        ? { x: Math.max(4, Math.min(W - 4, aim.x)), y: Math.max(12, aim.y) }
        : {
            x: Math.max(4, Math.min(W - 4, x(endYards))),
            y:
              props.resultMotion === 'THROW'
                ? (aim?.y ?? 48)
                : props.resultMotion === 'DEFEND'
                  ? 40
                  : MID,
          };
  const motionStart =
    props.resultMotion === 'DEFEND' ? f.oppQb : props.resultMotion === 'THROW' ? f.qb : athlete;
  const motionPath =
    end === null
      ? null
      : props.resultMotion === 'CARRY'
        ? `M${motionStart.x} ${motionStart.y} L${end.x} ${end.y}`
        : `M${motionStart.x} ${motionStart.y} Q${(motionStart.x + end.x) / 2} ${Math.min(motionStart.y, end.y) - 50} ${end.x} ${end.y}`;
  const turnover = result?.outcome === 'TURNOVER';
  return (
    <figure className="s2-board" key={props.replayKey}>
      <svg aria-label={props.summary} role="img" viewBox={`0 0 ${W} ${H}`}>
        <Stripes start={start} window={window} />
        <line stroke="#5aa9ff" strokeWidth={3} x1={los} x2={los} y1={8} y2={H - 8} />
        {firstDown !== null && (
          <line stroke="#f5c542" strokeWidth={3} x1={firstDown} x2={firstDown} y1={8} y2={H - 8} />
        )}
        {f.defense.map((point, index) => (
          <g key={`d-${index}`} transform={`translate(${point.x} ${point.y})`}>
            <path
              d="M-5 -5 L5 5 M5 -5 L-5 5"
              stroke={defenseColor}
              strokeLinecap="round"
              strokeWidth={3}
            />
          </g>
        ))}
        {f.offense.map((point, index) => (
          <circle
            cx={point.x}
            cy={point.y}
            fill={offenseColor}
            key={`o-${index}`}
            r={6}
            stroke="#0b0f14"
            strokeWidth={1.5}
          />
        ))}
        {props.preview !== null && result === null && (
          <path
            d={previewPath(props.preview.kind, props.preview.index, f, athlete)}
            fill="none"
            markerEnd="url(#s2-arrow)"
            stroke="#f5c542"
            strokeDasharray="6 5"
            strokeWidth={3}
          />
        )}
        <defs>
          <marker id="s2-arrow" markerHeight={8} markerWidth={8} orient="auto" refX={6} refY={4}>
            <path d="M0 0 L8 4 L0 8 Z" fill="#f5c542" />
          </marker>
        </defs>
        <g transform={`translate(${athlete.x} ${athlete.y})`}>
          <circle fill="none" r={12} stroke="#f5c542" strokeWidth={3}>
            {!props.reducedMotion && result === null && (
              <animate attributeName="r" dur="1.4s" repeatCount="indefinite" values="11;14;11" />
            )}
          </circle>
          <rect fill="#f5c542" height={14} rx={2} width={34} x={-17} y={14} />
          <text
            fill="#16120a"
            fontFamily="'Barlow Condensed', 'Arial Narrow', sans-serif"
            fontSize={12}
            fontWeight={800}
            textAnchor="middle"
            y={25}
          >
            {props.athleteLabel}
          </text>
        </g>
        {situation !== null && result === null && (
          <ellipse
            cx={los - 2}
            cy={MID}
            fill="#8b4a22"
            rx={5}
            ry={3}
            stroke="#fff"
            strokeWidth={0.8}
          />
        )}
        {motionPath !== null && end !== null && (
          <g>
            <path
              d={motionPath}
              fill="none"
              stroke="rgba(245,197,66,0.6)"
              strokeDasharray="3 4"
              strokeWidth={2}
            />
            <ellipse
              cx={props.reducedMotion ? end.x : 0}
              cy={props.reducedMotion ? end.y : 0}
              fill="#8b4a22"
              rx={6}
              ry={3.5}
              stroke="#fff"
              strokeWidth={1}
            >
              {!props.reducedMotion && (
                <animateMotion dur="1.6s" fill="freeze" path={motionPath} rotate="auto" />
              )}
            </ellipse>
            {(turnover || props.outcomeLabel !== undefined) && (
              <g
                opacity={props.reducedMotion ? 1 : 0}
                transform={`translate(${end.x} ${Math.max(24, end.y - 22)})`}
              >
                {!props.reducedMotion && (
                  <animate
                    attributeName="opacity"
                    begin="1.5s"
                    dur="0.3s"
                    fill="freeze"
                    from="0"
                    to="1"
                  />
                )}
                <rect
                  fill={turnover ? '#ff5a5f' : '#f5c542'}
                  height={22}
                  rx={3}
                  width={56}
                  x={-28}
                  y={-15}
                />
                <text
                  fill="#0b0f14"
                  fontFamily="'Barlow Condensed', 'Arial Narrow', sans-serif"
                  fontSize={15}
                  fontWeight={800}
                  textAnchor="middle"
                >
                  {props.outcomeLabel}
                </text>
              </g>
            )}
          </g>
        )}
      </svg>
      {props.banner !== undefined && (
        <figcaption className="s2-board__banner">{props.banner}</figcaption>
      )}
    </figure>
  );
}
