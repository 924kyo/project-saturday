import { useState } from 'react';
import type { PlayerAppearance } from '@project-saturday/game-core';

import { assetUrl } from '../app/asset-url';

const ART = assetUrl('art/fullbody');
const tail = (id: string, prefix: string) => id.slice(prefix.length);

/**
 * The painted full-body figure (M12; layers in docs/design/ASSET_LIST.md, round 3). Every layer
 * shares one 600 × 1080 canvas and one master pose, so gear lines up for every build. Program
 * colors tint the white uniform layers. Height and weight only scale the finished figure.
 */
function layersOf(
  appearance: PlayerAppearance,
): readonly { readonly src: string; readonly tint?: string }[] {
  const build = tail(appearance.bodyTypeId, 'body_type_');
  const tone = tail(appearance.skinToneId, 'skin_tone_');
  const fit = tail(appearance.jerseyFitId, 'jersey_fit_');
  const team = 'var(--team, #28344a)';
  const trim = 'var(--team-2, #c8ff2e)';
  const layers: { src: string; tint?: string }[] = [
    { src: `${ART}/body/${build}-${tone}.webp` },
    { src: `${ART}/socks/${build}.webp`, tint: team },
    { src: `${ART}/pants/${build}.webp`, tint: trim },
    { src: `${ART}/cleats/${tail(appearance.footwearId, 'footwear_')}.webp` },
  ];
  if (appearance.armSleevesId !== null)
    layers.push({
      src: `${ART}/sleeves/${build}-${tail(appearance.armSleevesId, 'arm_sleeves_')}.webp`,
    });
  if (appearance.wristTapeId !== null)
    layers.push({ src: `${ART}/wrist-tape/${tail(appearance.wristTapeId, 'wrist_tape_')}.webp` });
  if (appearance.glovesId !== null) {
    const gloves = tail(appearance.glovesId, 'gloves_');
    layers.push(
      gloves === 'accent'
        ? { src: `${ART}/gloves/accent.webp`, tint: trim }
        : { src: `${ART}/gloves/${gloves}.webp` },
    );
  }
  layers.push(
    { src: `${ART}/jersey/${build}-${fit}.webp`, tint: team },
    { src: `${ART}/jersey/${build}-${fit}-trim.webp`, tint: trim },
  );
  if (appearance.towelId !== null)
    layers.push({ src: `${ART}/towel/${tail(appearance.towelId, 'towel_')}.webp` });
  if (appearance.eyeBlackId !== null && appearance.visorId === null)
    layers.push({ src: `${ART}/eye-black/${tail(appearance.eyeBlackId, 'eye_black_')}.webp` });
  layers.push({ src: `${ART}/helmet.webp`, tint: team }, { src: `${ART}/helmet-mask.webp` });
  if (appearance.visorId !== null)
    layers.push({ src: `${ART}/visor/${tail(appearance.visorId, 'visor_')}.webp` });
  return layers;
}

/** A layer whose art is not delivered yet is left out instead of showing a broken image. */
const hideMissing = (event: React.SyntheticEvent<HTMLImageElement>) => {
  event.currentTarget.style.visibility = 'hidden';
};

export function FullBodyFigure({
  appearance,
  heightCm,
  weightKg,
  label,
  large = false,
}: {
  readonly appearance: PlayerAppearance;
  readonly heightCm: number;
  readonly weightKg: number;
  readonly label: string;
  readonly large?: boolean;
}): React.JSX.Element | null {
  const layers = layersOf(appearance);
  const base = layers[0]!.src;
  // Shown only once the painted body for these options exists.
  const [ready, setReady] = useState<string | null>(null);
  // 165–215 cm scales 0.92–1.04 tall; weight for height widens a little (±6%).
  const tall = 0.92 + Math.max(0, Math.min(50, heightCm - 165)) / 416;
  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  const wide = 1 + Math.max(-0.06, Math.min(0.06, (bmi - 27) / 80));
  if (ready !== base) return <img alt="" hidden onLoad={() => setReady(base)} src={base} />;
  return (
    <figure aria-label={label} className="fullbody" data-size={large ? 'large' : 'card'} role="img">
      <span
        aria-hidden="true"
        className="fullbody__stack"
        style={{ transform: `scale(${wide.toFixed(3)}, ${tall.toFixed(3)})` }}
      >
        {layers.map(({ src, tint }) =>
          tint === undefined ? (
            <img alt="" className="fullbody__layer" key={src} onError={hideMissing} src={src} />
          ) : (
            <span
              className="fullbody__layer fullbody__layer--tint"
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
}
