/**
 * Project-owned ESLint plugin enforcing the v1.6.0 module-first architecture.
 *
 * Rule documentation lives in docs/eslint/. Rules are tested with ESLint's
 * RuleTester in tests/eslint/.
 */
import enforceFileSuffixes from './rules/enforce-file-suffixes.mjs';
import noBrowserGlobalsOutsidePlatform from './rules/no-browser-globals-outside-platform.mjs';
import noCrossModuleDeepImports from './rules/no-cross-module-deep-imports.mjs';
import noEnvOutsideEnvironment from './rules/no-env-outside-environment.mjs';
import noHooksOutsideHookFiles from './rules/no-hooks-outside-hook-files.mjs';
import noInlineRouteStrings from './rules/no-inline-route-strings.mjs';
import noRawPackageImports from './rules/no-raw-package-imports.mjs';
import noRestrictedLayerImports from './rules/no-restricted-layer-imports.mjs';
import noTypescriptEnum from './rules/no-typescript-enum.mjs';

export default {
  meta: { name: 'architecture', version: '1.0.0' },
  rules: {
    'enforce-file-suffixes': enforceFileSuffixes,
    'no-browser-globals-outside-platform': noBrowserGlobalsOutsidePlatform,
    'no-cross-module-deep-imports': noCrossModuleDeepImports,
    'no-env-outside-environment': noEnvOutsideEnvironment,
    'no-hooks-outside-hook-files': noHooksOutsideHookFiles,
    'no-inline-route-strings': noInlineRouteStrings,
    'no-raw-package-imports': noRawPackageImports,
    'no-restricted-layer-imports': noRestrictedLayerImports,
    'no-typescript-enum': noTypescriptEnum,
  },
};
