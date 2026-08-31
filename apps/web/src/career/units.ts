import type { SupportedLocale } from '@project-saturday/game-content/locales';

const CENTIMETERS_PER_INCH = 2.54;
const POUNDS_PER_KILOGRAM = 2.204_622_621_8;

export interface ImperialHeight {
  readonly feet: number;
  readonly inches: number;
}

export function heightCmToFeetInches(heightCm: number): ImperialHeight {
  const totalInches = Math.round(heightCm / CENTIMETERS_PER_INCH);
  return {
    feet: Math.floor(totalInches / 12),
    inches: totalInches % 12,
  };
}

export function feetInchesToHeightCm(feet: number, inches: number): number {
  if (
    !Number.isInteger(feet) ||
    !Number.isInteger(inches) ||
    feet < 0 ||
    inches < 0 ||
    inches > 11
  ) {
    return Number.NaN;
  }
  return Math.round((feet * 12 + inches) * CENTIMETERS_PER_INCH);
}

export function weightKgToPounds(weightKg: number): number {
  return Math.round(weightKg * POUNDS_PER_KILOGRAM);
}

export function poundsToWeightKg(pounds: number): number {
  return Number.isFinite(pounds) ? Math.round(pounds / POUNDS_PER_KILOGRAM) : Number.NaN;
}

export function formatHeight(locale: SupportedLocale, heightCm: number): string {
  if (locale === 'en-US') {
    const { feet, inches } = heightCmToFeetInches(heightCm);
    return `${feet}′ ${inches}″`;
  }
  return `${new Intl.NumberFormat(locale).format(heightCm)} cm`;
}

export function formatWeight(locale: SupportedLocale, weightKg: number): string {
  const displayValue = locale === 'en-US' ? weightKgToPounds(weightKg) : weightKg;
  const unit = locale === 'en-US' ? 'lb' : 'kg';
  return `${new Intl.NumberFormat(locale).format(displayValue)} ${unit}`;
}

export function formatSignedNumber(
  locale: SupportedLocale,
  value: number,
  maximumFractionDigits = 2,
): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits,
    signDisplay: 'always',
  }).format(value);
}
