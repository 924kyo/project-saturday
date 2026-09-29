export interface ProgressMeterProps {
  readonly label: string;
  readonly maximum: number;
  readonly value: number;
  readonly valueText?: string;
}

export function ProgressMeter({
  label,
  maximum,
  value,
  valueText,
}: ProgressMeterProps): React.JSX.Element {
  const boundedValue = Math.max(0, Math.min(value, maximum));
  const percentage = maximum <= 0 ? 0 : (boundedValue / maximum) * 100;
  return (
    <div
      aria-label={label}
      aria-valuemax={maximum}
      aria-valuemin={0}
      aria-valuenow={boundedValue}
      aria-valuetext={valueText}
      className="progress-meter"
      role="progressbar"
    >
      <span style={{ width: `${percentage}%` }} />
    </div>
  );
}
