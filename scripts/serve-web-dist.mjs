import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const host = '127.0.0.1';
const port = 4173;
const distDirectory = path.resolve(process.cwd(), 'apps', 'web', 'dist');
const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
]);

function resolveRequestPath(requestUrl) {
  let pathname;

  try {
    pathname = decodeURIComponent(new URL(requestUrl, `http://${host}:${port}`).pathname);
  } catch {
    return undefined;
  }
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const resolvedPath = path.resolve(distDirectory, relativePath);

  if (resolvedPath !== distDirectory && !resolvedPath.startsWith(`${distDirectory}${path.sep}`)) {
    return undefined;
  }

  return resolvedPath;
}

function createWebDistServer() {
  return createServer(async (request, response) => {
    const requestedPath = resolveRequestPath(request.url ?? '/');

    if (!requestedPath) {
      response.writeHead(400).end('Bad request');
      return;
    }

    let responsePath = requestedPath;
    let body;

    try {
      body = await readFile(responsePath);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        responsePath = path.join(distDirectory, 'index.html');
        body = await readFile(responsePath);
      } else {
        response.writeHead(500).end('Server error');
        return;
      }
    }

    response.writeHead(200, {
      'Cache-Control': 'no-cache',
      'Content-Type': mimeTypes.get(path.extname(responsePath)) ?? 'application/octet-stream',
      ...(path.basename(responsePath) === 'sw.js' ? { 'Service-Worker-Allowed': '/' } : {}),
    });
    response.end(body);
  });
}

export function startWebDistServer() {
  const server = createWebDistServer();

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      console.log(`Serving the built web app at http://${host}:${port}`);
      resolve({
        close: () =>
          new Promise((closeResolve, closeReject) => {
            server.close((error) => (error ? closeReject(error) : closeResolve()));
          }),
        url: `http://${host}:${port}`,
      });
    });
  });
}

const executedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : undefined;

if (executedPath === import.meta.url) {
  const runningServer = await startWebDistServer();
  const shutdown = async () => {
    await runningServer.close();
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
