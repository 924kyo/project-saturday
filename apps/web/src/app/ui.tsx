import type { ProgramIdentityVNext } from '@project-saturday/game-content/content';
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
