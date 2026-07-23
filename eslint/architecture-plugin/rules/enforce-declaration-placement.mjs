import { toRepoPath } from '../shared/paths.mjs';

const baseName = (repoPath) => repoPath.split('/').pop() ?? '';

const isModuleScope = (node) => {
  const parent = node.parent;
  return (
    parent?.type === 'Program' ||
    (parent?.type === 'ExportNamedDeclaration' &&
      parent.parent?.type === 'Program')
  );
};

const isCallableInitializer = (initializer) =>
  initializer?.type === 'ArrowFunctionExpression' ||
  initializer?.type === 'FunctionExpression';

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Named declarations must live in files whose suffix owns that declaration kind.',
    },
    schema: [],
    messages: {
      constantFile:
        'Module-scope runtime constants belong in a sibling *.constants.ts (or *.enums.ts for an as-const value set), not "{{base}}".',
      interfaceFile:
        'Interfaces belong in a sibling *.interfaces.ts, not "{{base}}". Import the contract with import type.',
      typeFile:
        'Type aliases belong in a sibling *.types.ts (or beside their as-const value set in *.enums.ts), not "{{base}}".',
    },
  },
  create(context) {
    const repoPath = toRepoPath(context.filename);
    const base = baseName(repoPath);
    const interfaceOwner = base.endsWith('.interfaces.ts');
    const typeOwner =
      base.endsWith('.types.ts') || base.endsWith('.enums.ts');
    const constantOwner =
      base.endsWith('.constants.ts') || base.endsWith('.enums.ts');
    const stateOwner =
      base.endsWith('.store.ts') || base.endsWith('.selectors.ts');

    return {
      TSInterfaceDeclaration(node) {
        if (!interfaceOwner) {
          context.report({
            node,
            messageId: 'interfaceFile',
            data: { base },
          });
        }
      },
      TSTypeAliasDeclaration(node) {
        if (!typeOwner) {
          context.report({ node, messageId: 'typeFile', data: { base } });
        }
      },
      VariableDeclaration(node) {
        if (!isModuleScope(node) || constantOwner || stateOwner) return;
        const ownsOnlyCallables = node.declarations.every((declaration) =>
          isCallableInitializer(declaration.init),
        );
        if (!ownsOnlyCallables) {
          context.report({
            node,
            messageId: 'constantFile',
            data: { base },
          });
        }
      },
    };
  },
};
