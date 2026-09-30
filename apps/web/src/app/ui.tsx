import type { ProgramIdentityVNext } from '@project-saturday/game-content/content';
import type { VNextPositionId } from '@project-saturday/game-core';
import { useId, type CSSProperties, type ReactNode } from 'react';

/** Original generated crest: shape + palette + monogram. Decorative; callers label it. */
export function Crest({
  identity,
  size = 56,
}: {
  readonly identity: ProgramIdentityVNext;
  readonly size?: number;
}): React.JSX.Element {
  const { primary, secondary, monogram, crest } = identity;
  const shape =
    crest === 'shield'
      ? 'M50 4 L92 18 L88 62 Q84 86 50 98 Q16 86 12 62 L8 18 Z'
      : crest === 'diamond'
        ? 'M50 3 L96 50 L50 97 L4 50 Z'
        : crest === 'pennant'
          ? 'M8 10 L92 10 L92 70 L50 96 L8 70 Z'
          : 'M50 4 A46 46 0 1 1 49.9 4 Z';
  return (
    <svg aria-hidden="true" className="s2-crest" height={size} viewBox="0 0 100 100" width={size}>
      <path d={shape} fill={secondary} />
      <path d={shape} fill={primary} transform="translate(50 50) scale(0.84) translate(-50 -50)" />
      <text
        dominantBaseline="central"
        fill={secondary}
        fontFamily="'Barlow Condensed', 'Arial Narrow', sans-serif"
        fontSize={monogram.length > 2 ? 30 : 38}
        fontWeight={800}
        textAnchor="middle"
        x="50"
        y="52"
      >
        {monogram}
      </text>
    </svg>
  );
}

export function Meter({
  label,
  value,
  after,
  color,
}: {
  readonly label: string;
  readonly value: number;
  readonly after?: number | undefined;
  readonly color: string;
}): React.JSX.Element {
  const labelId = useId();
  const shown = after ?? value;
  const delta = after === undefined ? 0 : after - value;
  const low = Math.min(value, shown);
  const high = Math.max(value, shown);
  return (
    <div className="s2-meter" style={{ '--meter': color } as CSSProperties}>
      <span className="s2-meter__label" id={labelId}>
        {label}
      </span>
      <span
        aria-labelledby={labelId}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={shown}
        className="s2-meter__track"
        role="meter"
      >
        <span className="s2-meter__fill" style={{ width: `${low}%` }} />
        {delta !== 0 && (
          <span className="s2-meter__ghost" style={{ left: `${low}%`, width: `${high - low}%` }} />
        )}
      </span>
      <span className="s2-meter__value s2-num">
        {shown}
        {delta !== 0 && (
          <span className={`s2-meter__delta ${delta > 0 ? 's2-up' : 's2-down'}`}>
            {' '}
            {delta > 0 ? '+' : '−'}
            {Math.abs(delta)}
          </span>
        )}
      </span>
    </div>
  );
}

export function Panel({
  title,
  aside,
  children,
  className = '',
  id,
}: {
  readonly title?: ReactNode;
  readonly aside?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly id?: string;
}): React.JSX.Element {
  return (
    <section aria-labelledby={id} className={`s2-panel ${className}`}>
      {(title !== undefined || aside !== undefined) && (
        <div className="s2-panel__head">
          {title !== undefined && (
            <h2 className="s2-eyebrow" id={id}>
              {title}
            </h2>
          )}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Delta({ value }: { readonly value: number }): React.JSX.Element | null {
  if (value === 0) return null;
  return (
    <span className={value > 0 ? 's2-up' : 's2-down'}>
      {value > 0 ? '+' : '−'}
      {Math.abs(value)}
    </span>
  );
}

/** The Project Saturday mark: a laced ball cutting through two yard lines. Decorative. */
export function LogoMark({ size = 30 }: { readonly size?: number }): React.JSX.Element {
  return (
    <svg aria-hidden="true" className="s2-logo" height={size} viewBox="0 0 64 64" width={size}>
      <path
        d="M4 18 H60 M4 46 H60"
        stroke="currentColor"
        strokeLinecap="round"
        strokeOpacity={0.35}
        strokeWidth={3}
      />
      <g transform="rotate(-38 32 32)">
        <ellipse cx="32" cy="32" fill="var(--volt)" rx="22" ry="13" />
        <path d="M22 32 H42" stroke="#0b0f02" strokeLinecap="round" strokeWidth={2.6} />
        <path
          d="M27 28.5 V35.5 M32 28 V36 M37 28.5 V35.5"
          stroke="#0b0f02"
          strokeLinecap="round"
          strokeWidth={2.2}
        />
      </g>
    </svg>
  );
}

const O = (cx: number, cy: number) => (
  <circle cx={cx} cy={cy} fill="none" r={3.6} strokeWidth={2.2} />
);
const X = (cx: number, cy: number) => (
  <path
    d={`M${cx - 3.4} ${cy - 3.4} L${cx + 3.4} ${cy + 3.4} M${cx + 3.4} ${cy - 3.4} L${cx - 3.4} ${cy + 3.4}`}
    strokeWidth={2.2}
  />
);

/** Playbook glyphs: each position drawn as its signature assignment (O = you, X = them). */
export function PositionGlyph({
  positionId,
  size = 44,
}: {
  readonly positionId: VNextPositionId;
  readonly size?: number;
}): React.JSX.Element {
  const art: Record<VNextPositionId, React.JSX.Element> = {
    position_qb: (
      <>
        {O(12, 34)}
        <path d="M16 31 Q28 8 42 12" fill="none" strokeDasharray="3 3" strokeWidth={2} />
        <path d="M39 8 L43 12 L38 15" fill="none" strokeWidth={2} />
        {X(38, 28)}
      </>
    ),
    position_rb: (
      <>
        {O(10, 36)}
        <path d="M14 34 L24 26 L26 16 L40 10" fill="none" strokeWidth={2.2} />
        <path d="M37 7 L41 10 L37 14" fill="none" strokeWidth={2} />
        {X(22, 12)}
        {X(34, 26)}
      </>
    ),
    position_wr: (
      <>
        {O(10, 38)}
        <path d="M10 34 V14 L30 10" fill="none" strokeWidth={2.2} />
        <path d="M27 6 L31 10 L27 14" fill="none" strokeWidth={2} />
        {X(20, 22)}
        {X(38, 26)}
      </>
    ),
    position_cb: (
      <>
        {X(12, 36)}
        {O(22, 36)}
        <path d="M12 31 V12" fill="none" strokeDasharray="3 3" strokeWidth={2} />
        <path d="M22 31 V10" fill="none" strokeWidth={2} />
        <path d="M18 13 L22 9 L26 13" fill="none" strokeWidth={2} />
      </>
    ),
    position_lb: (
      <>
        {X(24, 34)}
        <path d="M24 29 L24 20 L14 12" fill="none" strokeWidth={2.2} />
        <path d="M14 17 L13 11 L19 11" fill="none" strokeWidth={2} />
        {O(10, 20)}
        {O(38, 20)}
      </>
    ),
    position_edge: (
      <>
        {X(38, 36)}
        <path d="M36 31 Q34 14 22 12 L14 16" fill="none" strokeWidth={2.2} />
        <path d="M19 10 L13 16 L19 20" fill="none" strokeWidth={2} />
        {O(10, 26)}
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      className="s2-glyph"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 48 48"
      width={size}
    >
      {art[positionId]}
    </svg>
  );
}
