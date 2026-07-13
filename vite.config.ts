import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
const { version } = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'),
) as { version: string };
export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
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
          return undefined;
        },
      },
    },
  },
  // Host pinned to IPv4: Node ≥ 20 resolves localhost to ::1 first, which
  // breaks tooling (Playwright webServer) that polls 127.0.0.1.
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
});
