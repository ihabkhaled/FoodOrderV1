#!/usr/bin/env node

/**
 * Production-faithful static server for the built dist/ output.
 *
 * Mirrors the Vercel routing in vercel.json so e2e tests exercise the same
 * split as production: prerendered public pages are served as static files,
 * application routes rewrite to the app.html SPA shell, unknown paths get the
 * prerendered 404 page, and trailing slashes redirect permanently.
 *
 * Usage: node scripts/serve-dist.mjs [--port=4173] [--dir=dist]
 */

import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';

const portArgument = process.argv.find((argument) => argument.startsWith('--port='));
const directoryArgument = process.argv.find((argument) => argument.startsWith('--dir='));
const port = Number(portArgument?.slice('--port='.length) || 4173);
const root = path.resolve(
  process.cwd(),
  directoryArgument?.slice('--dir='.length) || 'dist',
);

/** First path segments that belong to the SPA shell, matching vercel.json. */
const APP_SHELL_PREFIXES = new Set([
  'app',
  'auth',
  'invite',
  'buckets',
  'sessions',
  'orders',
  'join',
  'social',
  'settings',
]);

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
};

const isFile = (candidate) => existsSync(candidate) && statSync(candidate).isFile();

const sendFile = (response, status, filePath) => {
  response.writeHead(status, {
    'Content-Type':
      CONTENT_TYPES[path.extname(filePath).toLowerCase()] ??
      'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
};

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent((request.url ?? '/').split(/[?#]/u)[0]);

  if (pathname !== '/' && pathname.endsWith('/')) {
    // Rebuild the target from path segments so the redirect can never leave
    // this origin (e.g. a protocol-relative "//host/" request), and keep the
    // explicit same-origin guard as defense in depth.
    const segments = pathname.split('/').filter(Boolean);
    const target = `/${segments.join('/')}`;
    if (
      target.startsWith('/') &&
      !target.startsWith('//') &&
      !target.startsWith('/\\')
    ) {
      response.writeHead(308, { Location: target });
      response.end();
      return;
    }
  }

  const resolved = path.normalize(path.join(root, pathname));
  if (!resolved.startsWith(root)) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  if (isFile(resolved)) {
    sendFile(response, 200, resolved);
    return;
  }
  const directoryIndex = path.join(resolved, 'index.html');
  if (isFile(directoryIndex)) {
    sendFile(response, 200, directoryIndex);
    return;
  }

  const firstSegment = pathname.split('/').filter(Boolean)[0] ?? '';
  const appShell = path.join(root, 'app.html');
  if (APP_SHELL_PREFIXES.has(firstSegment) && isFile(appShell)) {
    sendFile(response, 200, appShell);
    return;
  }

  const notFoundPage = path.join(root, '404.html');
  if (isFile(notFoundPage)) {
    sendFile(response, 404, notFoundPage);
    return;
  }
  response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end('Not found');
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Serving ${root} at http://127.0.0.1:${port}\n`);
});
