import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const SHIPPING_SOURCE_EXTENSIONS = /\.(?:ts|tsx)$/u;
const NON_SHIPPING_SOURCE_SUFFIXES = /\.(?:test|spec)\.(?:ts|tsx)$/u;

// These attributes carry DOM/component wiring rather than copy. Unknown custom-component
// props remain copy candidates so `label={rawCopy}` and similar APIs cannot bypass the guard.
const TECHNICAL_JSX_ATTRIBUTES = new Set([
  'accept',
  'action',
  'autoComplete',
  'autoFocus',
  'capture',
  'checked',
  'className',
  'colSpan',
  'contentEditable',
  'crossOrigin',
  'decoding',
  'defaultChecked',
  'defaultValue',
  'dir',
  'disabled',
  'download',
  'draggable',
  'encType',
  'fetchPriority',
  'form',
  'formAction',
  'height',
  'hidden',
  'href',
  'htmlFor',
  'id',
  'inputMode',
  'key',
  'lang',
  'loading',
  'max',
  'maxLength',
  'method',
  'min',
  'minLength',
  'multiple',
  'name',
  'nonce',
  'open',
  'pattern',
  'readOnly',
  'ref',
  'rel',
  'required',
  'role',
  'rowSpan',
  'selected',
  'size',
  'src',
  'step',
  'style',
  'tabIndex',
  'target',
  'type',
  'value',
  'width',
]);

const TECHNICAL_ARIA_ATTRIBUTES = new Set([
  'aria-activedescendant',
  'aria-atomic',
  'aria-autocomplete',
  'aria-busy',
  'aria-checked',
  'aria-colcount',
  'aria-colindex',
  'aria-colspan',
  'aria-controls',
  'aria-current',
  'aria-describedby',
  'aria-details',
  'aria-disabled',
  'aria-errormessage',
  'aria-expanded',
  'aria-flowto',
  'aria-haspopup',
  'aria-hidden',
  'aria-invalid',
  'aria-keyshortcuts',
  'aria-labelledby',
  'aria-level',
  'aria-live',
  'aria-modal',
  'aria-multiline',
  'aria-multiselectable',
  'aria-orientation',
  'aria-owns',
  'aria-posinset',
  'aria-pressed',
  'aria-readonly',
  'aria-relevant',
  'aria-required',
  'aria-rowcount',
  'aria-rowindex',
  'aria-rowspan',
  'aria-selected',
  'aria-setsize',
  'aria-sort',
  'aria-valuemax',
  'aria-valuemin',
  'aria-valuenow',
]);

const INTRINSIC_VISIBLE_ATTRIBUTES = new Set([
  'alt',
  'aria-description',
  'aria-label',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
  'placeholder',
  'title',
]);

function containsNaturalLanguage(value) {
  const withoutUrls = value.replace(/(?:https?|data):\S+/gu, '');
  return /\p{Letter}/u.test(withoutUrls);
}

function isTechnicalJsxAttribute(attributeName) {
  return (
    TECHNICAL_JSX_ATTRIBUTES.has(attributeName) ||
    TECHNICAL_ARIA_ATTRIBUTES.has(attributeName) ||
    attributeName.startsWith('data-') ||
    /^on[A-Z]/u.test(attributeName)
  );
}

function isIntrinsicJsxElement(tagName) {
  const firstCharacter = tagName[0];
  return (
    firstCharacter !== undefined &&
    (firstCharacter === firstCharacter.toLowerCase() || tagName.includes('-'))
  );
}

function jsxTagName(node) {
  const tagName = ts.isJsxElement(node.parent)
    ? node.parent.openingElement.tagName
    : ts.isJsxSelfClosingElement(node.parent)
      ? node.parent.tagName
      : undefined;

  return tagName?.getText() ?? '';
}

function isVisibleJsxAttribute(attribute) {
  const attributeName = attribute.name.text;

  if (isTechnicalJsxAttribute(attributeName)) {
    return false;
  }

  const tagName = jsxTagName(attribute);
  return !isIntrinsicJsxElement(tagName) || INTRINSIC_VISIBLE_ATTRIBUTES.has(attributeName);
}

function propertyNameText(name) {
  if (name === undefined) {
    return undefined;
  }

  if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name) || ts.isStringLiteral(name)) {
    return name.text;
  }

  if (ts.isNumericLiteral(name)) {
    return name.text;
  }

  return undefined;
}

function expressionPropertyName(expression) {
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }

  if (
    ts.isElementAccessExpression(expression) &&
    expression.argumentExpression !== undefined &&
    (ts.isStringLiteral(expression.argumentExpression) ||
      ts.isNoSubstitutionTemplateLiteral(expression.argumentExpression))
  ) {
    return expression.argumentExpression.text;
  }

  return undefined;
}

function isTranslationCall(expression) {
  if (!ts.isCallExpression(expression)) {
    return false;
  }

  if (ts.isIdentifier(expression.expression)) {
    return expression.expression.text === 't';
  }

  return (
    ts.isPropertyAccessExpression(expression.expression) && expression.expression.name.text === 't'
  );
}

function isVisibleDomAssignmentTarget(expression) {
  if (!ts.isPropertyAccessExpression(expression) && !ts.isElementAccessExpression(expression)) {
    return false;
  }

  const propertyName = expressionPropertyName(expression);
  if (propertyName === 'innerText' || propertyName === 'textContent') {
    return true;
  }

  return (
    propertyName === 'title' &&
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === 'document'
  );
}

function attributeArgumentText(expression) {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }

  return undefined;
}

function collectDeclarations(sourceFile) {
  const declarations = new Map();

  function addDeclaration(identifier, initializer) {
    const existing = declarations.get(identifier.text) ?? [];
    existing.push({ identifier, initializer });
    declarations.set(identifier.text, existing);
  }

  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.initializer !== undefined) {
      if (ts.isIdentifier(node.name)) {
        addDeclaration(node.name, node.initializer);
      } else {
        for (const element of node.name.elements) {
          if (ts.isIdentifier(element.name) && element.initializer !== undefined) {
            addDeclaration(element.name, element.initializer);
          }
        }
      }
    } else if (
      ts.isParameter(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined
    ) {
      addDeclaration(node.name, node.initializer);
    } else if (
      ts.isPropertyDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined
    ) {
      addDeclaration(node.name, node.initializer);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return declarations;
}

function nearestDeclaration(declarations, identifier) {
  const candidates = declarations.get(identifier.text);
  if (candidates === undefined) {
    return undefined;
  }

  const preceding = candidates.filter(
    (candidate) => candidate.identifier.getStart() <= identifier.getStart(),
  );
  return preceding.at(-1)?.initializer ?? candidates[0]?.initializer;
}

function objectPropertyInitializer(expression, requestedProperty) {
  if (!ts.isObjectLiteralExpression(expression)) {
    return undefined;
  }

  for (const property of expression.properties) {
    if (
      ts.isPropertyAssignment(property) &&
      propertyNameText(property.name) === requestedProperty
    ) {
      return property.initializer;
    }

    if (ts.isShorthandPropertyAssignment(property) && property.name.text === requestedProperty) {
      return property.name;
    }
  }

  return undefined;
}

function displayValue(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node)) {
    return node.text.trim();
  }

  if (ts.isTemplateExpression(node)) {
    return node.getText().replace(/\s+/gu, ' ').trim();
  }

  return node.getText().replace(/\s+/gu, ' ').trim();
}

/**
 * Finds natural-language literals that can flow to a user-visible browser/React sink.
 * Technical identifiers, module specifiers, diagnostics, storage keys, CSS hooks, and
 * localization keys are ignored because they do not reach one of those sinks.
 */
export function analyzeLocalizedCopy(source, fileName = 'source.tsx') {
  const scriptKind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  const declarations = collectDeclarations(sourceFile);
  const failures = [];
  const reportedNodes = new Set();
  const resolvingDeclarations = new Set();

  function report(node, sink) {
    const value = displayValue(node);
    if (!containsNaturalLanguage(value) || reportedNodes.has(node)) {
      return;
    }

    reportedNodes.add(node);
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    failures.push({
      column: start.character + 1,
      fileName,
      line: start.line + 1,
      sink,
      value,
    });
  }

  function scanObjectProperties(expression, sink) {
    for (const property of expression.properties) {
      if (ts.isSpreadAssignment(property)) {
        scanExpression(property.expression, sink);
        continue;
      }

      if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) {
        continue;
      }

      const name = propertyNameText(property.name);
      if (name !== undefined && isTechnicalJsxAttribute(name)) {
        continue;
      }

      scanExpression(
        ts.isPropertyAssignment(property) ? property.initializer : property.name,
        sink,
      );
    }
  }

  function scanExpression(expression, sink) {
    if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
      report(expression, sink);
      return;
    }

    if (ts.isTemplateExpression(expression)) {
      report(expression, sink);
      for (const span of expression.templateSpans) {
        scanExpression(span.expression, sink);
      }
      return;
    }

    if (ts.isIdentifier(expression)) {
      const initializer = nearestDeclaration(declarations, expression);
      if (initializer === undefined || resolvingDeclarations.has(initializer)) {
        return;
      }

      resolvingDeclarations.add(initializer);
      scanExpression(initializer, sink);
      resolvingDeclarations.delete(initializer);
      return;
    }

    if (
      ts.isParenthesizedExpression(expression) ||
      ts.isAsExpression(expression) ||
      ts.isSatisfiesExpression(expression) ||
      ts.isNonNullExpression(expression) ||
      ts.isTypeAssertionExpression(expression)
    ) {
      scanExpression(expression.expression, sink);
      return;
    }

    if (ts.isConditionalExpression(expression)) {
      scanExpression(expression.whenTrue, sink);
      scanExpression(expression.whenFalse, sink);
      return;
    }

    if (ts.isBinaryExpression(expression)) {
      if (expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        // The left side is a render predicate, while only the right side reaches the UI.
        scanExpression(expression.right, sink);
      } else if (
        expression.operatorToken.kind === ts.SyntaxKind.PlusToken ||
        expression.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
        expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
      ) {
        scanExpression(expression.left, sink);
        scanExpression(expression.right, sink);
      }
      return;
    }

    if (ts.isArrayLiteralExpression(expression)) {
      for (const element of expression.elements) {
        scanExpression(element, sink);
      }
      return;
    }

    if (ts.isObjectLiteralExpression(expression)) {
      scanObjectProperties(expression, sink);
      return;
    }

    if (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
      const requestedProperty = expressionPropertyName(expression);
      const target = expression.expression;

      if (requestedProperty !== undefined) {
        const targetInitializer = ts.isIdentifier(target)
          ? nearestDeclaration(declarations, target)
          : target;
        const propertyInitializer =
          targetInitializer === undefined
            ? undefined
            : objectPropertyInitializer(targetInitializer, requestedProperty);

        if (propertyInitializer !== undefined) {
          scanExpression(propertyInitializer, sink);
        }
      }
      return;
    }

    if (ts.isCallExpression(expression)) {
      if (isTranslationCall(expression)) {
        return;
      }

      for (const argument of expression.arguments) {
        if (!ts.isArrowFunction(argument) && !ts.isFunctionExpression(argument)) {
          scanExpression(argument, sink);
        }
      }
      return;
    }

    if (ts.isAwaitExpression(expression)) {
      scanExpression(expression.expression, sink);
    }
  }

  function visit(node) {
    if (ts.isJsxText(node)) {
      report(node, 'JSX child');
    } else if (
      ts.isJsxExpression(node) &&
      node.expression !== undefined &&
      !ts.isJsxAttribute(node.parent)
    ) {
      scanExpression(node.expression, 'JSX child expression');
    } else if (
      ts.isJsxAttribute(node) &&
      node.initializer !== undefined &&
      isVisibleJsxAttribute(node)
    ) {
      if (ts.isStringLiteral(node.initializer)) {
        report(node.initializer, `JSX ${node.name.text} attribute`);
      } else if (
        ts.isJsxExpression(node.initializer) &&
        node.initializer.expression !== undefined
      ) {
        scanExpression(node.initializer.expression, `JSX ${node.name.text} attribute`);
      }
    } else if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      isVisibleDomAssignmentTarget(node.left)
    ) {
      scanExpression(node.right, `DOM ${expressionPropertyName(node.left)} assignment`);
    } else if (ts.isCallExpression(node)) {
      if (
        ts.isIdentifier(node.expression) &&
        ['alert', 'confirm', 'prompt'].includes(node.expression.text) &&
        node.arguments[0] !== undefined
      ) {
        scanExpression(node.arguments[0], `${node.expression.text} dialog`);
      } else if (
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'setAttribute' &&
        node.arguments[0] !== undefined &&
        node.arguments[1] !== undefined
      ) {
        const attributeName = attributeArgumentText(node.arguments[0]);
        if (attributeName !== undefined && INTRINSIC_VISIBLE_ATTRIBUTES.has(attributeName)) {
          scanExpression(node.arguments[1], `DOM ${attributeName} attribute`);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return failures.sort(
    (left, right) =>
      left.line - right.line || left.column - right.column || left.sink.localeCompare(right.sink),
  );
}

async function collectShippingSourceFiles(directoryPath) {
  let entries;

  try {
    entries = await readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }

  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directoryPath, entry.name);

      if (entry.isDirectory()) {
        return collectShippingSourceFiles(entryPath);
      }

      if (
        !SHIPPING_SOURCE_EXTENSIONS.test(entry.name) ||
        NON_SHIPPING_SOURCE_SUFFIXES.test(entry.name) ||
        entry.name.endsWith('.d.ts')
      ) {
        return [];
      }

      return [entryPath];
    }),
  );

  return files.flat().sort((left, right) => left.localeCompare(right));
}

export async function checkLocalizedCopy(projectRoot = process.cwd()) {
  const webSourceRoot = path.join(projectRoot, 'apps', 'web', 'src');
  const failures = [];

  for (const filePath of await collectShippingSourceFiles(webSourceRoot)) {
    const source = await readFile(filePath, 'utf8');
    const relativePath = path.relative(projectRoot, filePath);
    failures.push(...analyzeLocalizedCopy(source, relativePath));
  }

  return failures;
}

function formatFailure(failure) {
  const abbreviatedValue =
    failure.value.length > 80 ? `${failure.value.slice(0, 77)}...` : failure.value;
  return `${failure.fileName}:${failure.line}:${failure.column} contains unlocalized natural-language text in ${failure.sink}: ${JSON.stringify(abbreviatedValue)}`;
}

async function runCli() {
  const failures = await checkLocalizedCopy();

  if (failures.length > 0) {
    console.error(
      [
        'Localized-copy check failed. Move shipping text to both locale resources:',
        ...failures.map((failure) => `- ${formatFailure(failure)}`),
      ].join('\n'),
    );
    process.exitCode = 1;
  } else {
    console.log('Localized-copy check passed.');
  }
}

const invokedPath = process.argv[1];
if (
  invokedPath !== undefined &&
  pathToFileURL(path.resolve(invokedPath)).href === import.meta.url
) {
  await runCli();
}
