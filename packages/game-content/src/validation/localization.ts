import { TYPE, parse, type MessageFormatElement } from '@formatjs/icu-messageformat-parser';

import { SUPPORTED_LOCALES, type SupportedLocale } from '../locales/index.js';
import { MESSAGE_KEY_PATTERN } from '../schema/primitives.js';
import { toValidationResult, type ValidationIssue, type ValidationResult } from './types.js';

export type LocalizationResourcesInput = Readonly<
  Partial<Record<SupportedLocale, Readonly<Record<string, unknown>>>>
>;

type InterpolationKind =
  'date' | 'number' | 'plural' | 'select' | 'selectordinal' | 'tag' | 'time' | 'value';

interface VariableContract {
  readonly kinds: Set<InterpolationKind>;
  readonly pluralOffsets: Set<string>;
  readonly selectOptions: Set<string>;
}

type InterpolationContract = Map<string, VariableContract>;

interface ParsedMessage {
  readonly contract: InterpolationContract;
  readonly error?: string;
}

function addVariable(
  contract: InterpolationContract,
  name: string,
  kind: InterpolationKind,
  selectOptions: readonly string[] = [],
  pluralOffset?: number,
): void {
  const existing = contract.get(name);
  const variable = existing ?? {
    kinds: new Set<InterpolationKind>(),
    pluralOffsets: new Set<string>(),
    selectOptions: new Set<string>(),
  };

  variable.kinds.add(kind);
  for (const option of selectOptions) {
    variable.selectOptions.add(option);
  }
  if (pluralOffset !== undefined) {
    variable.pluralOffsets.add(`${kind}:${pluralOffset}`);
  }

  if (existing === undefined) {
    contract.set(name, variable);
  }
}

function collectInterpolationContract(
  elements: readonly MessageFormatElement[],
  contract: InterpolationContract,
): void {
  for (const element of elements) {
    switch (element.type) {
      case TYPE.argument:
        addVariable(contract, element.value, 'value');
        break;
      case TYPE.number:
        addVariable(contract, element.value, 'number');
        break;
      case TYPE.date:
        addVariable(contract, element.value, 'date');
        break;
      case TYPE.time:
        addVariable(contract, element.value, 'time');
        break;
      case TYPE.select:
        addVariable(contract, element.value, 'select', Object.keys(element.options));
        for (const option of Object.values(element.options)) {
          collectInterpolationContract(option.value, contract);
        }
        break;
      case TYPE.plural:
        addVariable(
          contract,
          element.value,
          element.pluralType === 'ordinal' ? 'selectordinal' : 'plural',
          [],
          element.offset,
        );
        for (const option of Object.values(element.options)) {
          collectInterpolationContract(option.value, contract);
        }
        break;
      case TYPE.tag:
        addVariable(contract, element.value, 'tag');
        collectInterpolationContract(element.children, contract);
        break;
      case TYPE.literal:
      case TYPE.pound:
        break;
    }
  }
}

function parseMessage(message: string): ParsedMessage {
  try {
    const elements = parse(message, {
      captureLocation: false,
      requiresOtherClause: true,
    });
    const contract: InterpolationContract = new Map();
    collectInterpolationContract(elements, contract);
    return { contract };
  } catch (error) {
    return {
      contract: new Map(),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function contractSignature(contract: InterpolationContract): string {
  return [...contract.entries()]
    .sort(([left], [right]) => left.localeCompare(right, 'en-US'))
    .map(([name, variable]) => {
      const kinds = [...variable.kinds].sort().join(',');
      const pluralOffsets = [...variable.pluralOffsets].sort().join(',');
      const selectOptions = [...variable.selectOptions].sort().join(',');
      return `${name}:${kinds}:${pluralOffsets}:${selectOptions}`;
    })
    .join('|');
}

export function validateLocalizationResources(
  resources: LocalizationResourcesInput,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const allMessageKeys = new Set<string>();
  const parsedByLocale = new Map<SupportedLocale, Map<string, InterpolationContract>>();

  for (const locale of SUPPORTED_LOCALES) {
    const messages = resources[locale];
    parsedByLocale.set(locale, new Map());

    if (messages === undefined) {
      issues.push({
        code: 'locale.missing-resource',
        locale,
        message: `Required locale resource ${locale} is missing.`,
        path: `locales.${locale}`,
      });
      continue;
    }

    for (const key of Object.keys(messages)) {
      allMessageKeys.add(key);
    }
  }

  for (const key of [...allMessageKeys].sort((left, right) => left.localeCompare(right, 'en-US'))) {
    if (!MESSAGE_KEY_PATTERN.test(key)) {
      for (const locale of SUPPORTED_LOCALES) {
        const messages = resources[locale];
        if (messages !== undefined && Object.hasOwn(messages, key)) {
          issues.push({
            code: 'locale.invalid-message-key',
            locale,
            message: `Message key ${key} is not a valid dotted stable key.`,
            messageKey: key,
            path: `locales.${locale}.${key}`,
          });
        }
      }
    }

    for (const locale of SUPPORTED_LOCALES) {
      const messages = resources[locale];
      const path = `locales.${locale}.${key}`;

      if (messages === undefined || !Object.hasOwn(messages, key)) {
        issues.push({
          code: 'locale.missing-key',
          locale,
          message: `Message key ${key} is missing from ${locale}.`,
          messageKey: key,
          path,
        });
        continue;
      }

      const message = messages[key];
      if (typeof message !== 'string') {
        issues.push({
          code: 'locale.invalid-message-value',
          locale,
          message: `Message key ${key} in ${locale} must resolve to a string.`,
          messageKey: key,
          path,
        });
        continue;
      }

      if (message.trim().length === 0) {
        issues.push({
          code: 'locale.blank-message',
          locale,
          message: `Message key ${key} in ${locale} cannot be blank.`,
          messageKey: key,
          path,
        });
        continue;
      }

      const parsed = parseMessage(message);
      if (parsed.error !== undefined) {
        issues.push({
          code: 'locale.invalid-icu-message',
          locale,
          message: `Message key ${key} in ${locale} is invalid ICU: ${parsed.error}`,
          messageKey: key,
          path,
        });
        continue;
      }

      parsedByLocale.get(locale)?.set(key, parsed.contract);
    }
  }

  for (const key of allMessageKeys) {
    const contracts = SUPPORTED_LOCALES.map((locale) => parsedByLocale.get(locale)?.get(key));
    if (contracts.some((contract) => contract === undefined)) {
      continue;
    }

    const signatures = contracts.map((contract) => contractSignature(contract ?? new Map()));
    if (new Set(signatures).size > 1) {
      issues.push({
        code: 'locale.interpolation-contract-mismatch',
        message: `Message key ${key} has different interpolation contracts across supported locales.`,
        messageKey: key,
        path: `locales.${key}`,
      });
    }
  }

  return toValidationResult(issues);
}
