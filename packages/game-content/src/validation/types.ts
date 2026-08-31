import type { SupportedLocale } from '../locales/index.js';

export type ValidationIssueCode =
  | 'content.duplicate-id'
  | 'content.invalid-reference'
  | 'content.invalid-schema'
  | 'content.missing-localization-reference'
  | 'locale.blank-message'
  | 'locale.interpolation-contract-mismatch'
  | 'locale.invalid-icu-message'
  | 'locale.invalid-message-key'
  | 'locale.invalid-message-value'
  | 'locale.missing-key'
  | 'locale.missing-resource';

export interface ValidationIssue {
  readonly code: ValidationIssueCode;
  readonly contentId?: string;
  readonly locale?: SupportedLocale;
  readonly message: string;
  readonly messageKey?: string;
  readonly path: string;
}

export type ValidationResult =
  | {
      readonly issues: readonly [];
      readonly ok: true;
    }
  | {
      readonly issues: readonly ValidationIssue[];
      readonly ok: false;
    };

export function toValidationResult(issues: readonly ValidationIssue[]): ValidationResult {
  const sortedIssues = [...issues].sort((left, right) => {
    const leftKey = [
      left.code,
      left.locale ?? '',
      left.messageKey ?? '',
      left.contentId ?? '',
      left.path,
    ].join('\u0000');
    const rightKey = [
      right.code,
      right.locale ?? '',
      right.messageKey ?? '',
      right.contentId ?? '',
      right.path,
    ].join('\u0000');

    return leftKey.localeCompare(rightKey, 'en-US');
  });

  return sortedIssues.length === 0 ? { issues: [], ok: true } : { issues: sortedIssues, ok: false };
}
