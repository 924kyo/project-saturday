import './athlete-portrait.css';
import type { PlayerAppearance } from '@project-saturday/game-core';

export interface AthletePortraitProps {
  readonly appearance: PlayerAppearance;
  readonly label: string;
  readonly size?: 'compact' | 'card' | 'profile';
}

function optionalId(value: string | null): string {
  return value ?? 'none';
}

export function AthletePortrait({
  appearance,
  label,
  size = 'card',
}: AthletePortraitProps): React.JSX.Element {
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
