import { isInside, toRepoPath } from '../shared/paths.mjs';

/**
 * Environment access is centralized in `src/platform/environment`, which
 * validates raw values once and exposes one typed, immutable `env` object.
 * Scattered `import.meta.env` / `process.env` reads bypass that validation.
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'import.meta.env and process.env are only readable in src/platform/environment.',
    },
    schema: [],
    messages: {
      envAccess:
        'Environment variables are read only in src/platform/environment. Import the typed `env` object instead.',
    },
  },
  create(context) {
    const repoPath = toRepoPath(context.filename);
    if (isInside(repoPath, 'src/platform/environment')) return {};
    return {
      MemberExpression(node) {
        const isImportMetaEnv =
          node.object.type === 'MetaProperty' &&
          node.property.type === 'Identifier' &&
          node.property.name === 'env';
        const isProcessEnv =
          node.object.type === 'Identifier' &&
          node.object.name === 'process' &&
          node.property.type === 'Identifier' &&
          node.property.name === 'env';
        if (isImportMetaEnv || isProcessEnv) {
          context.report({ node, messageId: 'envAccess' });
        }
      },
    };
  },
};
