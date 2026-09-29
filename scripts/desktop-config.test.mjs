import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const config = JSON.parse(readFileSync('apps/desktop/src-tauri/tauri.conf.json', 'utf8'));
const pkg = JSON.parse(readFileSync('apps/desktop/package.json', 'utf8'));
const root = JSON.parse(readFileSync('package.json', 'utf8'));

test('desktop embeds the production PWA without recursive workspace build', () => {
  assert.equal(
    resolve('apps/desktop/src-tauri', config.build.frontendDist),
    resolve('apps/web/dist'),
  );
  assert.equal(config.build.beforeBuildCommand, 'corepack pnpm --dir ../.. build');
  assert.equal(pkg.scripts?.build, undefined);
  assert.equal(root.scripts['desktop:build'], 'node scripts/desktop.mjs build');
  assert.equal(root.scripts['desktop:dev'], 'node scripts/desktop.mjs dev');
});

test('desktop has stable identity, no native capabilities and an offline bilingual installer', () => {
  assert.equal(config.identifier, 'com.projectsaturday.game');
  assert.equal(config.app.windows[0].minWidth, 320);
  assert.deepEqual(config.app.security.capabilities, []);
  assert.match(config.app.security.csp, /object-src 'none'/);
  assert.deepEqual(config.bundle.targets, ['nsis']);
  assert.equal(config.bundle.windows.webviewInstallMode.type, 'offlineInstaller');
  assert.deepEqual(config.bundle.windows.nsis.languages, ['Korean', 'English']);
  assert.equal(config.bundle.windows.nsis.installMode, 'currentUser');
});
