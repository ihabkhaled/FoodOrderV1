/**
 * The TypeScript `enum` keyword is forbidden: it generates runtime objects
 * with surprising semantics (numeric reverse maps, non-tree-shakeable IIFEs)
 * and breaks `isolatedModules`-style compilation assumptions. Use an
 * `as const` object plus a derived union type in a `*.enums.ts` file.
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Forbid TypeScript enum declarations in favor of as-const objects.',
    },
    schema: [],
    messages: {
      noEnum:
        "TypeScript 'enum' is forbidden. Use an `as const` object with a derived union type in a `*.enums.ts` file.",
    },
  },
  create(context) {
    return {
      TSEnumDeclaration(node) {
        context.report({ node, messageId: 'noEnum' });
      },
    };
  },
};
