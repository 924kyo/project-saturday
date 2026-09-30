import { useState, type CSSProperties } from 'react';
import {
  programCultureVNext,
  type ProgramIdentityVNext,
} from '@project-saturday/game-content/content';

import { useAppTranslation } from '../i18n/i18n';
import { key } from './content';
import { inkOn } from './theme';

/**
 * The mascot medallion: the program's emblem art (`/art/mascots/<emblem>.webp`, a white silhouette
 * tinted with the trim color) on the primary color. Without the art file the mask shows nothing and
 * the monogram underneath stands in.
 */
export function ProgramEmblem({
  identity,
  size = 56,
}: {
  readonly identity: ProgramIdentityVNext;
  readonly size?: number;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  const [artReady, setArtReady] = useState(false);
  const culture = programCultureVNext(identity.id);
  if (culture === null) return null;
  const art = `/art/mascots/${culture.emblem}.webp`;
  return (
    <span
      aria-label={t(key(culture.mascotKey))}
      className="s2-emblem"
      role="img"
      style={
        {
          '--size': `${size}px`,
          '--c1': identity.primary,
          '--c2': identity.secondary,
          '--ink': inkOn(identity.primary),
          '--emblem': `url('${art}')`,
        } as CSSProperties
      }
    >
      {/* A hidden probe: the monogram steps aside only once the emblem art actually loaded. */}
      <img alt="" hidden onLoad={() => setArtReady(true)} src={art} />
      {!artReady && (
        <span aria-hidden="true" className="s2-emblem__mono s2-display">
          {identity.monogram}
        </span>
      )}
      <span aria-hidden="true" className="s2-emblem__art" />
    </span>
  );
}
