import { layerOf, resolveImportPath, toRepoPath } from '../shared/paths.mjs';

/**
 * One-way dependency graph between the architectural layers:
 *
 *   app → modules → shared/platform → packages → vendor
 *
 * - `shared` and `platform` never import modules or app.
 * - `packages` sit at the bottom: they never import app, modules, shared, or
 *   platform.
 * - `modules` never import app.
 * - `platform` may build on `packages` and `shared`; `shared` may build on
 *   `packages` and `platform`.
 */
const forbidden = {
  modules: ['app'],
  shared: ['app', 'modules'],
  platform: ['app', 'modules'],
  packages: ['app', 'modules', 'shared', 'platform'],
};

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce the one-way dependency direction between architectural layers.',
    },
    schema: [],
    messages: {
      wrongDirection:
        "Layer '{{from}}' must not depend on layer '{{to}}'. Dependency direction is app → modules → shared/platform → packages.",
    },
  },
  create(context) {
    const repoPath = toRepoPath(context.filename);
    const fromLayer = layerOf(repoPath);
    if (!fromLayer || !(fromLayer in forbidden)) return {};
    const blocked = forbidden[fromLayer];
    const check = (node, specifier) => {
      if (typeof specifier !== 'string') return;
      const resolved = resolveImportPath(repoPath, specifier);
      if (!resolved) return;
      const toLayer = layerOf(resolved);
      if (toLayer && blocked.includes(toLayer)) {
        context.report({
          node,
          messageId: 'wrongDirection',
          data: { from: fromLayer, to: toLayer },
        });
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
