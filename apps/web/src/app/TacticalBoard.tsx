import type { SnapBoardFrame, VNextPositionId } from '@project-saturday/game-core';

import {
  BOARD_H,
  MID,
  YARD,
  buildScene,
  lookArrows,
  pathD,
  resultMotion,
  techniquePath,
  type ResultMotion,
  type Scene,
  isDefense,
} from './board';
import { BOARD_TURF, readableOn } from './theme';

const FONT = "'Barlow Condensed', 'Arial Narrow', sans-serif";
const VOLT = '#c8ff2e';
const HOT = '#ff4d6a';
const CHALK = '#f4f7ff';

function Field({ scene, teamColor }: { readonly scene: Scene; readonly teamColor: string }) {
  const { start, width, x } = scene;
  const window = width / YARD;
  const items: React.JSX.Element[] = [];
  for (let yard = Math.floor(start / 5) * 5; yard < start + window; yard += 5)
    items.push(
      <rect
        fill={Math.floor(yard / 5) % 2 === 0 ? '#0e3d25' : '#0c3520'}
        height={BOARD_H}
        key={`b${yard}`}
        width={5 * YARD}
        x={x(yard)}
        y={0}
      />,
    );
  if (start < 0)
    items.push(
      <rect fill={teamColor} height={BOARD_H} key="ez0" opacity={0.28} width={x(0)} x={0} y={0} />,
    );
  if (start + window > 100)
    items.push(
      <rect
        fill="url(#s2-endzone)"
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
        stroke="rgba(244,247,255,0.5)"
        strokeWidth={yard % 10 === 0 ? 1.4 : 0.7}
        x1={x(yard)}
        x2={x(yard)}
        y1={8}
        y2={BOARD_H - 8}
      />,
    );
    if (yard % 10 === 0 && yard > 0 && yard < 100)
      for (const numberY of [26, BOARD_H - 14])
        items.push(
          <text
            fill="rgba(244,247,255,0.42)"
            fontFamily={FONT}
            fontSize={17}
            fontWeight={800}
            key={`n${yard}${numberY}`}
            textAnchor="middle"
            x={x(yard)}
            y={numberY}
          >
            {String(yard <= 50 ? yard : 100 - yard)}
          </text>,
        );
    for (const hashY of [78, 142])
      items.push(
        <line
          key={`h${yard}${hashY}`}
          stroke="rgba(244,247,255,0.35)"
          x1={x(yard) - 3}
          x2={x(yard) + 3}
          y1={hashY}
          y2={hashY}
        />,
      );
  }
  items.push(
    <rect fill="url(#s2-vignette)" height={BOARD_H} key="vignette" width={width} x={0} y={0} />,
  );
  items.push(
    <rect
      fill="none"
      height={BOARD_H - 12}
      key="frame"
      stroke="rgba(244,247,255,0.75)"
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
  keyed,
}: {
  readonly at: { x: number; y: number };
  readonly color: string;
  readonly cross: boolean;
  readonly hidden: boolean;
  readonly keyed: boolean;
}) {
  if (hidden) return null;
  const ring = keyed ? (
    <circle
      cx={at.x}
      cy={at.y}
      fill="none"
      r={10}
      stroke={HOT}
      strokeOpacity={0.9}
      strokeWidth={1.6}
    />
  ) : null;
  return !cross ? (
    <g>
      {ring}
      <circle cx={at.x} cy={at.y} fill={color} r={6.5} stroke={CHALK} strokeWidth={1.4} />
    </g>
  ) : (
    <g>
      {ring}
      <path
        d={`M${at.x - 5} ${at.y - 5} L${at.x + 5} ${at.y + 5} M${at.x + 5} ${at.y - 5} L${at.x - 5} ${at.y + 5}`}
        stroke="#05070a"
        strokeLinecap="round"
        strokeWidth={5.5}
      />
      <path
        d={`M${at.x - 5} ${at.y - 5} L${at.x + 5} ${at.y + 5} M${at.x + 5} ${at.y - 5} L${at.x - 5} ${at.y + 5}`}
        stroke={color}
        strokeLinecap="round"
        strokeWidth={3}
      />
    </g>
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
  readonly legend?: { readonly presnap: string; readonly read: string };
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
  // Program colors can match the turf; markers lift toward white until they read on grass.
  const team = readableOn(props.teamColor, BOARD_TURF);
  const opponent = readableOn(props.opponentColor, BOARD_TURF);
  const offenseColor = scene.playerOnOffense ? team : opponent;
  const defenseColor = scene.playerOnOffense ? opponent : team;
  const result = frame.kind === 'LIVE' ? frame.result : null;
  const motion = frame.kind === 'LIVE' ? resultMotion(scene, frame, positionId) : null;
  const previewIndex =
    props.previewDecisionId === null ? -1 : frame.decisionIds.indexOf(props.previewDecisionId);
  const preview =
    props.previewDecisionId !== null && result === null
      ? techniquePath(scene, props.previewDecisionId, previewIndex)
      : null;
  const athleteOnDefense = isDefense(positionId);
  const arrows = lookArrows(scene, frame);
  const keyed = new Set(arrows.filter(({ kind }) => kind === 'read').map(({ actor }) => actor));
  const keyedPoints = new Set([...keyed].map((actor) => scene.actors[actor]));
  const animate = !props.reducedMotion && motion !== null;
  const hasPresnap = arrows.some(({ kind }) => kind === 'presnap');
  const hasRead = arrows.some(({ kind }) => kind === 'read');
  return (
    <figure className="s2-board" key={props.replayKey}>
      <svg aria-label={props.summary} role="img" viewBox={`0 0 ${scene.width} ${BOARD_H}`}>
        <defs>
          <marker
            id="s2-arrow"
            markerHeight={9}
            markerUnits="userSpaceOnUse"
            markerWidth={9}
            orient="auto"
            refX={6}
            refY={4}
          >
            <path d="M0 0 L8 4 L0 8 Z" fill={VOLT} />
          </marker>
          <marker
            id="s2-arrow-hot"
            markerHeight={10}
            markerUnits="userSpaceOnUse"
            markerWidth={10}
            orient="auto"
            refX={6}
            refY={4}
          >
            <path d="M0 0 L8 4 L0 8 Z" fill={HOT} />
          </marker>
          <marker
            id="s2-arrow-chalk"
            markerHeight={8}
            markerUnits="userSpaceOnUse"
            markerWidth={8}
            orient="auto"
            refX={5}
            refY={3.5}
          >
            <path d="M0 0 L7 3.5 L0 7 Z" fill={CHALK} />
          </marker>
          <radialGradient cx="50%" cy="50%" id="s2-vignette" r="75%">
            <stop offset="60%" stopColor="#000" stopOpacity={0} />
            <stop offset="100%" stopColor="#000" stopOpacity={0.45} />
          </radialGradient>
          <linearGradient id="s2-endzone" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={VOLT} stopOpacity={0.08} />
            <stop offset="100%" stopColor={VOLT} stopOpacity={0.22} />
          </linearGradient>
          <filter height="200%" id="s2-glow" width="200%" x="-50%" y="-50%">
            <feGaussianBlur result="blur" stdDeviation={2.2} />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <Field scene={scene} teamColor={props.teamColor} />
        <line
          filter="url(#s2-glow)"
          stroke="#38d6ff"
          strokeWidth={3}
          x1={scene.los}
          x2={scene.los}
          y1={8}
          y2={BOARD_H - 8}
        />
        {scene.firstDown !== null && (
          <line
            filter="url(#s2-glow)"
            stroke="#ffd23d"
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
              fill="rgba(244,247,255,0.75)"
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
        {/* The look: how they line up (markers) and how they move (arrows the tells exposed). */}
        {arrows.map((arrow, index) => {
          const opponent = arrow.offense !== scene.playerOnOffense;
          const stroke = arrow.kind === 'presnap' ? CHALK : opponent ? HOT : CHALK;
          return (
            <path
              className={`s2-board__look s2-board__look--${arrow.kind}`}
              d={arrow.d}
              fill="none"
              filter={arrow.kind === 'read' ? 'url(#s2-glow)' : undefined}
              key={`look${index}`}
              markerEnd={
                arrow.kind === 'read' && opponent ? 'url(#s2-arrow-hot)' : 'url(#s2-arrow-chalk)'
              }
              opacity={arrow.kind === 'presnap' ? 0.7 : 0.95}
              pathLength={arrow.kind === 'read' ? 1 : undefined}
              stroke={stroke}
              strokeDasharray={arrow.kind === 'presnap' ? '5 5' : undefined}
              strokeLinecap="round"
              strokeWidth={arrow.kind === 'presnap' ? 2 : 2.6}
            />
          );
        })}
        {scene.defense.map((point, index) => (
          <Marker
            at={point}
            color={defenseColor}
            cross={!athleteOnDefense}
            hidden={athleteOnDefense && point === scene.athlete}
            key={`d${index}`}
            keyed={keyedPoints.has(point) && scene.playerOnOffense}
          />
        ))}
        {scene.offense.map((point, index) => (
          <Marker
            at={point}
            color={offenseColor}
            cross={athleteOnDefense}
            hidden={!athleteOnDefense && point === scene.athlete}
            key={`o${index}`}
            keyed={keyedPoints.has(point) && !scene.playerOnOffense}
          />
        ))}
        {preview !== null && (
          <path
            d={pathD(preview)}
            fill="none"
            filter="url(#s2-glow)"
            markerEnd={preview.kind === 'read' ? undefined : 'url(#s2-arrow)'}
            stroke={VOLT}
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
                  stroke={best ? VOLT : '#ffd23d'}
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
                stroke="rgba(200,255,46,0.6)"
                strokeDasharray="3 4"
                strokeWidth={2}
              />
            )}
            {motion.ball !== null && (
              <path
                d={motion.ball}
                fill="none"
                stroke="rgba(244,247,255,0.5)"
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
          <circle fill={team} r={8} stroke={CHALK} strokeWidth={1.6} />
          <circle fill="none" filter="url(#s2-glow)" r={13} stroke={VOLT} strokeWidth={3}>
            {!props.reducedMotion && result === null && (
              <animate attributeName="r" dur="1.4s" repeatCount="indefinite" values="12;15;12" />
            )}
          </circle>
          <rect fill={VOLT} height={14} rx={2} width={30} x={-15} y={15} />
          <text
            fill="#0a0d05"
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
            stroke={CHALK}
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
            stroke={CHALK}
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
            transform={`translate(${Math.min(scene.width - 34, Math.max(34, motion.end.x))} ${Math.max(24, motion.end.y - 24)})`}
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
                  ? HOT
                  : motion.tag === 'td'
                    ? VOLT
                    : '#ffd23d'
              }
              height={22}
              rx={3}
              width={62}
              x={-31}
              y={-15}
            />
            <text
              fill="#05070a"
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
      {props.legend !== undefined && (hasPresnap || hasRead) && (
        <p aria-hidden="true" className="s2-board__legend">
          {hasPresnap && (
            <span className="s2-board__key s2-board__key--presnap">{props.legend.presnap}</span>
          )}
          {hasRead && (
            <span className="s2-board__key s2-board__key--read">{props.legend.read}</span>
          )}
        </p>
      )}
    </figure>
  );
}
