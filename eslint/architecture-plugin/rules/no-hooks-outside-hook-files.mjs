import { isHookConsumerFile, isHookFile, toRepoPath } from '../shared/paths.mjs';

/**
 * React hook invocations live only in dedicated hook files. Presentational
 * `*.component.tsx` files call no hooks at all; containers, routes, shell,
 * and provider composition files may call project-owned custom hooks (those
 * imported from a project path or defined in hook files) but never built-in
 * or vendor hooks. Everything else that wants a hook must become a hook file.
 */
const isHookName = (name) => /^use[A-Z0-9]/u.test(name);

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Hook calls are restricted to dedicated hook files.',
    },
    schema: [],
    messages: {
      builtInHook:
        "'{{name}}' is a built-in or vendor hook. Move this logic into a dedicated `use-*.hook.ts` file.",
      anyHook:
        "'{{name}}' may not be called here. Components receive prepared props; move hook logic into a dedicated `use-*.hook.ts` file.",
      hookDefinition:
        "Hook '{{name}}' is defined outside a hook file. Move it into `hooks/use-<responsibility>.hook.ts`.",
    },
  },
  create(context) {
    const repoPath = toRepoPath(context.filename);
    if (isHookFile(repoPath)) return {};
    const consumer = isHookConsumerFile(repoPath);
    /** hook name -> true when imported from a project-owned source */
    const projectHooks = new Map();
    return {
      ImportDeclaration(node) {
        const source = String(node.source.value);
        const projectSource = source.startsWith('@/') || source.startsWith('.');
        for (const specifier of node.specifiers) {
          const name = specifier.local.name;
          if (isHookName(name)) projectHooks.set(name, projectSource);
        }
      },
      'FunctionDeclaration, VariableDeclarator'(node) {
        const name = node.id?.type === 'Identifier' ? node.id.name : null;
        if (name && isHookName(name)) {
          const value = node.type === 'VariableDeclarator' ? node.init : node;
          const isFunction =
            value &&
            (value.type === 'ArrowFunctionExpression' ||
              value.type === 'FunctionExpression' ||
              value.type === 'FunctionDeclaration');
          if (isFunction) context.report({ node: node.id, messageId: 'hookDefinition', data: { name } });
        }
      },
      CallExpression(node) {
        let name = null;
        if (node.callee.type === 'Identifier') name = node.callee.name;
        else if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          isHookName(node.callee.property.name)
        )
          name = node.callee.property.name;
        if (!name || !isHookName(name)) return;
        if (consumer && projectHooks.get(name) === true) return;
        context.report({
          node: node.callee,
          messageId: consumer ? 'builtInHook' : 'anyHook',
          data: { name },
        });
      },
    };
  },
};
