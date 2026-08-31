import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const sourceRoots = [
  path.join(projectRoot, 'packages', 'game-core', 'src'),
  path.join(projectRoot, 'packages', 'game-content', 'src'),
  path.join(projectRoot, 'packages', 'testkit', 'src'),
];

async function collectSourceFiles(directoryPath) {
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
      return entry.isDirectory()
        ? collectSourceFiles(entryPath)
        : /\.(?:ts|tsx)$/.test(entry.name)
          ? [entryPath]
          : [];
    }),
  );

  return files.flat();
}

function sourceLocation(source, index) {
  const beforeMatch = source.slice(0, index);
  const lines = beforeMatch.split('\n');
  return `${lines.length}:${(lines.at(-1)?.length ?? 0) + 1}`;
}

const failures = [];

const gameCorePackagePath = path.join(projectRoot, 'packages', 'game-core', 'package.json');
const gameCorePackage = JSON.parse(await readFile(gameCorePackagePath, 'utf8'));
const forbiddenGameCoreDependencies = new Set([
  '@project-saturday/game-content',
  '@project-saturday/testkit',
  '@project-saturday/web',
  'idb',
  'react',
  'react-dom',
  'workbox-window',
]);
const gameCoreRuntimeDependencies = Object.keys(gameCorePackage.dependencies ?? {}).filter(
  (dependencyName) => forbiddenGameCoreDependencies.has(dependencyName),
);

if (gameCoreRuntimeDependencies.length > 0) {
  failures.push(
    `packages/game-core/package.json declares forbidden runtime dependencies: ${gameCoreRuntimeDependencies.join(', ')}`,
  );
}

for (const sourceRoot of sourceRoots) {
  for (const filePath of await collectSourceFiles(sourceRoot)) {
    const source = await readFile(filePath, 'utf8');
    const relativePath = path.relative(projectRoot, filePath);
    const randomMatches = source.matchAll(/\bMath\s*(?:\.\s*random\b|\[\s*['"]random['"]\s*\])/g);

    for (const match of randomMatches) {
      failures.push(
        `${relativePath}:${sourceLocation(source, match.index)} uses forbidden Math.random()`,
      );
    }

    if (relativePath.startsWith(path.join('packages', 'game-core'))) {
      const forbiddenImportMatches = source.matchAll(
        /(?:from\s*|import\s*\()\s*['"](node:[^'"]+|react(?:-dom)?|idb|workbox-window)['"]/g,
      );

      for (const match of forbiddenImportMatches) {
        failures.push(
          `${relativePath}:${sourceLocation(source, match.index)} imports forbidden environment dependency ${match[1]}`,
        );
      }

      const forbiddenGlobalMatches = source.matchAll(
        /\b(document|fetch|indexedDB|localStorage|navigator|sessionStorage|window)\b/g,
      );

      for (const match of forbiddenGlobalMatches) {
        failures.push(
          `${relativePath}:${sourceLocation(source, match.index)} uses forbidden environment global ${match[1]}`,
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error(
    ['Architecture boundary check failed:', ...failures.map((item) => `- ${item}`)].join('\n'),
  );
  process.exitCode = 1;
} else {
  console.log('Architecture boundary check passed.');
}
