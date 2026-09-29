import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const command = process.argv[2];
if (!['dev', 'build'].includes(command) || process.argv.length !== 3) {
  throw new Error('Usage: node scripts/desktop.mjs <dev|build>');
}

const env = { ...process.env };
// Windows environment names are case-insensitive; a plain JS copy is not.
const pathKey = Object.keys(env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH';
const localCargo = join(root, '.desktop-tools', 'cargo');
const localRustup = join(root, '.desktop-tools', 'rustup');
if (existsSync(join(localCargo, 'bin', 'cargo.exe'))) {
  env.CARGO_HOME = localCargo;
  env.RUSTUP_HOME = localRustup;
  env[pathKey] = `${join(localCargo, 'bin')}${delimiter}${env[pathKey] ?? ''}`;
}

// Invoke the JS CLI directly: no platform shell quoting or recursive workspace build.
const cli = join(root, 'apps', 'desktop', 'node_modules', '@tauri-apps', 'cli', 'tauri.js');
const args = [cli, command, ...(command === 'build' ? ['--target', 'x86_64-pc-windows-msvc'] : [])];
const child = spawn(process.execPath, args, {
  cwd: join(root, 'apps', 'desktop'),
  env,
  stdio: 'inherit',
  windowsHide: true,
});
child.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
