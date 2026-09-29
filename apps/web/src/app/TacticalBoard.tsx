import type { SnapBoardFrame, VNextPositionId } from '@project-saturday/game-core';

import {
  BOARD_H,
  MID,
  YARD,
  buildScene,
  pathD,
  resultMotion,
  techniquePath,
  type ResultMotion,
  type Scene,
} from './board';

const FONT = "'Barlow Condensed', 'Arial Narrow', sans-serif";

function Field({ scene }: { readonly scene: Scene }): React.JSX.Element {
  const { start, width, x } = scene;
  const window = width / YARD;
  const items: React.JSX.Element[] = [];
  for (let yard = Math.floor(start / 5) * 5; yard < start + window; yard += 5)
    items.push(
      <rect
        fill={Math.floor(yard / 5) % 2 === 0 ? '#12492d' : '#0f4128'}
        height={BOARD_H}
        key={`b${yard}`}
        width={5 * YARD}
        x={x(yard)}
        y={0}
      />,
    );
  if (start < 0)
    items.push(
      <rect fill="rgba(0,0,0,0.28)" height={BOARD_H} key="ez0" width={x(0)} x={0} y={0} />,
    );
  if (start + window > 100)
    items.push(
      <rect
        fill="rgba(245,197,66,0.16)"
        height={BOARD_H}
        key="ez1"
        width={width - x(100)}
        x={x(100)}
        y={0}
      />,
    );
  for (let yard = Math.ceil(start / 5) * 5; yard <= start + window; yard += 5) {
    if (yard < 0 || yard > 100) continue;
    items.push(
      <line
        key={`l${yard}`}
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={yard % 10 === 0 ? 1.4 : 0.8}
        x1={x(yard)}
        x2={x(yard)}
        y1={8}
        y2={BOARD_H - 8}
      />,
    );
    if (yard % 10 === 0 && yard > 0 && yard < 100)
      items.push(
        <text
          fill="rgba(255,255,255,0.5)"
          fontFamily={FONT}
          fontSize={16}
          fontWeight={700}
          key={`n${yard}`}
          textAnchor="middle"
          x={x(yard)}
          y={24}
        >
          {String(yard <= 50 ? yard : 100 - yard)}
        </text>,
      );
    for (const hashY of [78, 142])
      items.push(
        <line
          key={`h${yard}${hashY}`}
          stroke="rgba(255,255,255,0.35)"
          x1={x(yard) - 3}
          x2={x(yard) + 3}
          y1={hashY}
          y2={hashY}
        />,
      );
  }
  items.push(
    <rect
      fill="none"
      height={BOARD_H - 12}
      key="frame"
      stroke="rgba(255,255,255,0.8)"
      strokeWidth={2}
      width={width}
      x={0}
      y={6}
    />,
  );
  return <g>{items}</g>;
}

function Marker({
  at,
  color,
  cross,
  hidden,
}: {
  readonly at: { x: number; y: number };
  readonly color: string;
  readonly cross: boolean;
  readonly hidden: boolean;
}) {
  if (hidden) return null;
  return !cross ? (
    <circle cx={at.x} cy={at.y} fill={color} r={6.5} stroke="#0b0f14" strokeWidth={1.5} />
  ) : (
    <path
      d={`M${at.x - 5} ${at.y - 5} L${at.x + 5} ${at.y + 5} M${at.x + 5} ${at.y - 5} L${at.x - 5} ${at.y + 5}`}
      stroke={color}
      strokeLinecap="round"
      strokeWidth={3}
    />
  );
}

export interface TacticalBoardProps {
  readonly frame: SnapBoardFrame;
  readonly positionId: VNextPositionId;
  readonly teamColor: string;
  readonly opponentColor: string;
  readonly athleteLabel: string;
  readonly summary: string;
  readonly banner?: string;
  readonly previewDecisionId: string | null;
  readonly tagLabels: Readonly<Record<NonNullable<ResultMotion['tag']>, string>>;
  readonly gapLabels: readonly [string, string, string];
  readonly reducedMotion: boolean;
  readonly replayKey?: number;
  readonly compact: boolean;
}

/** Stages: technique 0–0.9 s, ball/carry 0.6–1.6 s, outcome tag at 1.6 s. Skip-free under reduced motion. */
export function TacticalBoard(props: TacticalBoardProps): React.JSX.Element {
  const { frame, positionId } = props;
  const scene = buildScene(frame, positionId, props.compact);
  const offenseColor = scene.playerOnOffense ? props.teamColor : props.opponentColor;
  const defenseColor = scene.playerOnOffense ? props.opponentColor : props.teamColor;
  const result = frame.kind === 'LIVE' ? frame.result : null;
  const motion = frame.kind === 'LIVE' ? resultMotion(scene, frame, positionId) : null;
  const previewIndex =
    props.previewDecisionId === null ? -1 : frame.decisionIds.indexOf(props.previewDecisionId);
  const preview =
    props.previewDecisionId !== null && result === null
      ? techniquePath(scene, props.previewDecisionId, previewIndex)
      : null;
  const athleteOnDefense = positionId === 'position_cb';
  const focusDefender =
    positionId === 'position_wr' ? scene.cb : positionId === 'position_cb' ? scene.wr : null;
  const animate = !props.reducedMotion && motion !== null;
  return (
    <figure className="s2-board" key={props.replayKey}>
      <svg aria-label={props.summary} role="img" viewBox={`0 0 ${scene.width} ${BOARD_H}`}>
        <defs>
          <marker id="s2-arrow" markerHeight={8} markerWidth={8} orient="auto" refX={6} refY={4}>
            <path d="M0 0 L8 4 L0 8 Z" fill="#f5c542" />
          </marker>
        </defs>
        <Field scene={scene} />
        <line
          stroke="#5aa9ff"
          strokeWidth={3}
          x1={scene.los}
          x2={scene.los}
          y1={8}
          y2={BOARD_H - 8}
        />
        {scene.firstDown !== null && (
          <line
            stroke="#f5c542"
            strokeWidth={3}
            x1={scene.firstDown}
            x2={scene.firstDown}
            y1={8}
            y2={BOARD_H - 8}
          />
        )}
        {positionId === 'position_rb' &&
          scene.gapLabels.map((point, index) => (
            <text
              fill="rgba(255,255,255,0.75)"
              fontFamily={FONT}
              fontSize={11}
              fontWeight={800}
              key={`g${index}`}
              x={point.x}
              y={point.y}
            >
              {props.gapLabels[index]}
            </text>
          ))}
        {scene.defense.map((point, index) => (
          <Marker
            at={point}
            color={defenseColor}
            hidden={athleteOnDefense && point === scene.cb}
            key={`d${index}`}
            cross={!athleteOnDefense}
          />
        ))}
        {scene.offense.map((point, index) => (
          <Marker
            at={point}
            color={offenseColor}
            hidden={!athleteOnDefense && point === scene.athlete}
            key={`o${index}`}
            cross={athleteOnDefense}
          />
        ))}
        {focusDefender !== null && (
          <circle
            cx={focusDefender.x}
            cy={focusDefender.y}
            fill="none"
            r={11}
            stroke="#ff5a5f"
            strokeDasharray="3 3"
            strokeWidth={2}
          />
        )}
        {preview !== null && (
          <path
            d={pathD(preview)}
            fill="none"
            markerEnd={preview.kind === 'read' ? undefined : 'url(#s2-arrow)'}
            stroke="#f5c542"
            strokeDasharray={preview.kind === 'read' ? '2 5' : '7 5'}
            strokeLinecap="round"
            strokeWidth={preview.kind === 'read' ? 2 : 3}
          />
        )}
        {frame.kind === 'SIDELINE' &&
          frame.result !== null &&
          [frame.result.bestDecisionId, frame.result.decisionId]
            .filter((id, index, list) => list.indexOf(id) === index)
            .map((id) => {
              const path = techniquePath(scene, id, frame.decisionIds.indexOf(id));
              const best = id === frame.result!.bestDecisionId;
              return (
                <path
                  d={pathD(path)}
                  fill="none"
                  key={`rep-${id}`}
                  markerEnd={path.kind === 'read' ? undefined : 'url(#s2-arrow)'}
                  stroke={best ? '#3ecf8e' : '#f5c542'}
                  strokeDasharray="7 5"
                  strokeLinecap="round"
                  strokeWidth={3}
                />
              );
            })}
        {motion !== null && (
          <g>
            {motion.athlete !== null && (
              <path
                d={motion.athlete}
                fill="none"
                stroke="rgba(245,197,66,0.55)"
                strokeDasharray="3 4"
                strokeWidth={2}
              />
            )}
            {motion.ball !== null && (
              <path
                d={motion.ball}
                fill="none"
                stroke="rgba(255,255,255,0.45)"
                strokeDasharray="2 4"
                strokeWidth={1.5}
              />
            )}
          </g>
        )}
        {/* The athlete: static before the snap, following the saved technique after it. */}
        <g
          transform={
            animate && motion?.athlete
              ? undefined
              : `translate(${(motion?.athlete && props.reducedMotion ? motion.end : scene.athlete).x} ${(motion?.athlete && props.reducedMotion ? motion.end : scene.athlete).y})`
          }
        >
          {animate && motion?.athlete && (
            <animateMotion dur="1.6s" fill="freeze" path={motion.athlete} />
          )}
          <circle fill={props.teamColor} r={8} stroke="#0b0f14" strokeWidth={1.5} />
          <circle fill="none" r={13} stroke="#f5c542" strokeWidth={3}>
            {!props.reducedMotion && result === null && (
              <animate attributeName="r" dur="1.4s" repeatCount="indefinite" values="12;15;12" />
            )}
          </circle>
          <rect fill="#f5c542" height={14} rx={2} width={30} x={-15} y={15} />
          <text
            fill="#16120a"
            fontFamily={FONT}
            fontSize={12}
            fontWeight={800}
            textAnchor="middle"
            y={26}
          >
            {props.athleteLabel}
          </text>
        </g>
        {frame.kind === 'LIVE' && result === null && (
          <ellipse
            cx={scene.los - 2}
            cy={MID}
            fill="#8b4a22"
            rx={5}
            ry={3}
            stroke="#fff"
            strokeWidth={0.8}
          />
        )}
        {motion?.ball != null && (
          <ellipse
            cx={props.reducedMotion ? motion.end.x : 0}
            cy={props.reducedMotion ? motion.end.y : 0}
            fill="#8b4a22"
            rx={6}
            ry={3.5}
            stroke="#fff"
            strokeWidth={1}
          >
            {animate && (
              <animateMotion begin="0.6s" dur="1s" fill="freeze" path={motion.ball} rotate="auto" />
            )}
          </ellipse>
        )}
        {motion?.tag != null && (
          <g
            opacity={props.reducedMotion ? 1 : 0}
            transform={`translate(${motion.end.x} ${Math.max(24, motion.end.y - 24)})`}
          >
            {animate && (
              <animate
                attributeName="opacity"
                begin="1.6s"
                dur="0.25s"
                fill="freeze"
                from="0"
                to="1"
              />
            )}
            <rect
              fill={
                motion.tag === 'int' || motion.tag === 'fumble' || motion.tag === 'sack'
                  ? '#ff5a5f'
                  : motion.tag === 'td'
                    ? '#3ecf8e'
                    : '#f5c542'
              }
              height={22}
              rx={3}
              width={62}
              x={-31}
              y={-15}
            />
            <text
              fill="#0b0f14"
              fontFamily={FONT}
              fontSize={14}
              fontWeight={800}
              textAnchor="middle"
            >
              {props.tagLabels[motion.tag]}
            </text>
          </g>
        )}
      </svg>
      {props.banner !== undefined && (
        <figcaption className="s2-board__banner">{props.banner}</figcaption>
      )}
    </figure>
  );
}
