import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

import contactHandler from './api/contact';
import type { ContactRequest, ContactResponse } from './api/contact.interfaces';

const readRequestBody = async (request: IncomingMessage): Promise<string> => {
  let body = '';
  request.setEncoding('utf8');
  for await (const chunk of request as AsyncIterable<string | Buffer>) {
    body += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
  }
  return body;
};

const handleContactDevelopmentRequest = async (
  request: IncomingMessage,
  response: ServerResponse,
  contactEnvironment: Record<string, string>,
): Promise<void> => {
  const smtpKeys = [
    'CONTACT_EMAIL_FROM',
    'CONTACT_EMAIL_TO',
    'CONTACT_SMTP_HOST',
    'CONTACT_SMTP_USER',
    'CONTACT_SMTP_PASS',
  ] as const;
  const hasSmtpConfiguration = smtpKeys.every(
    (key) => Boolean(contactEnvironment[key] || process.env[key]),
  );
  for (const [key, value] of Object.entries(contactEnvironment)) {
    if (key.startsWith('CONTACT_')) process.env[key] = value;
  }
  process.env.CONTACT_EMAIL_ENABLED ??= 'true';
  process.env.CONTACT_DEVELOPMENT_ETHEREAL ??= hasSmtpConfiguration
    ? 'false'
    : 'true';

  const contactRequest = request as ContactRequest;
  const rawBody = await readRequestBody(request);
  contactRequest.body = Object.fromEntries(new URLSearchParams(rawBody));
  const contactResponse = response as ContactResponse;
  contactResponse.status = (statusCode) => {
    response.statusCode = statusCode;
    return contactResponse;
  };
  contactResponse.json = (body) => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify(body));
  };
  await contactHandler(contactRequest, contactResponse);
};

const contactDevelopmentPlugin = (
  contactEnvironment: Record<string, string>,
): Plugin => ({
  name: 'contact-development-endpoint',
  configureServer(server) {
    server.middlewares.use('/api/contact', (request, response) => {
      void handleContactDevelopmentRequest(
        request,
        response,
        contactEnvironment,
      ).catch(
        (error: unknown) => {
          console.error('Development contact endpoint failed.', error);
          if (!response.headersSent) {
            response.statusCode = 500;
            response.setHeader(
              'Content-Type',
              'application/json; charset=utf-8',
            );
          }
          response.end(
            JSON.stringify({
              error: 'The message could not be sent. Please try again later.',
            }),
          );
        },
      );
    });
  },
});
const { version } = JSON.parse(
  readFileSync(fileURLToPath(new URL('package.json', import.meta.url)), 'utf8'),
) as { version: string };
export default defineConfig(({ mode }) => ({
  plugins: [
    contactDevelopmentPlugin(loadEnv(mode, process.cwd(), '')),
    react(),
  ],
  define: { __APP_VERSION__: JSON.stringify(version) },
  resolve: { alias: { '@': fileURLToPath(new URL('src', import.meta.url)) } },
  // No sourcemaps in the production bundle: they are copied verbatim into the
  // Android/iOS asset payload, roughly doubling the APK and shipping readable
  // source to the device. Debug locally with `npm run dev` (dev sourcemaps on).
  // Author to ES2024 (tsconfig lib), ship es2022 syntax so the bundle runs on
  // the oldest supported WebViews (iOS 14 / Android 10). Newer runtime APIs
  // beyond that baseline must be feature-detected, not assumed.
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Vite 8 / Rollup 4 prefer the function form of manualChunks.
        manualChunks(id) {
          if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'firebase';
          if (id.includes('/react-router')) return 'router';
        },
      },
    },
  },
  // Host pinned to IPv4: Node ≥ 20 resolves localhost to ::1 first, which
  // breaks tooling (Playwright webServer) that polls 127.0.0.1.
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
}));
