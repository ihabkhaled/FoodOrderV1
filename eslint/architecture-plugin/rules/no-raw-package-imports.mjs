import { foundationalImports, packageOwnership } from '../../package-ownership.config.mjs';
import { isInside, toRepoPath } from '../shared/paths.mjs';

/**
 * Every third-party dependency has exactly one owning integration module
 * (eslint/package-ownership.config.mjs). Application source must import the
 * owner's public facade, never the raw package. Bare imports that are neither
 * registered nor foundational are reported so new dependencies cannot bypass
 * the incubation policy silently.
 */
const isBareSpecifier = (specifier) =>
  !specifier.startsWith('.') && !specifier.startsWith('@/') && !specifier.startsWith('node:');

const ownershipFor = (specifier) => {
  for (const [name, entry] of Object.entries(packageOwnership)) {
    if (specifier === name || specifier.startsWith(`${name}/`)) return { name, ...entry };
  }
  return null;
};

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Raw third-party imports are allowed only inside their owning src/packages integration module.',
    },
    schema: [],
    messages: {
      rawImport:
        "'{{specifier}}' is owned by {{owner}}. Import '{{publicImport}}' instead of the raw package.",
      unregistered:
        "'{{specifier}}' has no owner in eslint/package-ownership.config.mjs. Register an owning src/packages module before using it in application source.",
    },
  },
  create(context) {
    const repoPath = toRepoPath(context.filename);
    const check = (node, specifier) => {
      if (typeof specifier !== 'string' || !isBareSpecifier(specifier)) return;
      if (foundationalImports.includes(specifier)) return;
      const owned = ownershipFor(specifier);
      if (!owned) {
        context.report({ node, messageId: 'unregistered', data: { specifier } });
        return;
      }
      if (isInside(repoPath, owned.owner)) return;
      context.report({
        node,
        messageId: 'rawImport',
        data: { specifier, owner: owned.owner, publicImport: owned.publicImport },
      });
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
