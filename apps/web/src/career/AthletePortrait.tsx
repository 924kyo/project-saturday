import './athlete-portrait.css';
import { useState } from 'react';
import type { PlayerAppearance } from '@project-saturday/game-core';

export interface AthletePortraitProps {
  readonly appearance: PlayerAppearance;
  readonly label: string;
  readonly size?: 'compact' | 'card' | 'profile';
}

function optionalId(value: string | null): string {
  return value ?? 'none';
}

const ART = '/art/portrait';
const tail = (id: string, prefix: string) => id.slice(prefix.length);

/**
 * The painted bust (`docs/design/ASSET_LIST.md`, portrait layers): every layer shares one 512 x 640
 * canvas, so they stack exactly. The jersey is white art tinted with the program colors.
 */
function layersOf(
  appearance: PlayerAppearance,
): readonly { readonly src: string; readonly tint?: string }[] {
  const body = tail(appearance.bodyTypeId, 'body_type_');
  const skin = tail(appearance.skinToneId, 'skin_tone_');
  const layers: { src: string; tint?: string }[] = [
    { src: `${ART}/skin/${body}-${skin}.webp` },
    { src: `${ART}/jersey/${body}.webp`, tint: 'var(--team, #28344a)' },
    { src: `${ART}/jersey/${body}-trim.webp`, tint: 'var(--team-2, #c8ff2e)' },
    { src: `${ART}/head/${tail(appearance.faceId, 'face_')}-${skin}.webp` },
    {
      src: `${ART}/hair/${tail(appearance.hairStyleId, 'hair_style_')}-${tail(appearance.hairColorId, 'hair_color_')}.webp`,
    },
  ];
  if (appearance.armSleevesId !== null)
    layers.splice(1, 0, {
      src: `${ART}/sleeves/${tail(appearance.armSleevesId, 'arm_sleeves_')}.webp`,
    });
  if (appearance.eyeBlackId !== null)
    layers.push({ src: `${ART}/eye-black/${tail(appearance.eyeBlackId, 'eye_black_')}.webp` });
  if (appearance.towelId !== null)
    layers.push({ src: `${ART}/towel/${tail(appearance.towelId, 'towel_')}.webp` });
  return layers;
}

export function AthletePortrait({
  appearance,
  label,
  size = 'card',
}: AthletePortraitProps): React.JSX.Element {
  const layers = layersOf(appearance);
  const head = layers.find(({ src }) => src.includes('/head/'))!.src;
  // The painted bust replaces the drawn figure only once its head layer is known to exist.
  const [painted, setPainted] = useState<string | null>(null);
  if (painted === head)
    return (
      <figure
        aria-label={label}
        className="athlete-portrait athlete-portrait--painted"
        data-size={size}
        role="img"
      >
        <span aria-hidden="true" className="athlete-portrait__bust">
          {layers.map(({ src, tint }) =>
            tint === undefined ? (
              <img alt="" className="athlete-portrait__layer" key={src} src={src} />
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
      <img alt="" hidden onLoad={() => setPainted(head)} src={head} />
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
