import { readFile, readdir, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { verifyJavaScriptBudgets } from './build-budgets.mjs';

const projectRoot = process.cwd();

function packageRequire(packageDirectory) {
  return createRequire(
    pathToFileURL(path.join(projectRoot, packageDirectory, 'package.json')).href,
  );
}

async function importBuiltExport(requireFromPackage, packageName) {
  const resolvedPath = requireFromPackage.resolve(packageName);
  const expectedDistSegment = `${path.sep}dist${path.sep}`;

  if (!resolvedPath.includes(expectedDistSegment)) {
    throw new Error(`${packageName} default export did not resolve to dist: ${resolvedPath}`);
  }

  return import(pathToFileURL(resolvedPath).href);
}

const requireFromTestkit = packageRequire('packages/testkit');
const requireFromWeb = packageRequire('apps/web');
const gameCore = await importBuiltExport(requireFromTestkit, '@project-saturday/game-core');
const testkit = await importBuiltExport(requireFromTestkit, '@project-saturday/testkit');
const locales = await importBuiltExport(requireFromWeb, '@project-saturday/game-content/locales');
const contentValidation = await importBuiltExport(
  requireFromWeb,
  '@project-saturday/game-content/validation',
);

const scenario = testkit.runSeededScenario({
  scenarioId: 'm0_dist_smoke',
  seed: 20_260_830,
  run: gameCore.nextUint32,
});

if (scenario.finalRng.drawCount !== 1 || scenario.reproduction.length === 0) {
  throw new Error('Built deterministic scenario smoke returned an invalid report.');
}

for (const locale of locales.SUPPORTED_LOCALES) {
  if (typeof locales.localeMessages[locale]?.['app.title'] !== 'string') {
    throw new Error(`Built locale catalog is missing app.title for ${locale}.`);
  }
}

contentValidation.assertShippedContentIsValid();

const webDist = path.join(projectRoot, 'apps', 'web', 'dist');
const manifest = JSON.parse(await readFile(path.join(webDist, 'manifest.webmanifest'), 'utf8'));
const serviceWorker = await readFile(path.join(webDist, 'sw.js'), 'utf8');
const assetDirectory = path.join(webDist, 'assets');
const assets = await Promise.all(
  (await readdir(assetDirectory)).map(async (name) => ({
    name,
    bytes: (await stat(path.join(assetDirectory, name))).size,
  })),
);
verifyJavaScriptBudgets(
  assets,
  await readFile(path.join(webDist, 'index.html'), 'utf8'),
  serviceWorker,
);

if (
  !Array.isArray(manifest.icons) ||
  !manifest.icons.some((icon) => icon?.type === 'image/png' && icon?.sizes === '512x512')
) {
  throw new Error('Built PWA manifest is missing its 512x512 PNG icon.');
}

for (const assetName of ['pwa-192x192.png', 'pwa-512x512.png', 'maskable-icon-512x512.png']) {
  const occurrences = serviceWorker.split(assetName).length - 1;
  if (occurrences !== 1) {
    throw new Error(
      `Service worker should precache ${assetName} exactly once; found ${occurrences}.`,
    );
  }
}

// Offline must keep the self-hosted display face: every built font is precached exactly once.
const fontAssets = assets.filter(({ name }) => name.endsWith('.woff2'));
if (fontAssets.length === 0) throw new Error('Built app should include its self-hosted fonts.');
for (const { name } of fontAssets) {
  const occurrences = serviceWorker.split(name).length - 1;
  if (occurrences !== 1) {
    throw new Error(`Service worker should precache ${name} exactly once; found ${occurrences}.`);
  }
}

const manifestOccurrences = serviceWorker.split('manifest.webmanifest').length - 1;
if (manifestOccurrences !== 1) {
  throw new Error(
    `Service worker should precache manifest.webmanifest exactly once; found ${manifestOccurrences}.`,
  );
}

// Offline portraits: the placement file and every painted layer are precached exactly once, so a
// release is complete offline and an update never mixes two portrait sets.
async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? listFiles(path.join(directory, entry.name))
        : [path.join(directory, entry.name)],
    ),
  );
  return nested.flat();
}
const artFiles = (
  await Promise.all(
    ['portrait', 'fullbody'].map((part) => listFiles(path.join(webDist, 'art', part))),
  )
)
  .flat()
  .map((file) => path.relative(webDist, file).split(path.sep).join('/'));
if (!artFiles.includes('art/portrait/portrait-overlays.json'))
  throw new Error('Built app is missing art/portrait/portrait-overlays.json.');
for (const file of artFiles) {
  const occurrences = serviceWorker.split(`"${file}"`).length - 1;
  if (occurrences !== 1)
    throw new Error(`Service worker should precache ${file} exactly once; found ${occurrences}.`);
}

console.log('Built package exports and PWA artifacts verified.');
