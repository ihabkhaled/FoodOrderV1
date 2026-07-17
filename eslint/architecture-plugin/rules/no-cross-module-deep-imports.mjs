import { moduleOf, packageOf, resolveImportPath, toRepoPath } from '../shared/paths.mjs';

/**
 * Feature modules and package owners expose one public surface (their
 * `index.ts`). Reaching into another module's or package's internals couples
 * consumers to private structure, so only `@/modules/<name>` and
 * `@/packages/<name>` are importable from outside.
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Cross-module and cross-package imports must use the public surface.',
    },
    schema: [],
    messages: {
      deepModule:
        "Deep import into module '{{name}}'. Import from '@/modules/{{name}}' (its public surface) instead.",
      deepPackage:
        "Deep import into package owner '{{name}}'. Import from '@/packages/{{name}}' instead.",
    },
  },
  create(context) {
    const repoPath = toRepoPath(context.filename);
    const ownModule = moduleOf(repoPath);
    const ownPackage = packageOf(repoPath);
    const check = (node, specifier) => {
      if (typeof specifier !== 'string') return;
      const resolved = resolveImportPath(repoPath, specifier);
      if (!resolved) return;
      const targetModule = /^src\/modules\/([^/]+)\/.+/u.exec(resolved);
      if (targetModule && targetModule[1] !== ownModule) {
        context.report({ node, messageId: 'deepModule', data: { name: targetModule[1] } });
        return;
      }
      const targetPackage = /^src\/packages\/([^/]+)\/.+/u.exec(resolved);
      if (targetPackage && targetPackage[1] !== ownPackage) {
        context.report({ node, messageId: 'deepPackage', data: { name: targetPackage[1] } });
      }
    };
    return {
      ImportDeclaration(node) {
        check(node.source, node.source.value);
      },
      ImportExpression(node) {
        if (node.source.type === 'Literal') check(node.source, node.source.value);
      },
      'ExportNamedDeclaration[source]'(node) {
        check(node.source, node.source.value);
      },
      'ExportAllDeclaration[source]'(node) {
        check(node.source, node.source.value);
      },
    };
  },
};
