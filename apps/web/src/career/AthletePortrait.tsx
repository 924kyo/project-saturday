import './athlete-portrait.css';
import { useContext, useEffect, useState } from 'react';
import type { PlayerAppearance } from '@project-saturday/game-core';

import {
  overlayTransform,
  portraitArtUrl,
  usePortraitOverlays,
  type OverlayMatrix,
  type PortraitOverlays,
} from './portrait-overlays';
import { GearContext, gearTints, type GearTints } from './gear';

export interface AthletePortraitProps {
  readonly appearance: PlayerAppearance;
  readonly label: string;
  readonly size?: 'compact' | 'card' | 'profile';
}

function optionalId(value: string | null): string {
  return value ?? 'none';
}

const tail = (id: string, prefix: string) => id.slice(prefix.length);

interface PortraitLayer {
  readonly src: string;
  readonly tint?: string;
  /** Per-face placement (hair and facial hair only); other layers keep identity placement. */
  readonly matrix?: OverlayMatrix;
}

/**
 * The painted bust (Round 3 v3, `docs/design/ASSET_LIST.md`): every layer shares one 512 × 640
 * canvas. Bottom to top: skin, sleeves, jersey, jersey trim, head, facial hair, hair, eye black,
 * towel. Head, skin, hair and facial hair keep their painted colors; only the jersey is tinted.
 * Null when the face has no validated placement.
 */
function layersOf(
  appearance: PlayerAppearance,
  faces: PortraitOverlays,
  tints: GearTints = gearTints([]),
): readonly PortraitLayer[] | null {
  const face = tail(appearance.faceId, 'face_');
  const placement = faces[face];
  if (placement === undefined) return null;
  const body = tail(appearance.bodyTypeId, 'body_type_');
  const skin = tail(appearance.skinToneId, 'skin_tone_');
  const hairColor = tail(appearance.hairColorId, 'hair_color_');
  const layers: PortraitLayer[] = [{ src: portraitArtUrl(`skin/${body}-${skin}.webp`) }];
  if (appearance.armSleevesId !== null)
    layers.push({
      src: portraitArtUrl(`sleeves/${tail(appearance.armSleevesId, 'arm_sleeves_')}.webp`),
    });
  layers.push(
    { src: portraitArtUrl(`jersey/${body}.webp`), tint: tints.jersey },
    { src: portraitArtUrl(`jersey/${body}-trim.webp`), tint: tints.trim },
    { src: portraitArtUrl(`head/${face}-${skin}.webp`) },
  );
  if (appearance.facialHairId != null) {
    const style = tail(appearance.facialHairId, 'facial_hair_');
    layers.push({
      src: portraitArtUrl(`facial-hair/${style}-${hairColor}.webp`),
      matrix: style === 'mustache' ? placement.mustache : placement.facialHair,
    });
  }
  layers.push({
    src: portraitArtUrl(`hair/${tail(appearance.hairStyleId, 'hair_style_')}-${hairColor}.webp`),
    matrix: placement.hair,
  });
  if (appearance.eyeBlackId !== null)
    layers.push({
      src: portraitArtUrl(`eye-black/${tail(appearance.eyeBlackId, 'eye_black_')}.webp`),
    });
  if (appearance.towelId !== null)
    layers.push({ src: portraitArtUrl(`towel/${tail(appearance.towelId, 'towel_')}.webp`) });
  return layers;
}

/**
 * The last complete portrait: a new selection replaces it only once every one of its layers has
 * loaded, so the head and its placement change together and no partial or mixed bust is drawn.
 * Until a first selection is complete (or if its art cannot load) the drawn figure stands in.
 */
function useCompletePortrait(
  layers: readonly PortraitLayer[] | null,
): readonly PortraitLayer[] | null {
  const key =
    layers === null ? null : layers.map(({ src, matrix }) => `${src}@${matrix ?? ''}`).join('|');
  const [shown, setShown] = useState<{
    readonly key: string;
    readonly layers: readonly PortraitLayer[];
  } | null>(null);
  useEffect(() => {
    if (layers === null || key === null || key === shown?.key) return;
    let live = true;
    let remaining = layers.length;
    const images = layers.map(({ src }) => {
      const image = new Image();
      image.onload = () => {
        remaining -= 1;
        if (remaining === 0 && live) setShown({ key, layers });
      };
      image.onerror = () => {
        live = false;
      };
      image.src = src;
      return image;
    });
    return () => {
      live = false;
      for (const image of images) {
        image.onload = null;
        image.onerror = null;
      }
    };
    // The key is the selection; `layers` is rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return shown?.layers ?? null;
}

export function AthletePortrait({
  appearance,
  label,
  size = 'card',
}: AthletePortraitProps): React.JSX.Element {
  const faces = usePortraitOverlays();
  // Worn gear recolors the tinted layers (M12 NIL-01/02).
  const tints = gearTints(useContext(GearContext));
  const painted = useCompletePortrait(faces === null ? null : layersOf(appearance, faces, tints));
  if (painted !== null)
    return (
      <figure
        aria-label={label}
        className="athlete-portrait athlete-portrait--painted"
        data-size={size}
        role="img"
      >
        <span aria-hidden="true" className="athlete-portrait__bust">
          {painted.map(({ src, tint, matrix }) =>
            tint === undefined ? (
              <img
                alt=""
                className={
                  matrix === undefined
                    ? 'athlete-portrait__layer'
                    : 'athlete-portrait__layer athlete-portrait__layer--placed'
                }
                data-layer-src={src}
                key={src}
                src={src}
                style={matrix === undefined ? undefined : { transform: overlayTransform(matrix) }}
              />
            ) : (
              <span
                className="athlete-portrait__layer athlete-portrait__layer--tint"
                key={src}
                style={{
                  background: tint,
                  maskImage: `url('${src}')`,
                  WebkitMaskImage: `url('${src}')`,
                }}
              />
            ),
          )}
        </span>
      </figure>
    );
  return (
    <figure
      aria-label={label}
      className="athlete-portrait"
      data-arm-sleeves={optionalId(appearance.armSleevesId)}
      data-body-type={appearance.bodyTypeId}
      data-eye-black={optionalId(appearance.eyeBlackId)}
      data-face={appearance.faceId}
      data-footwear={appearance.footwearId}
      data-gloves={optionalId(appearance.glovesId)}
      data-hair-color={appearance.hairColorId}
      data-hair-style={appearance.hairStyleId}
      data-jersey-fit={appearance.jerseyFitId}
      data-size={size}
      data-skin-tone={appearance.skinToneId}
      data-towel={optionalId(appearance.towelId)}
      data-visor={optionalId(appearance.visorId)}
      data-wrist-tape={optionalId(appearance.wristTapeId)}
      role="img"
    >
      <span aria-hidden="true" className="athlete-portrait__stage">
        <span className="athlete-portrait__shadow" />
        <span className="athlete-portrait__leg athlete-portrait__leg--left">
          <span className="athlete-portrait__foot" />
        </span>
        <span className="athlete-portrait__leg athlete-portrait__leg--right">
          <span className="athlete-portrait__foot" />
        </span>
        <span className="athlete-portrait__torso">
          <span className="athlete-portrait__chest-mark" />
          <span className="athlete-portrait__towel" />
        </span>
        <span className="athlete-portrait__arm athlete-portrait__arm--left">
          <span className="athlete-portrait__sleeve" />
          <span className="athlete-portrait__wrist" />
          <span className="athlete-portrait__glove" />
        </span>
        <span className="athlete-portrait__arm athlete-portrait__arm--right">
          <span className="athlete-portrait__sleeve" />
          <span className="athlete-portrait__wrist" />
          <span className="athlete-portrait__glove" />
        </span>
        <span className="athlete-portrait__neck" />
        <span className="athlete-portrait__head">
          <span className="athlete-portrait__ears" />
          <span className="athlete-portrait__eyes" />
          <span className="athlete-portrait__eye-black" />
          <span className="athlete-portrait__visor" />
          <span className="athlete-portrait__hair" />
        </span>
      </span>
    </figure>
  );
}
