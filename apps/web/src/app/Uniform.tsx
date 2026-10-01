import { useState, type CSSProperties } from 'react';
import type { ProgramIdentityVNext } from '@project-saturday/game-content/content';

import { assetUrl } from './asset-url';
import { inkOn } from './theme';

/** Four cuts, chosen from the crest so a program always wears the same one. */
const STYLE_BY_CREST = {
  shield: 'classic',
  circle: 'modern',
  diamond: 'stripe',
  pennant: 'retro',
} as const;

/**
 * Home jersey in the program's colors. The drawn jersey is the fallback; tintable art layers
 * (`/art/uniforms/<style>-base.webp` in the primary color, `-trim.webp` in the trim) replace it once
 * the base layer loads.
 */
export function UniformPreview({
  identity,
  number,
  label,
}: {
  readonly identity: ProgramIdentityVNext;
  readonly number: string;
  readonly label: string;
}): React.JSX.Element {
  const [artReady, setArtReady] = useState(false);
  const style = STYLE_BY_CREST[identity.crest];
  const ink = inkOn(identity.primary);
  const base = assetUrl(`art/uniforms/${style}-base.webp`);
  return (
    <figure
      aria-label={label}
      className="s2-uniform"
      role="img"
      style={
        {
          '--c1': identity.primary,
          '--c2': identity.secondary,
          '--base': `url('${base}')`,
          '--trim': `url('${assetUrl(`art/uniforms/${style}-trim.webp`)}')`,
        } as CSSProperties
      }
    >
      <img alt="" hidden onLoad={() => setArtReady(true)} src={base} />
      {artReady ? (
        <>
          <span aria-hidden="true" className="s2-uniform__layer s2-uniform__layer--base" />
          <span aria-hidden="true" className="s2-uniform__layer s2-uniform__layer--trim" />
          <span aria-hidden="true" className="s2-uniform__number s2-display" style={{ color: ink }}>
            {number}
          </span>
        </>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 120 130">
          <path
            d="M38 8 L50 4 Q60 14 70 4 L82 8 L112 26 L102 52 L90 46 L90 124 L30 124 L30 46 L18 52 L8 26 Z"
            fill={identity.primary}
            stroke="rgba(5,7,10,0.6)"
            strokeWidth={2}
          />
          <path d="M8 26 L18 52 L30 46 L30 38 L14 22 Z" fill={identity.secondary} />
          <path d="M112 26 L102 52 L90 46 L90 38 L106 22 Z" fill={identity.secondary} />
          <path d="M50 4 Q60 14 70 4 L66 3 Q60 9 54 3 Z" fill={identity.secondary} />
          {style === 'stripe' && (
            <rect fill={identity.secondary} height={8} width={60} x={30} y={96} />
          )}
          {style === 'retro' && (
            <path d="M30 60 L90 60 L90 66 L30 66 Z" fill={identity.secondary} opacity={0.9} />
          )}
          <text
            fill={ink}
            fontFamily="'Barlow Condensed', 'Arial Narrow', sans-serif"
            fontSize={40}
            fontWeight={900}
            textAnchor="middle"
            x={60}
            y={92}
          >
            {number}
          </text>
        </svg>
      )}
    </figure>
  );
}
