/**
 * Machine-readable third-party package ownership registry.
 *
 * Every raw npm dependency used by application source has exactly one owning
 * integration module under `src/packages/`. Application code imports the
 * owner's public facade (`publicImport`), never the raw package. The custom
 * ESLint rule `architecture/no-raw-package-imports` enforces this registry.
 *
 * `owner`        — repo-relative directory allowed to import the raw package.
 * `publicImport` — the project-owned facade application code must use.
 *
 * Foundational exceptions (importable anywhere in application source):
 *   - `react`, `react/jsx-runtime`: the UI runtime itself; wrapping it adds
 *     indirection with zero isolation value.
 *   - `react-dom/client`: bootstrap-only, restricted to `src/main.tsx`.
 * Test files (`tests/**`) and build/tooling configuration are outside the
 * registry's scope; they are governed by their own ESLint blocks.
 */
export const packageOwnership = {
  firebase: {
    owner: 'src/packages/firebase',
    publicImport: '@/packages/firebase',
  },
  'react-router-dom': {
    owner: 'src/packages/router',
    publicImport: '@/packages/router',
  },
  'lucide-react': {
    owner: 'src/packages/icons',
    publicImport: '@/packages/icons',
  },
  'react-virtuoso': {
    owner: 'src/packages/virtuoso',
    publicImport: '@/packages/virtuoso',
  },
  '@capacitor/core': {
    owner: 'src/packages/capacitor-core',
    publicImport: '@/packages/capacitor-core',
  },
  '@capacitor/app': {
    owner: 'src/packages/capacitor-app',
    publicImport: '@/packages/capacitor-app',
  },
  '@capacitor/haptics': {
    owner: 'src/packages/capacitor-haptics',
    publicImport: '@/packages/capacitor-haptics',
  },
  '@capacitor/keyboard': {
    owner: 'src/packages/capacitor-keyboard',
    publicImport: '@/packages/capacitor-keyboard',
  },
  '@capacitor/network': {
    owner: 'src/packages/capacitor-network',
    publicImport: '@/packages/capacitor-network',
  },
  '@capacitor/preferences': {
    owner: 'src/packages/capacitor-preferences',
    publicImport: '@/packages/capacitor-preferences',
  },
  '@capacitor/status-bar': {
    owner: 'src/packages/capacitor-status-bar',
    publicImport: '@/packages/capacitor-status-bar',
  },
};

export const foundationalImports = ['react', 'react/jsx-runtime', 'react-dom/client'];
