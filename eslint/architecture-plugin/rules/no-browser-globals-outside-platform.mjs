import { isInside, toRepoPath } from '../shared/paths.mjs';

/**
 * Direct browser-global access is confined to `src/platform`, which exposes
 * testable, runtime-aware abstractions. Feature code must not know whether it
 * runs on web, Android, or iOS.
 */
const restrictedGlobals = new Set([
  'window',
  'document',
  'navigator',
  'localStorage',
  'sessionStorage',
  'matchMedia',
  'history',
  'location',
]);

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Browser globals are only accessible inside src/platform abstractions.',
    },
    schema: [],
    messages: {
      browserGlobal:
        "'{{name}}' is a browser global. Use (or add) an abstraction in src/platform instead of touching it here.",
    },
  },
  create(context) {
    const repoPath = toRepoPath(context.filename);
    if (isInside(repoPath, 'src/platform')) return {};
    return {
      Program(node) {
        const scope = context.sourceCode.getScope(node);
        for (const reference of scope.through) {
          const name = reference.identifier.name;
          if (restrictedGlobals.has(name)) {
            context.report({
              node: reference.identifier,
              messageId: 'browserGlobal',
              data: { name },
            });
          }
        }
      },
    };
  },
};
